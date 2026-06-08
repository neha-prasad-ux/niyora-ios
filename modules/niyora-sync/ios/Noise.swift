import Foundation
import CryptoKit

// Noise XX handshake + Short Authentication String, the iOS counterpart of
// the Mac's `noise.rs`.
//
// IMPORTANT: this must stay byte-for-byte compatible with the Rust side:
//   app/src-tauri/src/companion_sync/noise.rs   (niyora repo)
// Suite: Noise_XX_25519_ChaChaPoly_SHA256, chosen so this file can be built
// entirely on CryptoKit (Curve25519 + ChaChaPoly + SHA256) with no third
// party Noise dependency.
//
// This type is IO-agnostic: it produces and consumes Noise message buffers.
// MacConnection owns the socket and the 2-byte length framing.

enum NoiseError: Error {
    case badCiphertext
    case handshakeNotComplete
    case missingRemoteStatic
}

private let kNoiseProtocolName = "Noise_XX_25519_ChaChaPoly_SHA256"

// MARK: - Primitives

private func sha256(_ data: Data) -> Data {
    Data(SHA256.hash(data: data))
}

private func hmacSha256(key: Data, data: Data) -> Data {
    Data(HMAC<SHA256>.authenticationCode(for: data, using: SymmetricKey(data: key)))
}

/// Noise HKDF with two outputs (the only arity XX needs).
private func hkdf2(chainingKey ck: Data, ikm: Data) -> (Data, Data) {
    let tempKey = hmacSha256(key: ck, data: ikm)
    let o1 = hmacSha256(key: tempKey, data: Data([0x01]))
    let o2 = hmacSha256(key: tempKey, data: o1 + Data([0x02]))
    return (o1, o2)
}

/// ChaChaPoly nonce in Noise encoding: 4 zero bytes then the 64-bit counter
/// little-endian.
private func noiseNonce(_ counter: UInt64) -> Data {
    var data = Data(count: 4)
    var le = counter.littleEndian
    withUnsafeBytes(of: &le) { data.append(contentsOf: $0) }
    return data
}

private func dh(_ priv: Curve25519.KeyAgreement.PrivateKey, _ peerPublic: Data) throws -> Data {
    let peer = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerPublic)
    let shared = try priv.sharedSecretFromKeyAgreement(with: peer)
    return shared.withUnsafeBytes { Data($0) }
}

// MARK: - Cipher state

/// One directional ChaCha20-Poly1305 stream with a Noise counter nonce.
final class NoiseCipherState {
    private let key: SymmetricKey
    private var counter: UInt64 = 0

    init(key: Data) {
        self.key = SymmetricKey(data: key)
    }

    func encrypt(ad: Data, plaintext: Data) throws -> Data {
        let nonce = try ChaChaPoly.Nonce(data: noiseNonce(counter))
        let box = try ChaChaPoly.seal(plaintext, using: key, nonce: nonce, authenticating: ad)
        counter += 1
        return box.ciphertext + box.tag
    }

    func decrypt(ad: Data, ciphertext: Data) throws -> Data {
        guard ciphertext.count >= 16 else { throw NoiseError.badCiphertext }
        let ct = Data(ciphertext.prefix(ciphertext.count - 16))
        let tag = Data(ciphertext.suffix(16))
        let nonce = try ChaChaPoly.Nonce(data: noiseNonce(counter))
        let box = try ChaChaPoly.SealedBox(nonce: nonce, ciphertext: ct, tag: tag)
        let pt = try ChaChaPoly.open(box, using: key, authenticating: ad)
        counter += 1
        return pt
    }
}

// MARK: - Symmetric state

private final class SymmetricState {
    var ck: Data
    var h: Data
    private var cs: NoiseCipherState?

    var hasKey: Bool { cs != nil }

    init(protocolName: String) {
        let name = Data(protocolName.utf8)
        if name.count <= 32 {
            var hh = name
            hh.append(Data(count: 32 - name.count))
            h = hh
        } else {
            h = sha256(name)
        }
        ck = h
    }

    func mixHash(_ data: Data) {
        h = sha256(h + data)
    }

    func mixKey(_ ikm: Data) {
        let (newCk, tempK) = hkdf2(chainingKey: ck, ikm: ikm)
        ck = newCk
        cs = NoiseCipherState(key: tempK)
    }

    func encryptAndHash(_ plaintext: Data) throws -> Data {
        let ct: Data
        if let cs { ct = try cs.encrypt(ad: h, plaintext: plaintext) } else { ct = plaintext }
        mixHash(ct)
        return ct
    }

    func decryptAndHash(_ ciphertext: Data) throws -> Data {
        let pt: Data
        if let cs { pt = try cs.decrypt(ad: h, ciphertext: ciphertext) } else { pt = ciphertext }
        mixHash(ciphertext)
        return pt
    }

    func split() -> (NoiseCipherState, NoiseCipherState) {
        let (t1, t2) = hkdf2(chainingKey: ck, ikm: Data())
        return (NoiseCipherState(key: t1), NoiseCipherState(key: t2))
    }
}

// MARK: - Transport

/// Sealed channel after the handshake. `c1` is the initiator->responder
/// stream, `c2` the responder->initiator stream; the role picks which to
/// send on. Transport messages carry empty additional data.
final class NoiseTransport {
    private let sendCS: NoiseCipherState
    private let recvCS: NoiseCipherState

