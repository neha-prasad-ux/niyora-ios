import Foundation
import Network
import UIKit

protocol MacConnectionDelegate: AnyObject {
    func connection(_ conn: MacConnection, didDiscover name: String, endpoint: NWEndpoint)
    /// Noise handshake completed. `sas` is the number to show next to the
    /// Mac's Allow prompt; `remoteStatic` is the Mac's static public key.
    func connection(_ conn: MacConnection, didCompleteHandshake sas: String, remoteStatic: Data)
    func connection(_ conn: MacConnection, didReceive message: ServerMessage)
    func connection(_ conn: MacConnection, didChangeState state: NWConnection.State)
}

final class MacConnection {
    weak var delegate: MacConnectionDelegate?

    let deviceId: String = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    /// This phone's long-term Noise static private key. Set by PairingFlow
    /// before connecting; the handshake derives the matching public key the
    /// Mac stores as this phone's identity.
    var staticPrivate = Data()

    private let queue = DispatchQueue(label: "com.niyora.sync.net", qos: .utility)
    private var browser: NWBrowser?
    private var conn: NWConnection?
    private var recvBuf = Data()

    private var handshake: NoiseHandshake?
    private var transport: NoiseTransport?

    private let kMaxFrameLen = 65_535  // a Noise frame can never exceed this.

    // MARK: Discovery

    func startBrowsing() {
        let desc   = NWBrowser.Descriptor.bonjourWithTXTRecord(type: kServiceType, domain: kServiceDomain)
        let params = NWParameters.tcp
        params.includePeerToPeer = true
        let b = NWBrowser(for: desc, using: params)
        b.browseResultsChangedHandler = { [weak self] _, changes in
            guard let self else { return }
            for change in changes {
                if case .added(let result) = change { self.handleDiscovered(result) }
            }
        }
        b.start(queue: queue)
        browser = b
    }

    func stopBrowsing() {
        browser?.cancel()
        browser = nil
    }

    private func handleDiscovered(_ result: NWBrowser.Result) {
        var name = ""
        if case .service(let n, _, _, _) = result.endpoint { name = n }
        delegate?.connection(self, didDiscover: name, endpoint: result.endpoint)
    }

    // MARK: Connect / Disconnect

    func connect(to endpoint: NWEndpoint) {
        // Plain TCP · the Noise XX handshake provides encryption + auth, so no
        // TLS layer is needed (and there is no cert to manage).
        let params = NWParameters.tcp
        params.includePeerToPeer = true
        let c = NWConnection(to: endpoint, using: params)
        c.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            self.delegate?.connection(self, didChangeState: state)
            if state == .ready { self.startHandshake() }
        }
        recvBuf.removeAll()
        handshake = nil
        transport = nil
        c.start(queue: queue)
        conn = c
    }

    func disconnect() {
        conn?.cancel()
        conn = nil
        recvBuf.removeAll()
        handshake = nil
        transport = nil
    }

    // MARK: Send (sealed app frames)

    func send(_ message: ClientMessage) {
        guard let t = transport, let sealed = try? t.seal(message.encoded()) else { return }
        writeFrame(sealed)
    }

    // MARK: Handshake (XX, phone is initiator)

    private func startHandshake() {
        guard let hs = try? NoiseHandshake(localStaticPrivate: staticPrivate, initiator: true) else {
            conn?.cancel(); return
        }
        handshake = hs
        // -> e
        guard let m1 = try? hs.writeMessage() else { conn?.cancel(); return }
        writeFrame(m1) { [weak self] in
            guard let self else { return }
            // <- e, ee, s, es
            self.readFrame { m2 in
                guard let m2, (try? hs.readMessage(m2)) != nil else { self.conn?.cancel(); return }
                // -> s, se
                guard let m3 = try? hs.writeMessage() else { self.conn?.cancel(); return }
                self.writeFrame(m3) {
                    guard hs.isComplete,
                          let t = try? hs.split(),
                          let rs = hs.remoteStaticKey else { self.conn?.cancel(); return }
                    self.transport = t
                    self.delegate?.connection(self, didCompleteHandshake: hs.sas, remoteStatic: rs)
                    self.receiveLoop()
                }
            }
        }
    }

    private func receiveLoop() {
        readFrame { [weak self] frame in
            guard let self else { return }
            guard let frame, let t = self.transport else { return }
            if let pt = try? t.open(frame), let msg = ServerMessage.parse(pt) {
                self.delegate?.connection(self, didReceive: msg)
            }
            self.receiveLoop()
        }
    }

    // MARK: Framing (2-byte big-endian length prefix · matches noise.rs)

    private func writeFrame(_ payload: Data, completion: (() -> Void)? = nil) {
        guard payload.count <= kMaxFrameLen else { conn?.cancel(); return }
        var len = UInt16(payload.count).bigEndian
        var frame = Data()
        withUnsafeBytes(of: &len) { frame.append(contentsOf: $0) }
        frame.append(payload)
        conn?.send(content: frame, completion: .contentProcessed { _ in completion?() })
    }

    private func readFrame(_ completion: @escaping (Data?) -> Void) {
        readExactly(2) { [weak self] header in
            guard let self, let header else { completion(nil); return }
            let n = Int(header[0]) << 8 | Int(header[1])
            self.readExactly(n) { completion($0) }
        }
    }

    private func readExactly(_ n: Int, _ completion: @escaping (Data?) -> Void) {
        if recvBuf.count >= n {
            let out = Data(recvBuf.prefix(n))
            recvBuf.removeFirst(n)
            completion(out)
            return
        }
        conn?.receive(minimumIncompleteLength: 1, maximumLength: 65_536) { [weak self] content, _, isComplete, error in
            guard let self else { completion(nil); return }
            if let content, !content.isEmpty { self.recvBuf.append(content) }
            if error != nil { completion(nil); return }
            if self.recvBuf.count >= n {
                let out = Data(self.recvBuf.prefix(n))
                self.recvBuf.removeFirst(n)
                completion(out)
            } else if isComplete {
                completion(nil)
            } else {
                self.readExactly(n, completion)
            }
        }
    }
}
