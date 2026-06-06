import Foundation
import Network
import CryptoKit

enum PairingState {
    case unpaired
    case connecting
    case awaitingResponse(challenge: String)
    case paired(serverId: String)
    case failed(String)
}

enum PairingError: LocalizedError {
    case invalidQR
    case notPaired
    case rejected

    var errorDescription: String? {
        switch self {
        case .invalidQR:   return "QR code is not a valid Niyora pairing code."
        case .notPaired:   return "Device is not paired with any Mac."
        case .rejected:    return "Mac rejected the pairing request."
        }
    }
}

final class PairingFlow: MacConnectionDelegate {
    private let mac          = MacConnection()
    private let keychain     = KeychainStore()
    private var serverStore  = KnownServerStore()
    private var heartbeatSrc: DispatchSourceTimer?

    private(set) var state: PairingState = .unpaired

    var onStateChange:      ((PairingState) -> Void)?
    var onServerDiscovered: ((String, NWEndpoint) -> Void)?
    var onSyncAck:          (() -> Void)?

    init() { mac.delegate = self }

    // MARK: Discovery

    func startDiscovery() { mac.startBrowsing() }
    func stopDiscovery()  { mac.stopBrowsing() }

    // MARK: QR pairing
    // QR payload: "niyora://<host>:<port>/<challenge>"

    func initiateFromQR(_ qrString: String) throws {
        guard let (host, port, challenge) = parseQR(qrString) else {
            throw PairingError.invalidQR
        }
        guard let nwPort = NWEndpoint.Port(rawValue: port), port > 0 else {
            throw PairingError.invalidQR
        }
        let endpoint = NWEndpoint.hostPort(
            host: NWEndpoint.Host(host),
            port: nwPort
        )
        transition(.connecting)
        mac.connect(to: endpoint)
        transition(.awaitingResponse(challenge: challenge))
    }

    private func parseQR(_ s: String) -> (host: String, port: UInt16, challenge: String)? {
        guard
            let url  = URL(string: s),
            url.scheme == "niyora",
            let host = url.host,
            let port = url.port,
            port > 0,
            !url.path.isEmpty
        else { return nil }
        let challenge = String(url.path.dropFirst())
        guard !challenge.isEmpty else { return nil }
        return (host, UInt16(port), challenge)
    }

    // MARK: Sync

    func pushSync(payload: String) {
        guard case .paired(let serverId) = state,
              let secret = keychain.get("niyora.sync.\(serverId)")
        else { return }
        let tag     = hmacTag(payload: payload, key: secret)
        let body    = "{\"data\":\(payload),\"hmac\":\"\(tag)\"}"
        let env     = Envelope(type: .syncPush, deviceId: mac.deviceId, body: body)
        mac.send(env)
    }

    // MARK: MacConnectionDelegate

    func connection(_ conn: MacConnection, didDiscover name: String, endpoint: NWEndpoint) {
        onServerDiscovered?(name, endpoint)
    }

    func connection(_ conn: MacConnection, didReceive envelope: Envelope) {
        switch envelope.type {
        case .identify:
            handleIdentify(envelope)
        case .pairResponse:
            handlePairResponse(envelope)
        case .heartbeat:
            mac.send(Envelope(type: .heartbeat, deviceId: mac.deviceId, body: nil))
        case .syncAck:
            onSyncAck?()
        default:
            break
        }
    }

    func connection(_ conn: MacConnection, didChangeState nwState: NWConnection.State) {
        switch nwState {
        case .failed(let err):
            stopHeartbeat()
            transition(.failed(err.localizedDescription))
        case .cancelled:
            stopHeartbeat()
            if case .paired = state { /* keep paired across reconnect */ } else {
                transition(.unpaired)
            }
        default:
            break
        }
    }

    // MARK: Message handlers

    private func handleIdentify(_ env: Envelope) {
        // If already known, skip re-pairing and enter paired state directly.
        if serverStore.contains(id: env.deviceId) {
            transition(.paired(serverId: env.deviceId))
            startHeartbeat()
            return
        }
        // Otherwise send pair_request with the QR challenge.
        guard case .awaitingResponse(let challenge) = state else { return }
        let body = "{\"challenge\":\"\(challenge)\"}"
        mac.send(Envelope(type: .pairRequest, deviceId: mac.deviceId, body: body))
    }

    private func handlePairResponse(_ env: Envelope) {
        guard case .awaitingResponse = state,
              let body    = env.body,
              let data    = body.data(using: .utf8),
              let json    = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let accepted = json["accepted"] as? Bool,
              accepted,
              let secretHex = json["secret"] as? String,
              let secretData = Data(hexString: secretHex)
        else {
            transition(.failed("Pairing rejected or malformed response."))
            return
        }
        let serverId = env.deviceId
        keychain.set("niyora.sync.\(serverId)", value: secretData)
        serverStore.upsert(KnownServer(id: serverId, name: serverId, lastSeenAt: Date()))
        transition(.paired(serverId: serverId))
        startHeartbeat()
    }

    // MARK: Heartbeat

    private func startHeartbeat() {
        let src = DispatchSource.makeTimerSource(queue: .global(qos: .utility))
        src.schedule(deadline: .now() + 30, repeating: 30)
        src.setEventHandler { [weak self] in
            guard let self, case .paired = self.state else { return }
            self.mac.send(Envelope(type: .heartbeat, deviceId: self.mac.deviceId, body: nil))
        }
        src.resume()
        heartbeatSrc = src
    }

    private func stopHeartbeat() {
        heartbeatSrc?.cancel()
        heartbeatSrc = nil
    }

    // MARK: Helpers

    private func transition(_ next: PairingState) {
        state = next
        onStateChange?(next)
    }

    private func hmacTag(payload: String, key: Data) -> String {
        let symKey = SymmetricKey(data: key)
        let code   = HMAC<SHA256>.authenticationCode(for: Data(payload.utf8), using: symKey)
        return Data(code).hexString
    }
}
