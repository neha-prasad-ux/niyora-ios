import Foundation
import Network
import UIKit

enum PairingState {
    case unpaired
    case connecting
    /// Handshake done; the SAS is showing and we are waiting for the Mac user
    /// to click Allow after confirming the number matches.
    case awaitingApproval(sas: String)
    case paired(serverId: String)
    case failed(String)
}

/// Drives the tap-and-approve pairing against the Mac's `companion_sync`:
/// Noise XX handshake -> identify -> (SAS shown, user Allows on Mac) -> authed.
/// A known Mac (its static key already stored) reconnects silently.
final class PairingFlow: MacConnectionDelegate {
    private let mac         = MacConnection()
    private let keychain    = KeychainStore()
    private var serverStore = KnownServerStore()

    let notifCoord = NotificationCoordinator()

    private(set) var state: PairingState = .unpaired

    var onStateChange:      ((PairingState) -> Void)?
    var onServerDiscovered: ((String, NWEndpoint) -> Void)?
    var onStatusUpdate:     ((String, Int) -> Void)?
    var onSoulStateUpdate:  ((String, Int, String, String) -> Void)?
    var onReminderState:    ((String, Bool, String, String) -> Void)?

    // Discovered Macs by Bonjour name, so a JS tap can connect to one.
    private var endpoints: [String: NWEndpoint] = [:]

    // Handshake context for the in-flight connection.
    private var isFreshPairing = false
    private var pendingRemoteStatic: Data?
    private var pendingServerId: String?
    private var pendingServerName: String?

    init() {
        mac.delegate = self
        mac.staticPrivate = loadOrCreateIdentity()
        notifCoord.sendToMac = { [weak self] msg in self?.mac.send(msg) }
    }

    // MARK: Discovery

    func startDiscovery() { mac.startBrowsing() }
    func stopDiscovery()  { mac.stopBrowsing() }

    // MARK: Connect (user tapped a discovered Mac)

    func connectToMac(named name: String) {
        guard let endpoint = endpoints[name] else {
            transition(.failed("That Mac is no longer nearby."))
            return
        }
        beginConnect(to: endpoint, fresh: true)
    }

    func cancelPairing() {
        mac.disconnect()
        if case .paired = state {} else { transition(.unpaired) }
    }

    private func beginConnect(to endpoint: NWEndpoint, fresh: Bool) {
        isFreshPairing      = fresh
        pendingRemoteStatic = nil
        pendingServerId     = nil
        pendingServerName   = nil
        transition(.connecting)
        mac.connect(to: endpoint)
    }

    // MARK: Send a completed session to the Mac

    func recordSession(
        techniqueName: String,
        techniqueKind: String,
        durationSec: Int,
        intendedDurationSec: Int?,
        completed: Bool,
        recordedAt: String
    ) {
        guard case .paired = state else { return }
        if completed { notifCoord.didCompleteSession() }
        mac.send(.sessionRecorded(
            techniqueName: techniqueName,
            techniqueKind: techniqueKind,
            durationSec: durationSec,
            intendedDurationSec: intendedDurationSec,
            completed: completed,
            recordedAt: recordedAt
        ))
    }

    // MARK: MacConnectionDelegate

    func connection(_ conn: MacConnection, didDiscover name: String, endpoint: NWEndpoint) {
        endpoints[name] = endpoint
        onServerDiscovered?(name, endpoint)
        // Silently reconnect a phone that has paired before: dial the Mac, and
        // if it recognises our static key it authes us with no prompt. If it
        // does not know us, it rejects and we quietly fall back.
        guard !serverStore.all().isEmpty, !isConnectingOrPaired() else { return }
        beginConnect(to: endpoint, fresh: false)
    }

    func connection(_ conn: MacConnection, didCompleteHandshake sas: String, remoteStatic: Data) {
        pendingRemoteStatic = remoteStatic
        mac.send(.identify(clientId: mac.deviceId, clientName: UIDevice.current.name))
        // Fresh pair: show the number while the Mac user decides. Reconnect:
        // stay quietly connecting; no number, no prompt.
        if isFreshPairing { transition(.awaitingApproval(sas: sas)) }
    }

    func connection(_ conn: MacConnection, didReceive message: ServerMessage) {
        switch message {
        case let .hello(serverId, serverName):
            pendingServerId   = serverId
            pendingServerName = serverName
            // On reconnect, defend against a rogue Mac reusing this serverId:
            // the static key must match the one we stored when we paired.
            if !isFreshPairing,
               let stored = keychain.get(macKey(serverId)),
               stored != pendingRemoteStatic {
                mac.disconnect()
                transition(.unpaired)
            }
        case .authed:
            handleAuthed()
        case let .authFailed(reason):
            mac.disconnect()
            // Only surface a failure for a user-initiated pair; a rejected
            // background reconnect just means this Mac is not ours.
            transition(isFreshPairing ? .failed(reason) : .unpaired)
        case let .statusUpdate(soulTier, completedSessions):
            onStatusUpdate?(soulTier, completedSessions)
        case let .soulStateUpdate(label, index, source, ts):
            onSoulStateUpdate?(label, index, source, ts)
        case let .reminderState(fireAt, macActive, title, body):
            notifCoord.apply(fireAt: fireAt, macIsActive: macActive, title: title, body: body)
            onReminderState?(fireAt, macActive, title, body)
        case .requestMeasurement, .unknown:
            break
        }
    }

    func connection(_ conn: MacConnection, didChangeState nwState: NWConnection.State) {
        switch nwState {
        case .failed(let err):
            notifCoord.stop()
            transition(isFreshPairing ? .failed(err.localizedDescription) : .unpaired)
        case .cancelled:
            if case .paired = state { /* keep paired across reconnect */ } else {
                notifCoord.stop()
            }
        default:
            break
        }
    }

    // MARK: Handshake completion

    private func handleAuthed() {
        guard let serverId = pendingServerId else { return }
        if isFreshPairing, let rs = pendingRemoteStatic {
            keychain.set(macKey(serverId), value: rs)
            serverStore.upsert(KnownServer(
                id: serverId,
                name: pendingServerName ?? serverId,
                lastSeenAt: Date()
            ))
        }
        isFreshPairing = false
        notifCoord.start()
        transition(.paired(serverId: serverId))
        mac.send(.phoneActive(active: true, ts: ISO8601DateFormatter().string(from: Date())))
    }

    func requestNotificationPermission(_ completion: @escaping (Bool) -> Void) {
        notifCoord.requestPermission(completion)
    }

    // MARK: Helpers

    /// This phone's long-term Noise static private key. Created once and kept
    /// so the Mac keeps recognising us across launches.
    private func loadOrCreateIdentity() -> Data {
        if let existing = keychain.get("niyora.sync.identity") { return existing }
        let (priv, _) = Noise.generateStaticKeypair()
        keychain.set("niyora.sync.identity", value: priv)
        return priv
    }

    private func macKey(_ serverId: String) -> String {
        "niyora.sync.macpub.\(serverId)"
    }

    private func isConnectingOrPaired() -> Bool {
        switch state {
        case .connecting, .awaitingApproval, .paired: return true
        default: return false
        }
    }

    private func transition(_ next: PairingState) {
        state = next
        onStateChange?(next)
    }
}
