import ExpoModulesCore
import HealthKit

/// Niyora stress v1 — HealthKit reads (heart rate) on the phone.
/// Used for: building the personal resting baseline, detecting sustained
/// elevation at rest (the nudge trigger), and reading dense HR around an
/// action (recovery curve). HRV is intentionally NOT used here — proven on
/// device that the watch yields no usable HRV.
public class NiyoraHealthModule: Module {
    private let store = HKHealthStore()
    private let hrType = HKQuantityType(.heartRate)
    private let bpmUnit = HKUnit.count().unitDivided(by: .minute())
    private let iso = ISO8601DateFormatter()

    public func definition() -> ModuleDefinition {
        Name("NiyoraHealth")

        AsyncFunction("isAvailable") { () -> Bool in
            HKHealthStore.isHealthDataAvailable()
        }

        // Ask for read access to heart rate. Returns true if the system dialog
        // completed without error (note: iOS never reveals whether the user
        // actually granted read access — absence of samples is the only signal).
        AsyncFunction("requestAuthorization") { (promise: Promise) in
            guard HKHealthStore.isHealthDataAvailable() else {
                promise.resolve(false); return
            }
            let read: Set<HKObjectType> = [self.hrType]
            self.store.requestAuthorization(toShare: [], read: read) { ok, err in
                if let err = err {
                    promise.reject("ERR_HK_AUTH", err.localizedDescription)
                } else {
                    promise.resolve(ok)
                }
            }
        }

        // Recent heart-rate samples, newest first: [{ bpm, date(ISO-8601) }].
        // sinceIso defaults to one hour ago when nil.
        AsyncFunction("getHeartRateSamples") { (sinceIso: String?, limit: Int, promise: Promise) in
            let end = Date()
            let start: Date = {
                if let s = sinceIso, let d = self.iso.date(from: s) { return d }
                return end.addingTimeInterval(-3600)
            }()
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
            let sort = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
            let query = HKSampleQuery(
                sampleType: self.hrType, predicate: predicate,
                limit: limit, sortDescriptors: sort
            ) { _, samples, err in
                if let err = err {
                    promise.reject("ERR_HK_QUERY", err.localizedDescription); return
                }
                let out: [[String: Any]] = (samples as? [HKQuantitySample] ?? []).map { s in
                    [
                        "bpm": s.quantity.doubleValue(for: self.bpmUnit),
                        "date": self.iso.string(from: s.endDate),
                    ]
                }
                promise.resolve(out)
            }
            self.store.execute(query)
        }
    }
}
