import ExpoModulesCore
import Network

public class NiyoraSyncModule: Module {
    private let flow = PairingFlow()

    public func definition() -> ModuleDefinition {
        Name("NiyoraSync")

        Events("onServerDiscovered", "onStateChanged", "onStatusUpdate", "onSoulStateUpdate", "onReminderState")

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
            self.flow.onReminderState = { [weak self] fireAt, macActive, title, body in
                self?.sendEvent("onReminderState", [
                    "fireAt": fireAt,
                    "macActive": macActive,
                    "title": title,
                    "body": body,
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

        Function("connectToMac") { (name: String) in
            self.flow.connectToMac(named: name)
        }

        Function("cancelPairing") {
            self.flow.cancelPairing()
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

        Function("isPaired") { () -> Bool in
            if case .paired = self.flow.state { return true }
            return false
        }

        AsyncFunction("requestNotificationPermission") { () async -> Bool in
            await withCheckedContinuation { continuation in
                self.flow.requestNotificationPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    private func emitState(_ state: PairingState) {
        switch state {
        case .unpaired:
            sendEvent("onStateChanged", ["state": "unpaired"])
        case .connecting:
            sendEvent("onStateChanged", ["state": "connecting"])
        case .awaitingApproval(let sas):
            sendEvent("onStateChanged", ["state": "awaiting_approval", "sas": sas])
        case .paired(let id):
            sendEvent("onStateChanged", ["state": "paired", "serverId": id])
        case .failed(let msg):
            sendEvent("onStateChanged", ["state": "failed", "message": msg])
        }
    }
}
