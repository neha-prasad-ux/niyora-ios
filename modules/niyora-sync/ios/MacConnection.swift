import Foundation
import Network
import UIKit

protocol MacConnectionDelegate: AnyObject {
    func connection(_ conn: MacConnection, didDiscover name: String, endpoint: NWEndpoint)
    func connection(_ conn: MacConnection, didReceive message: ServerMessage)
    func connection(_ conn: MacConnection, didChangeState state: NWConnection.State)
}

final class MacConnection {
    weak var delegate: MacConnectionDelegate?

    let deviceId: String = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    private let queue = DispatchQueue(label: "com.niyora.sync.net", qos: .utility)
    private var browser: NWBrowser?
    private var conn: NWConnection?
    private var recvBuf = Data()
    private let kMaxLineLen = 4 * 1_048_576  // 4 MB cap; guards against a peer that never sends a newline.

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

    func connect(host: String, port: UInt16) {
        guard let nwPort = NWEndpoint.Port(rawValue: port) else { return }
        connect(to: .hostPort(host: NWEndpoint.Host(host), port: nwPort))
    }

    func connect(to endpoint: NWEndpoint) {
        let tlsOptions = NWProtocolTLS.Options()
        // Accept the peer's self-signed cert; the HMAC auth handshake proves the
        // peer holds the pairing secret. TLS still encrypts against eavesdroppers.
        sec_protocol_options_set_verify_block(
            tlsOptions.securityProtocolOptions,
            { _, _, completion in completion(true) },
            queue
        )
        let params = NWParameters(tls: tlsOptions, tcp: NWProtocolTCP.Options())
        params.includePeerToPeer = true
        let c = NWConnection(to: endpoint, using: params)
        c.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            self.delegate?.connection(self, didChangeState: state)
            if state == .ready { self.receiveNext() }
        }
        recvBuf.removeAll()
        c.start(queue: queue)
        conn = c
    }

    func disconnect() {
        conn?.cancel()
        conn = nil
        recvBuf.removeAll()
    }

    // MARK: Send

    func send(_ message: ClientMessage) {
        guard let c = conn else { return }
        c.send(content: message.line(), completion: .idempotent)
    }

    // MARK: Receive (newline-delimited framing)

    private func receiveNext() {
        conn?.receive(minimumIncompleteLength: 1, maximumLength: 65_536) { [weak self] content, _, isComplete, error in
            guard let self else { return }
            if let content { self.recvBuf.append(content) }
            self.drainBuffer()
            guard error == nil, !isComplete else { return }
            self.receiveNext()
        }
    }

    private func drainBuffer() {
        while let nl = recvBuf.firstIndex(of: 0x0A) {
            let lineData = recvBuf.subdata(in: recvBuf.startIndex..<nl)
            recvBuf.removeSubrange(recvBuf.startIndex...nl)
            guard !lineData.isEmpty else { continue }
            if let msg = ServerMessage.parse(lineData) {
                delegate?.connection(self, didReceive: msg)
            }
        }
        if recvBuf.count > kMaxLineLen {
            conn?.cancel()
            recvBuf.removeAll()
        }
    }
}
