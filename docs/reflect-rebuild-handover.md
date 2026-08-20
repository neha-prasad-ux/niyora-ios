# Reflect rebuild — session handover (2026-08-10)

Pick-up doc for the next session. The Niyora "moment" flow was heavily rebuilt over 2026-08-09/10. Everything below is **typecheck-clean and tests pass (488)**; nothing is half-broken. App is running on Neha's iPhone via a dev build.

## What the flow is now

Spine: **Reflect → Regulate → Respond** (the top progress bar). The word "Regulate" is kept deliberately (she chose it over Settle/Steady).

Entry → (AI feeling guess, skipped if she named a feeling) → **reflect card** → optional regulate (settle gate) → respond. The old 0-10 rating and the "Did I get that right?" echo are **gone**. The "Let's work through this together" intro is now **first-run only**.

### Reflect card forms
- **draft** (advise-a-friend, pattern) — one AI line in a violet Moon box.
- **guess** (simpler, also_true) = **the rephrasing**. A display-only, GROWING list of reads. "Show me more" appends more angles (design principle: *more reads = calmer, never pick one*). The "Add context" field **pivots**: clears old reads and regenerates centred on her new text (not append).
- **fact-sort** (fact_or_fear, know_or_guess) — split her thought into claims, sort each **Fact / Feeling** (two buttons), then reads softened + a facts help line + a bounded reflect chat.
- **middle** (all-or-nothing) and **whose_weight** are now guess-mode content cards. `whose_weight` MERGED the old `yours_to_move` → **"How much of this can you actually work on?"** (can/can't reads). `middle` → middle-ground reads.
- **reflect-more chat** — bounded, crisis-guarded per message, always returns a NEW angle (never a bare question), gently lands after 3 turns. Reached via "Try a different way" once the routed cards run out, and on the fact-sort result.

### UI rules locked
- Primary CTA **always at the bottom** (footer), content in the scrolling body.
- Primary + secondary **side by side** (Different way | Ready to regulate). Act screen: Save-for-later + Share **stacked, no gap** (`stackTight`).
- Glass darkened for readability: `BlurView intensity 72`, `glassTint rgba(10,8,16,0.72)`, read-boxes `rgba(34,27,54,0.66)`.
- Compact chat field = single inline row, send button inside; **the flex spacer must be dropped in compact** or the input width collapses and it becomes un-tappable.
- `moon` type scale = 4 sizes (12/16/20/26). One off-scale straggler: the `WhyLine` subtitle at 14.

## Privacy — the important fix
`src/lib/pii.ts` (scrub/restore, tested) **existed but was never wired** — user text was going to Gemini raw. Now wired into `callGemini` in `src/lib/moment-gemini.ts` as the single choke point (covers reflection + crisis check). The launch checklist had marked this done prematurely. There is **no** passcode/PIN "lock" feature — "hide code" meant this scrub path.

## Pending (next session)
All three of the queued items are now wired (2026-08-10). Typecheck-clean, 740 tests pass. Awaiting Neha's reaction on the phone.

1. **Context gate** — DONE. `hasConcreteEvent` is fired at `send()` (raw_entry clear branch only, so a clarify-path send never re-gates → no loop) into `eventGate.current`, then consumed under the first reflect card's spinner by a dedicated effect. A confident `false` reroutes to `clarify` with `clarifyMoreContext` (the `more-context` copy); yes / null / timeout / AI-off proceed. The consume effect's cleanup alive-flag cancels a late reroute if she advances past card 0 or validates/edits it. Files: `send`, the `eventGate` ref, the gate effect (just after the reflect-card content effect).
2. **Middle spectrum visual** — DONE. Scoped to `id === 'middle'` in the guess render: a vertical Good↔Bad `LinearGradient` track (green→violet→rose) on the left, her middle reads centred in the band beside it. Styles: `spectrum*`. Other guess cards keep the plain stack. First pass — poles are literally "Good"/"Bad", expect her to tune wording.
3. **Feelings AI ranking** — already wired (was done before this session). `pick(provider, 'feelings', …)` ranks the closed `FEELING_SET`, `pinFeeling` protects a word she named outright, `offerFeelings` is the deterministic (text-seeded) fallback. The `feelings` slot instruction is detailed. Left as-is.

## Key files
- `src/v3/reflect-cards.ts` — card catalog, routing (`routeCards`/`detectSignals`), shared copy (FEELING_GUESS, SETTLE, PMS_NOTE, FACTSORT, REFLECT_CYCLE_NOTE).
- `src/app/moment.tsx` — the whole flow (~4000 lines). `case 'reflect'` renders the cards.
- `src/lib/moment-gemini.ts` — live prompts (`VOICE`, `REFLECT_SAFETY`, `SLOT_INSTRUCTION`), `callGemini`. Source of truth for prompts (docs/moon-gemini-prompts.md is intent-only).
- `src/v3/moment-ai.ts` — verbs (echo, pick, reflectCard, factSort/factSortAdvise, reflectChat, hasConcreteEvent).
- `src/v3/moment-analyse.ts` — `analyse` (crisis/clear/unclear gate), `offerFeelings`, FEELING_SET.
- `src/lib/pii.ts` — the scrub. `src/store/*` — intro-seen, moment-plan (save-for-later remindAt), etc.

## Running it on the iPhone
- Signed as the **real** `com.niyora.app` under org team `865S8DL9Y9` (Apple ID `neha@niyora.com` is in Xcode Accounts).
- Metro: `npx expo start --dev-client --port 8081` from the repo. **Reload on the phone via shake → Reload** (the Mac can't push a reload for a dev client). `const`/AI-file changes need a full reload; `moment.tsx` hot-reloads.
- macOS Ruby 4.0.5 breaks CocoaPods unless `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.
- First-time device build needs Developer Mode ON on the phone + it must finish "Preparing" before `xcodebuild` will target it.

## Working style with Neha (from this session)
Terse, fast, hands-on; she designs, you lead dev and challenge. No jargon (she cut "regulate"-adjacent clinical words but kept Regulate itself), no em dashes, normal capitalization, cycle-health framing (never "harder days"). She reacts to live screenshots and iterates quickly — build, typecheck, tell her to reload, repeat.
