import ExpoModulesCore
import HealthKit

/// Niyora stress v1 — HealthKit reads (heart rate + activity) on the phone.
/// Used for: building the personal resting baseline, detecting sustained
/// elevation at rest (the nudge trigger), and reading dense HR around an
/// action (recovery curve). Steps / active energy / workouts feed activity-
/// gating so the trigger fires on stress, not exercise. HRV is intentionally
/// NOT used here — proven on device that the watch yields no usable HRV.
public class NiyoraHealthModule: Module {
    private let store = HKHealthStore()
    private let hrType = HKQuantityType(.heartRate)
    private let stepType = HKQuantityType(.stepCount)
    private let energyType = HKQuantityType(.activeEnergyBurned)
    private let workoutType = HKObjectType.workoutType()
    private let bpmUnit = HKUnit.count().unitDivided(by: .minute())
    private let kcalUnit = HKUnit.kilocalorie()
    private let iso = ISO8601DateFormatter()

    /// Window start: parse sinceIso, else `end - fallbackSeconds`.
    private func windowStart(_ sinceIso: String?, end: Date, fallbackSeconds: TimeInterval) -> Date {
        if let s = sinceIso, let d = iso.date(from: s) { return d }
        return end.addingTimeInterval(-fallbackSeconds)
    }

    /// Cumulative sum of a quantity type over [start, end] in the given unit.
    /// Resolves 0 when there are no samples (HealthKit returns a nil statistic).
    private func sumQuantity(
        _ type: HKQuantityType, unit: HKUnit, start: Date, end: Date, promise: Promise
    ) {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let query = HKStatisticsQuery(
            quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum
        ) { _, stats, err in
            if let err = err {
                // HKStatisticsQuery reports an empty window as errorNoData rather
                // than a zero statistic. For activity-gating, "no samples" *is*
                // the answer (the user was still), so resolve 0 in that case.
                let nsErr = err as NSError
                if nsErr.domain == HKError.errorDomain,
                   nsErr.code == HKError.Code.errorNoData.rawValue {
                    promise.resolve(0); return
                }
                promise.reject("ERR_HK_QUERY", err.localizedDescription); return
            }
            let total = stats?.sumQuantity()?.doubleValue(for: unit) ?? 0
            promise.resolve(total)
        }
        store.execute(query)
    }

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
            let read: Set<HKObjectType> = [
                self.hrType, self.stepType, self.energyType, self.workoutType,
            ]
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

        // Total steps over the window. sinceIso defaults to 10 minutes ago.
        AsyncFunction("getStepCount") { (sinceIso: String?, promise: Promise) in
            let end = Date()
            let start = self.windowStart(sinceIso, end: end, fallbackSeconds: 600)
            self.sumQuantity(self.stepType, unit: HKUnit.count(), start: start, end: end, promise: promise)
        }

        // Total active energy (kcal) over the window. sinceIso defaults to 10 minutes ago.
        AsyncFunction("getActiveEnergy") { (sinceIso: String?, promise: Promise) in
            let end = Date()
            let start = self.windowStart(sinceIso, end: end, fallbackSeconds: 600)
            self.sumQuantity(self.energyType, unit: self.kcalUnit, start: start, end: end, promise: promise)
        }

        // Workouts overlapping the window, newest first:
        // [{ activityType(Int raw), start(ISO), end(ISO), isActive(Bool) }].
        // isActive = the workout has no end yet OR its end is in the future
        // (an in-progress session). sinceIso defaults to one hour ago.
        AsyncFunction("getRecentWorkouts") { (sinceIso: String?, limit: Int, promise: Promise) in
            let end = Date()
            let start = self.windowStart(sinceIso, end: end, fallbackSeconds: 3600)
            let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
            let sort = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
            let query = HKSampleQuery(
                sampleType: self.workoutType, predicate: predicate,
                limit: limit, sortDescriptors: sort
            ) { _, samples, err in
                if let err = err {
                    promise.reject("ERR_HK_QUERY", err.localizedDescription); return
                }
                let now = Date()
                let out: [[String: Any]] = (samples as? [HKWorkout] ?? []).map { w in
                    [
                        "activityType": Int(w.workoutActivityType.rawValue),
                        "start": self.iso.string(from: w.startDate),
                        "end": self.iso.string(from: w.endDate),
                        "isActive": w.endDate >= now,
                    ]
                }
                promise.resolve(out)
            }
            self.store.execute(query)
        }
    }
}
