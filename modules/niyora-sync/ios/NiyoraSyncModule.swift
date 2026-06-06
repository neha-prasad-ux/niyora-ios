import ExpoModulesCore
import Network

public class NiyoraSyncModule: Module {
    private let flow = PairingFlow()

    public func definition() -> ModuleDefinition {
        Name("NiyoraSync")

        Events("onServerDiscovered", "onStateChanged", "onStatusUpdate", "onSoulStateUpdate")

        OnCreate {
            self.flow.onStateChange = { [weak self] state in
                self?.emitState(state)
            }
            self.flow.onServerDiscovered = { [weak self] name, _ in
                self?.sendEvent("onServerDiscovered", ["name": name])
            }
            self.flow.onStatusUpdate = { [weak self] soulTier, completedSessions in
                self?.sendEvent("onStatusUpdate", [
                    "soulTier": soulTier,
                    "completedSessions": completedSessions,
                ])
            }
            self.flow.onSoulStateUpdate = { [weak self] label, index, source, ts in
                self?.sendEvent("onSoulStateUpdate", [
                    "label": label,
                    "index": index,
                    "source": source,
                    "ts": ts,
                ])
            }
        }

        OnDestroy {
            self.flow.stopDiscovery()
        }

        Function("startDiscovery") {
            self.flow.startDiscovery()
        }

        Function("stopDiscovery") {
            self.flow.stopDiscovery()
        }

        AsyncFunction("pairWithQR") { (qrString: String) throws in
            try self.flow.initiateFromQR(qrString)
        }

        Function("recordSession") {
            (techniqueName: String,
             techniqueKind: String,
             durationSec: Int,
             intendedDurationSec: Int,
             completed: Bool,
             recordedAt: String) in
            self.flow.recordSession(
                techniqueName: techniqueName,
                techniqueKind: techniqueKind,
                durationSec: durationSec,
                intendedDurationSec: intendedDurationSec,
                completed: completed,
                recordedAt: recordedAt
            )
        }

        Function("isPaired") -> Bool {
            if case .paired = self.flow.state { return true }
            return false
        }
    }

    private func emitState(_ state: PairingState) {
        switch state {
        case .unpaired:
            sendEvent("onStateChanged", ["state": "unpaired"])
        case .connecting:
            sendEvent("onStateChanged", ["state": "connecting"])
        case .paired(let id):
            sendEvent("onStateChanged", ["state": "paired", "serverId": id])
        case .failed(let msg):
            sendEvent("onStateChanged", ["state": "failed", "message": msg])
        }
    }
}

public class QRScannerViewModule: Module {
    public func definition() -> ModuleDefinition {
        Name("QRScannerView")

        View(QRScannerView.self) {
            Events("onScan", "onError")

            Prop("active") { (view: QRScannerView, active: Bool) in
                active ? view.start() : view.stop()
            }
        }
    }
}
