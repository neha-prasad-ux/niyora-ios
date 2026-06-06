import Foundation

// Length-prefixed framing: 4-byte big-endian body length + JSON body.
let kServiceType   = "_niyora._tcp"
let kServiceDomain = "local."
let kFrameHeaderLen = 4

enum MsgType: String, Codable {
    case identify
    case heartbeat
    case pairRequest  = "pair_request"
    case pairResponse = "pair_response"
    case syncPush     = "sync_push"
    case syncAck      = "sync_ack"
}

struct Envelope: Codable {
    let type:     MsgType
    let deviceId: String
    var body:     String?   // JSON-encoded type-specific payload
}

func wire(_ env: Envelope) throws -> Data {
    let payload = try JSONEncoder().encode(env)
    var bigLen  = UInt32(payload.count).bigEndian
    var frame   = Data(bytes: &bigLen, count: kFrameHeaderLen)
    frame.append(payload)
    return frame
}

func unwire(_ data: Data) throws -> Envelope {
    return try JSONDecoder().decode(Envelope.self, from: data)
}
