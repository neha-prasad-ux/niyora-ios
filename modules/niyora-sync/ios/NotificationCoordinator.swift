import Foundation
import UserNotifications
import UIKit

/// Schedules the phone's copy of the Mac's reminder, applying the active-device rule.
///
/// Rule: whichever device the user is currently on owns the notification; the other
/// stays silent. Tie-break (neither clearly active): phone fires.
///
/// The Mac is the source of truth for timing and copy. When the Mac sends a
/// `reminder_state` message this coordinator either schedules a local notification
/// (Mac not active) or cancels any pending one (Mac is active). When a session
/// completes on the phone the pending notification is cancelled immediately; the
/// Mac will send a fresh `reminder_state` once it acknowledges the session.
final class NotificationCoordinator {

    private let kIdentifier     = "com.niyora.reminder"
    /// How long after the Mac last reported active we still consider it the active device.
    private let kMacActiveWindow: TimeInterval = 120

    private var phoneForeground  = false
    private var macActive        = false
    private var macActiveSeenAt  : Date?
    private var stateObservers   : [Any] = []

    /// Injected by PairingFlow so we can send `phone_active` without a retain cycle.
    var sendToMac: ((ClientMessage) -> Void)?

    // MARK: Lifecycle

    func start() {
        phoneForeground = UIApplication.shared.applicationState == .active
        stateObservers.append(
            NotificationCenter.default.addObserver(
                forName: UIApplication.didBecomeActiveNotification,
                object: nil, queue: .main
            ) { [weak self] _ in self?.handlePhoneForeground(true) }
        )
        stateObservers.append(
            NotificationCenter.default.addObserver(
                forName: UIApplication.willResignActiveNotification,
                object: nil, queue: .main
            ) { [weak self] _ in self?.handlePhoneForeground(false) }
        )
        // Inform the Mac of the current phone state right after pairing.
        sendToMac?(.phoneActive(active: phoneForeground, ts: iso8601Now()))
    }

    func stop() {
        stateObservers.forEach { NotificationCenter.default.removeObserver($0) }
        stateObservers = []
        cancelPending()
    }

    // MARK: Incoming Mac messages

    /// Called when the Mac sends a `reminder_state` message.
    func apply(fireAt: String, macIsActive: Bool, title: String, body: String) {
        macActive       = macIsActive
        macActiveSeenAt = Date()

        cancelPending()

        guard !effectiveMacActive() else {
            // Mac owns this notification.
            return
        }

        guard let fireDate = parseISO8601(fireAt), fireDate > Date() else { return }
        schedule(at: fireDate, title: title, body: body)
    }

    // MARK: Outgoing phone events

    /// Call immediately after a session completes on the phone.
    /// The Mac will send an updated `reminder_state` (with new `fire_at`) once it
    /// acknowledges the `session_recorded` message, which resets the shared clock.
    func didCompleteSession() {
        cancelPending()
    }

    // MARK: Permission

    func requestPermission(_ completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
            DispatchQueue.main.async { completion(granted) }
        }
    }

    // MARK: Private

    private func handlePhoneForeground(_ active: Bool) {
        phoneForeground = active
        sendToMac?(.phoneActive(active: active, ts: iso8601Now()))
    }

    /// Returns true only when the Mac reported active within the staleness window.
    private func effectiveMacActive() -> Bool {
        guard macActive, let seenAt = macActiveSeenAt else { return false }
        return Date().timeIntervalSince(seenAt) < kMacActiveWindow
    }

    private func schedule(at date: Date, title: String, body: String) {
        let content   = UNMutableNotificationContent()
        content.title = title
        content.body  = body
        content.sound = .default
        let interval  = date.timeIntervalSinceNow
        guard interval > 1 else { return }
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(identifier: kIdentifier, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    private func cancelPending() {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [kIdentifier])
    }

    private func parseISO8601(_ s: String) -> Date? {
        ISO8601DateFormatter().date(from: s)
    }

    private func iso8601Now() -> String {
        ISO8601DateFormatter().string(from: Date())
    }
}
