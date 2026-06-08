import Foundation

// Wire protocol, matched to the Mac's `companion_sync` (Rust) implementation.
//
// IMPORTANT: keep in lockstep with the source of truth:
//   app/src-tauri/src/companion_sync/protocol.rs   (niyora repo)
//
// As of v4 the channel is wrapped in a Noise XX handshake (see Noise.swift):
// each app message is one sealed Noise transport frame carrying one JSON
// object (no newline framing). The handshake replaces the old QR secret +
// HMAC challenge. Lifecycle after the handshake:
//   identify -> hello -> authed, then status_update / soul_state / etc.

let kServiceType    = "_niyora._tcp"
let kServiceDomain  = "local."
let kProtocolVersion = 4   // PROTOCOL_VERSION on the Mac; v4 = Noise-sealed.

// MARK: Client -> server

enum ClientMessage {
    case identify(clientId: String, clientName: String)
    case sessionRecorded(
        techniqueName: String,
        techniqueKind: String,
        durationSec: Int,
        intendedDurationSec: Int?,
        completed: Bool,
        recordedAt: String
    )
    /// Phone foreground state; lets the Mac suppress its own notification when the
    /// phone is the active device. Sent on every app-active/resign transition and
    /// once immediately after the post-auth handshake completes.
    case phoneActive(active: Bool, ts: String)

    /// One JSON object, ready to be sealed and written as a Noise frame.
    func encoded() -> Data {
        var obj: [String: Any]
        switch self {
        case let .identify(clientId, clientName):
            obj = [
                "type": "identify",
                "protocol": kProtocolVersion,
                "client_id": clientId,
                "client_name": clientName,
            ]
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
        case let .phoneActive(active, ts):
            obj = ["type": "phone_active", "active": active, "ts": ts]
        }
        return (try? JSONSerialization.data(withJSONObject: obj)) ?? Data()
    }
}

// MARK: Server -> client

enum ServerMessage {
    case hello(serverId: String, serverName: String)
    case authed
    case authFailed(reason: String)
    case statusUpdate(soulTier: String, completedSessions: Int)
    case requestMeasurement(sessionId: String, phase: String, techniqueName: String)
    /// Mac situational day reading; `ts` is ISO 8601. Schema version 1.
    case soulStateUpdate(label: String, index: Int, source: String, ts: String)
    /// Mac reminder schedule. Phone schedules a matching local notification unless
    /// the Mac is the active device (active-device rule). `fire_at` is ISO 8601.
    case reminderState(fireAt: String, macActive: Bool, title: String, body: String)
    case unknown

    /// Parse one decrypted Noise frame (a single JSON object).
    static func parse(_ frame: Data) -> ServerMessage? {
        guard
            let obj  = try? JSONSerialization.jsonObject(with: frame) as? [String: Any],
            let type = obj["type"] as? String
        else { return nil }
        switch type {
        case "hello":
            let id = obj["server_id"] as? String ?? ""
            return .hello(serverId: id, serverName: obj["server_name"] as? String ?? id)
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
        case "soul_state":
            return .soulStateUpdate(
                label: obj["label"] as? String ?? "normal",
                index: obj["index"] as? Int ?? 50,
                source: obj["source"] as? String ?? "mac",
                ts: obj["ts"] as? String ?? ""
            )
        case "reminder_state":
            guard let fireAt = obj["fire_at"] as? String else { return .unknown }
            return .reminderState(
                fireAt: fireAt,
                macActive: obj["mac_active"] as? Bool ?? false,
                title: obj["title"] as? String ?? "Time for a breath",
                body: obj["body"] as? String ?? ""
            )
        default:
            return .unknown
        }
    }
}
