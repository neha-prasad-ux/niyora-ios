// The AI half of the crisis send-guard, shared by every free-text surface
// (moment, rough-moment, WriteView). ONE place, so crisis coverage cannot drift
// per screen -- the audit's top recommendation.
//
// The DETERMINISTIC keyword floor still runs at each call site FIRST, on the raw
// text: it must gate a synchronous return with per-surface cleanup, and in the
// moment flow it also produces the routing verdict (analyse), so it stays there.
// What was copy-pasted across four moment entry points and rough-moment -- and
// missing entirely on WriteView -- is exactly this: the async AI recall plus the
// deterministic abuse scan. That is what this extracts.
//
// INVARIANTS (audit), preserved here:
//   - Escalate-only: this may only turn crisis ON. onEscalate never turns it off.
//   - classifyCrisis returns null on any failure, and null means NO escalation.
//   - Only an ACUTE read stops the flow; a historical disclosure continues.
//
// Call this only AFTER the keyword floor has run and did NOT fire (a floor hit
// already handed off). Fire-and-forget: it never blocks her send.

import { scanForAbuse } from '@/lib/crisis-scan';
import { classifyCrisis, type CrisisType } from '@/lib/moment-gemini';

export type CrisisGuardHandlers = {
  /** The AI recall layer found an ACUTE crisis the keyword floor missed. Turn
   *  crisis ON here and set crisisType from the argument (it drives the DV-vs-
   *  suicide branch in CrisisSheet). Fires a beat after the send (a network
   *  round-trip); a no-op when AI is off or on any failure. */
  onEscalate: (type: CrisisType) => void;
  /** The deterministic abuse scan fired (physical-violence disclosure). Runs
   *  synchronously. Surface-specific: the moment flow de-fangs its respond menu
   *  and keeps going; the menu-less surfaces surface the DV line. Omit where
   *  there is nothing to do. */
  onAbuse?: () => void;
};

/** Run the AI-recall + abuse half of the crisis guard on her raw text. */
export function runAiCrisisGuard(text: string, handlers: CrisisGuardHandlers): void {
  if (handlers.onAbuse && scanForAbuse(text)) handlers.onAbuse();
  classifyCrisis(text)
    .then((r) => {
      if (r?.isCrisisMode && r.acuity === 'acute') handlers.onEscalate(r.crisisType);
    })
    .catch(() => {});
}
