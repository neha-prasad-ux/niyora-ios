import Foundation

// Wire protocol, matched to the Mac's `companion_sync` (Rust) implementation.
//
// IMPORTANT: keep in lockstep with the source of truth:
//   app/src-tauri/src/companion_sync/protocol.rs   (niyora repo)
// Framing is newline-delimited JSON (one JSON object per line, '\n'-terminated).
// Messages are tagged by a snake_case "type" field. Handshake:
//   identify -> hello -> challenge -> auth(hmac) -> authed
// then status_update (Mac->phone) and session_recorded (phone->Mac).

let kServiceType    = "_niyora._tcp"
let kServiceDomain  = "local."
let kProtocolVersion = 3   // PROTOCOL_VERSION on the Mac; v3 carries status_update.

// MARK: Client -> server

enum ClientMessage {
    case identify(clientId: String, clientName: String, pairingId: String?)
    case auth(hmacHex: String)
    case sessionRecorded(
        techniqueName: String,
        techniqueKind: String,
        durationSec: Int,
        intendedDurationSec: Int?,
        completed: Bool,
        recordedAt: String
    )

    /// JSON object + trailing newline, ready to write to the socket.
    func line() -> Data {
        var obj: [String: Any]
        switch self {
        case let .identify(clientId, clientName, pairingId):
            obj = [
                "type": "identify",
                "protocol": kProtocolVersion,
                "client_id": clientId,
                "client_name": clientName,
            ]
            if let pairingId { obj["pairing_id"] = pairingId }
        case let .auth(hmacHex):
            obj = ["type": "auth", "hmac_hex": hmacHex]
        case let .sessionRecorded(name, kind, dur, intended, completed, recordedAt):
            obj = [
                "type": "session_recorded",
                "technique_name": name,
                "technique_kind": kind,
                "duration_sec": dur,
                "completed": completed,
                "recorded_at": recordedAt,
            ]
            if let intended { obj["intended_duration_sec"] = intended }
        }
        var data = (try? JSONSerialization.data(withJSONObject: obj)) ?? Data()
        data.append(0x0A) // '\n'
        return data
    }
}

// MARK: Server -> client

enum ServerMessage {
    case hello(serverId: String, serverName: String)
    case challenge(nonceHex: String)
    case authed
    case authFailed(reason: String)
    case statusUpdate(soulTier: String, completedSessions: Int)
    case requestMeasurement(sessionId: String, phase: String, techniqueName: String)
    case unknown

    static func parse(_ line: Data) -> ServerMessage? {
        guard
            let obj  = try? JSONSerialization.jsonObject(with: line) as? [String: Any],
            let type = obj["type"] as? String
        else { return nil }
        switch type {
        case "hello":
            let id = obj["server_id"] as? String ?? ""
            return .hello(serverId: id, serverName: obj["server_name"] as? String ?? id)
        case "challenge":
            guard let nonce = obj["nonce_hex"] as? String else { return nil }
            return .challenge(nonceHex: nonce)
        case "authed":
            return .authed
        case "auth_failed":
            return .authFailed(reason: obj["reason"] as? String ?? "auth failed")
        case "status_update":
            return .statusUpdate(
                soulTier: obj["soul_tier"] as? String ?? "",
                completedSessions: obj["completed_sessions"] as? Int ?? 0
            )
        case "request_measurement":
            return .requestMeasurement(
                sessionId: obj["session_id"] as? String ?? "",
                phase: obj["phase"] as? String ?? "",
                techniqueName: obj["technique_name"] as? String ?? ""
            )
        default:
            return .unknown
        }
    }
}

// MARK: QR payload (base64-url, no padding) -- matches the Mac's QrPayload

struct QrPayload {
    let serverId: String
    let serverName: String
    let host: String
    let port: UInt16
    let pairingId: String
    let secretHex: String

    static func decode(_ s: String) -> QrPayload? {
        guard
            let data = base64UrlDecode(s),
            let obj  = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let serverId  = obj["server_id"]  as? String,
            let host      = obj["host"]       as? String,
            let portInt   = obj["port"]       as? Int,
            let pairingId = obj["pairing_id"] as? String,
            let secretHex = obj["secret_hex"] as? String,
            portInt > 0, portInt <= 65_535
        else { return nil }
        return QrPayload(
            serverId: serverId,
            serverName: obj["server_name"] as? String ?? serverId,
            host: host,
            port: UInt16(portInt),
            pairingId: pairingId,
            secretHex: secretHex
        )
    }
}

func base64UrlDecode(_ s: String) -> Data? {
    var str = s.replacingOccurrences(of: "-", with: "+")
               .replacingOccurrences(of: "_", with: "/")
    while str.count % 4 != 0 { str.append("=") }
    return Data(base64Encoded: str)
}
