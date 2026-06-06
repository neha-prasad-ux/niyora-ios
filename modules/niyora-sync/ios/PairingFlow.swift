import Foundation
import Network
import CryptoKit
import UIKit

enum PairingState {
    case unpaired
    case connecting
    case paired(serverId: String)
    case failed(String)
}

enum PairingError: LocalizedError {
    case invalidQR
    var errorDescription: String? {
        switch self {
        case .invalidQR: return "QR code is not a valid Niyora pairing code."
        }
    }
}

/// Drives the handshake against the Mac's `companion_sync`:
///   identify -> hello -> challenge -> auth(HMAC) -> authed,
/// then forwards `status_update` and sends `session_recorded`.
final class PairingFlow: MacConnectionDelegate {
    private let mac         = MacConnection()
    private let keychain    = KeychainStore()
    private var serverStore = KnownServerStore()

    private(set) var state: PairingState = .unpaired

    var onStateChange:      ((PairingState) -> Void)?
    var onServerDiscovered: ((String, NWEndpoint) -> Void)?
    var onStatusUpdate:     ((String, Int) -> Void)?   // (soulTier, completedSessions)

    // Handshake context: set when a connection is initiated, used when the
    // server's challenge arrives.
    private var pendingSecret: Data?
    private var pendingPairingId: String?   // present only on a fresh QR pair
    private var pendingServerId: String?
    private var isFreshPairing = false

    init() { mac.delegate = self }

    // MARK: Discovery

    func startDiscovery() { mac.startBrowsing() }
    func stopDiscovery()  { mac.stopBrowsing() }

    // MARK: QR pairing

    func initiateFromQR(_ qrString: String) throws {
        guard let qr = QrPayload.decode(qrString),
              let secret = Data(hexString: qr.secretHex) else {
            throw PairingError.invalidQR
        }
        pendingSecret    = secret
        pendingPairingId = qr.pairingId
        pendingServerId  = qr.serverId
        isFreshPairing   = true
        transition(.connecting)
        mac.connect(host: qr.host, port: qr.port)
        // Identify is sent once the connection is .ready (didChangeState).
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
        onServerDiscovered?(name, endpoint)
        // Auto-reconnect to a known server (no QR) when it reappears on the wifi.
        guard serverStore.contains(id: name), !isConnectingOrPaired() else { return }
        pendingSecret    = keychain.get("niyora.sync.\(name)")
        pendingPairingId = nil
        pendingServerId  = name
        isFreshPairing   = false
        guard pendingSecret != nil else { return }
        transition(.connecting)
        mac.connect(to: endpoint)
    }

    func connection(_ conn: MacConnection, didReceive message: ServerMessage) {
        switch message {
        case let .hello(serverId, _):
            // Trust the server_id the Mac reports for keychain keying.
            if pendingServerId == nil { pendingServerId = serverId }
        case let .challenge(nonceHex):
            sendAuth(nonceHex: nonceHex)
        case .authed:
            handleAuthed()
        case let .authFailed(reason):
            transition(.failed(reason))
        case let .statusUpdate(soulTier, completedSessions):
            onStatusUpdate?(soulTier, completedSessions)
        case .requestMeasurement, .unknown:
            break
        }
    }

    func connection(_ conn: MacConnection, didChangeState nwState: NWConnection.State) {
        switch nwState {
        case .ready:
            sendIdentify()
        case .failed(let err):
            transition(.failed(err.localizedDescription))
        case .cancelled:
            if case .paired = state { /* keep paired across reconnect */ } else {
                transition(.unpaired)
            }
        default:
            break
        }
    }

    // MARK: Handshake steps

    private func sendIdentify() {
        mac.send(.identify(
            clientId: mac.deviceId,
            clientName: UIDevice.current.name,
            pairingId: isFreshPairing ? pendingPairingId : nil
        ))
    }

    private func sendAuth(nonceHex: String) {
        guard let secret = pendingSecret,
              let nonce  = Data(hexString: nonceHex) else {
            transition(.failed("Missing pairing secret."))
            return
        }
        let key  = SymmetricKey(data: secret)
        let code = HMAC<SHA256>.authenticationCode(for: nonce, using: key)
        mac.send(.auth(hmacHex: Data(code).hexString))
    }

    private func handleAuthed() {
        guard let serverId = pendingServerId else { return }
        if isFreshPairing, let secret = pendingSecret {
            keychain.set("niyora.sync.\(serverId)", value: secret)
            serverStore.upsert(KnownServer(id: serverId, name: serverId, lastSeenAt: Date()))
        }
        isFreshPairing = false
        transition(.paired(serverId: serverId))
    }

    // MARK: Helpers

    private func isConnectingOrPaired() -> Bool {
        switch state {
        case .connecting, .paired: return true
        default: return false
        }
    }

    private func transition(_ next: PairingState) {
        state = next
        onStateChange?(next)
    }
}