    init(initiator: Bool, c1: NoiseCipherState, c2: NoiseCipherState) {
        sendCS = initiator ? c1 : c2
        recvCS = initiator ? c2 : c1
    }

    func seal(_ plaintext: Data) throws -> Data {
        try sendCS.encrypt(ad: Data(), plaintext: plaintext)
    }

    func open(_ ciphertext: Data) throws -> Data {
        try recvCS.decrypt(ad: Data(), ciphertext: ciphertext)
    }
}

// MARK: - Handshake

/// XX handshake driver. The phone is the initiator. Call `writeMessage` /
/// `readMessage` in the XX order (write, read, write for the initiator), then
/// `split()` once `isComplete`.
final class NoiseHandshake {
    private let ss: SymmetricState
    private let initiator: Bool
    private let staticKey: Curve25519.KeyAgreement.PrivateKey
    private let staticPublic: Data

    private var ephemeral: Curve25519.KeyAgreement.PrivateKey?
    private var remoteEphemeral: Data?
    private var remoteStatic: Data?
    private var messageIndex = 0

    init(localStaticPrivate: Data, initiator: Bool) throws {
        ss = SymmetricState(protocolName: kNoiseProtocolName)
        self.initiator = initiator
        staticKey = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: localStaticPrivate)
        staticPublic = staticKey.publicKey.rawRepresentation
        ss.mixHash(Data()) // empty prologue
    }

    var isComplete: Bool { messageIndex >= 3 }
    var handshakeHash: Data { ss.h }
    var remoteStaticKey: Data? { remoteStatic }
    var sas: String { Noise.sas(fromHandshakeHash: ss.h) }

    func writeMessage(_ payload: Data = Data()) throws -> Data {
        var buf = Data()
        for token in Self.tokens(messageIndex) {
            try apply(token, into: &buf)
        }
        buf.append(try ss.encryptAndHash(payload))
        messageIndex += 1
        return buf
    }

    func readMessage(_ message: Data) throws -> Data {
        var msg = message
        for token in Self.tokens(messageIndex) {
            try consume(token, from: &msg)
        }
        let payload = try ss.decryptAndHash(Data(msg))
        messageIndex += 1
        return payload
    }

    func split() throws -> NoiseTransport {
        guard isComplete else { throw NoiseError.handshakeNotComplete }
        let (c1, c2) = ss.split()
        return NoiseTransport(initiator: initiator, c1: c1, c2: c2)
    }

    // MARK: token processing

    private func apply(_ token: String, into buf: inout Data) throws {
        switch token {
        case "e":
            let ek = Curve25519.KeyAgreement.PrivateKey()
            ephemeral = ek
            let pub = ek.publicKey.rawRepresentation
            buf.append(pub)
            ss.mixHash(pub)
        case "s":
            buf.append(try ss.encryptAndHash(staticPublic))
        default:
            try mix(token)
        }
    }

    private func consume(_ token: String, from msg: inout Data) throws {
        switch token {
        case "e":
            let re = Data(msg.prefix(32))
            msg = Data(msg.dropFirst(32))
            remoteEphemeral = re
            ss.mixHash(re)
        case "s":
            let len = ss.hasKey ? 48 : 32
            let temp = Data(msg.prefix(len))
            msg = Data(msg.dropFirst(len))
            remoteStatic = try ss.decryptAndHash(temp)
        default:
            try mix(token)
        }
    }

    /// The DH tokens. `es`/`se` are role-dependent: each names the initiator
    /// key first, responder key second.
    private func mix(_ token: String) throws {
        switch token {
        case "ee":
            ss.mixKey(try dh(ephemeral!, remoteEphemeral!))
        case "es":
            ss.mixKey(try dh(initiator ? ephemeral! : staticKey,
                             initiator ? remoteStatic! : remoteEphemeral!))
        case "se":
            ss.mixKey(try dh(initiator ? staticKey : ephemeral!,
                             initiator ? remoteEphemeral! : remoteStatic!))
        default:
            break
        }
    }

    private static func tokens(_ index: Int) -> [String] {
        switch index {
        case 0: return ["e"]
        case 1: return ["e", "ee", "s", "es"]
        case 2: return ["s", "se"]
        default: return []
        }
    }
}

// MARK: - Public helpers

enum Noise {
    /// Derive the Short Authentication String from the handshake transcript
    /// hash. Six grouped digits, e.g. "123 456". Both ends compute this from
    /// the identical hash, so a man-in-the-middle's two handshakes diverge.
    static func sas(fromHandshakeHash hash: Data) -> String {
        let b = [UInt8](hash.prefix(4))
        let n = (UInt32(b[0]) << 24 | UInt32(b[1]) << 16 | UInt32(b[2]) << 8 | UInt32(b[3]))
            % 1_000_000
        return String(format: "%03d %03d", n / 1000, n % 1000)
    }

    /// Generate a fresh Curve25519 static identity keypair.
    static func generateStaticKeypair() -> (privateKey: Data, publicKey: Data) {
        let p = Curve25519.KeyAgreement.PrivateKey()
        return (p.rawRepresentation, p.publicKey.rawRepresentation)
    }
}
