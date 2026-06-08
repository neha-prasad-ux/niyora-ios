import Foundation
import Network
import UIKit

/// Lightweight ring-buffer logger for the pairing path. Native events to JS
/// have proven unreliable, so we expose this via a synchronous module function
/// the JS layer can poll and print. Keep the last ~120 lines.
final class SyncDebug {
    static let shared = SyncDebug()
    private var lines: [String] = []
    private let q = DispatchQueue(label: "com.niyora.sync.debug")
    func log(_ s: String) {
        q.sync {
            lines.append(s)
            if lines.count > 120 { lines.removeFirst(lines.count - 120) }
        }
    }
    func dump() -> String { q.sync { lines.joined(separator: "\n") } }
}

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
        // Phase 0 (niyora#121): plain TCP to match the Mac's plaintext socket so
        // we can prove discovery → connect → auth → keychain → reconnect works
        // end to end before swapping in the Noise handshake. The HMAC handshake
        // in PairingFlow still authenticates the peer; this phase is deliberately
        // unencrypted and temporary — Noise replaces it in Phase 1.
        //
        // Match the retired companion's proven-good setup: plain TCP with
        // peer-to-peer enabled. That app paired with this same Mac many times.
        let params = NWParameters.tcp
        params.includePeerToPeer = true
        SyncDebug.shared.log("connect → \(endpoint) p2p=true")
        let c = NWConnection(to: endpoint, using: params)
        c.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            SyncDebug.shared.log("nwstate: \(MacConnection.describe(state))")
            self.delegate?.connection(self, didChangeState: state)
            if state == .ready { self.receiveNext() }
        }
        recvBuf.removeAll()
        c.start(queue: queue)
        conn = c
    }

    static func describe(_ state: NWConnection.State) -> String {
        switch state {
        case .setup: return "setup"
        case .preparing: return "preparing"
        case .ready: return "ready"
        case .cancelled: return "cancelled"
        case .waiting(let err): return "waiting(\(err))"
        case .failed(let err): return "failed(\(err))"
        @unknown default: return "unknown"
        }
    }

    func disconnect() {
        conn?.cancel()
        conn = nil
        recvBuf.removeAll()
    }

    // MARK: Send

    func send(_ message: ClientMessage) {
        guard let c = conn else { SyncDebug.shared.log("send dropped: no conn"); return }
        SyncDebug.shared.log("send \(message.line().count) bytes")
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
