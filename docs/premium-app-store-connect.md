# Niyora Premium: setting up the subscriptions in App Store Connect

Everything you have to type is on this page. Work top to bottom.

The app is already built for this. The code reads two product IDs from
`src/lib/premium.ts` and asks StoreKit for their prices at runtime, so nothing in
the app changes when you create these products. If a name or a number on this page
ever disagrees with the code, the code wins.

What the app expects:

| Thing | Value | Where it comes from |
| --- | --- | --- |
| Bundle ID | `com.niyora.app` | `app.json` |
| Monthly product ID | `com.niyora.premium.monthly` | `src/lib/premium.ts` |
| Yearly product ID | `com.niyora.premium.yearly` | `src/lib/premium.ts` |
| Free Moon flows per calendar month | 5 | `FREE_MOMENTS_PER_MONTH` |
| Current shipped version | 3.0.0 | `app.json` |

---

## 1. Do this first, or nothing else works

**The Paid Applications agreement has to be active before anything on this page is
possible.**

It lives in the Business section of App Store Connect. It has three parts, and all
three have to be complete and accepted:

1. The Paid Applications agreement itself, accepted.
2. Bank details for where the money lands.
3. Tax forms for every region you want to sell in. The US form is the one that
   blocks payouts most often.

Why this is first: until the agreement shows as active, you cannot create paid
products at all, and even if a product existed, StoreKit would return an empty list
and the paywall would show no prices. This is the single most common reason a
paywall looks broken.

**Only you can do this.** It needs your legal name, your bank account, and your tax
identity. Nobody can do it for you and it should not be handed to anyone else.

Expect it to take a day or two to flip to active after you submit everything. Start
it before you need it.

While you wait, you can still do all of section 9's first testing path, because the
local StoreKit file needs no App Store Connect setup at all.

---

## 2. Create one subscription group

Both plans go in **one** group. That is not cosmetic. A group is what lets someone
move from monthly to yearly without buying twice, and it is what makes the two plans
mutually exclusive. Two groups would let a person hold both at once and pay you
twice for the same thing.

In the app's page in App Store Connect, find the subscriptions area and create a
group.

| Field | What to enter |
| --- | --- |
| Reference name (internal, not shown to users) | `Niyora Premium` |

You will also be asked for a group display name that users can see. That is section
6 below. Do the two subscriptions first if the flow lets you.

---

## 3. Create the two subscriptions

Inside that one group, create two subscriptions. Type these exactly. The product ID
in particular is matched character for character by the app, and it can never be
changed or reused once created.

| Field | Monthly | Yearly |
| --- | --- | --- |
| Reference name (internal) | `Premium Monthly` | `Premium Yearly` |
| Product ID | `com.niyora.premium.monthly` | `com.niyora.premium.yearly` |
| Duration | 1 month | 1 year |
| Price (US) | $8.99 | $29.99 |
| Family Sharing | Off | Off |

Notes:

- Set the price for the United States. App Store Connect will propose prices for
  every other country from that. Accept the proposal unless you have a reason not
  to. The app never hardcodes a price, it prints whatever StoreKit hands back in
  the person's own currency.
- The paywall works out the yearly saving itself from the two live prices, so you
  do not have to write "save 72%" anywhere. If you change a price later, the number
  on the paywall follows on its own.
- Leave Family Sharing off. Premium is a personal subscription and turning sharing
  on later is allowed, turning it off later is not.

---

## 4. The introductory offer: 7 days free, yearly only

Add an introductory offer to the **yearly** subscription only. The monthly plan gets
no offer.

| Field | Value |
| --- | --- |
| Product | `com.niyora.premium.yearly` |
| Type of offer | Free (a free trial, not a discounted price) |
| Duration | 7 days. If the durations are offered as a list, 1 week is the 7 day option |
| Who it applies to | New subscribers only |
| Countries | All the countries the subscription is available in |
| Start date | Today, or the day you plan to ship |
| End date | Leave it open ended |

Why yearly only: the trial is there to make a year feel safe to commit to. On a
monthly plan a trial mostly just delays the first payment by a month.

One thing to expect: the paywall's button text is generated from whatever StoreKit
says the trial is, never from text typed into the app. If StoreKit reports the trial
as one week, the button will read "Start 1 week free" rather than "Start 7 days
free". Both are the same seven days. This is deliberate, because claiming a trial
the store will not honour is a review rejection.

---

## 5. Localization for each subscription

Each subscription needs at least one language, English (U.S.), with a display name
and a description. This text is shown to real people, in the App Store subscription
sheet and in their Apple Account subscription settings.

Rules Apple enforces: the display name has a 30 character limit, the description has
a 45 character limit. Do not put a price in either, Apple shows the price itself.

Paste these.

**Monthly**

- Display name: `Niyora Premium, monthly`
- Description: `The Moon flow whenever you need it.`

**Yearly**

- Display name: `Niyora Premium, yearly`
- Description: `The Moon flow whenever you need it.`

These match the names already in `Niyora.storekit`, so what you see while
testing locally is what a real buyer sees.

---

## 6. Group display name and the review screenshot

**Group display name.** The group needs its own name shown to users, separate from
the two plan names. Use:

```
Niyora Premium
```

Some flows also ask for a short group level description or a "subscription group
display name" per language. If you are asked for a sentence, use:

```
The Moon flow whenever you need it.
```

**Review screenshot.** Every subscription needs one image attached for App Review.
It is never shown to users. It exists so a reviewer can see the screen where the
thing is bought.

Both subscriptions can use the same image: a screenshot of the Niyora paywall.

How to get a clean one without writing five real moments first:

1. In `src/config/features.ts`, temporarily set `PAYWALL_PREVIEW = true`.
2. Run the app, open the paywall, take a screenshot.
3. **Set it back to `false`.** There is a test that fails while it is on, so a
   forgotten flag cannot reach a build, but set it back anyway.

A normal iPhone screenshot is the right size. Upload it to each of the two
subscriptions.

---

## 7. App Review notes

There is a review notes field on the app version, and the subscriptions also carry a
review notes field. Paste this into both. It is written to answer the two questions
a reviewer actually has: what am I buying, and how do I see it.

```
Niyora Premium unlocks one thing: the Moon flow, an AI guided reflection
used when something has upset her.

Every person gets 5 Moon flows free per calendar month. Past the 5th, the
Moon flow asks for Premium. The count resets at the start of each month.

Everything else in the app is free and always will be: breathing sessions,
period tracking, PMS content, the Train section, the stories, and her whole
saved history in My Soul. Premium never gates anything she has already
written.

To reach the paywall: open the app, start a Moon flow from the home screen,
and complete it. Do that 5 times. The 6th attempt to open the Moon flow
shows the Premium screen. The Premium screen can also be reached by
choosing to subscribe from that prompt.

Two plans, in one subscription group, so a subscriber can switch between
them: monthly at $8.99, and yearly at $29.99 with a 7 day free trial for
new subscribers.

Purchases go through StoreKit only. There is no account, no login, and no
server. Nothing about a purchase leaves the device, which is why the app
declares No Data Collected.

Restore Purchases is on the Premium screen.
```

If a reviewer needs a faster route than writing five reflections, say so in the
version notes and offer to provide a build with the gate forced open. Do not ship
that build.

---

## 8. Before you submit

Work down this list. Every item here has bitten someone.

| Check | Why it matters |
| --- | --- |
| Paid Applications agreement shows as active, banking and tax complete | Without it, StoreKit returns nothing and the paywall shows no prices |
| Both subscriptions show a status of Ready to Submit (or already Approved) | A product still in Missing Metadata is invisible to StoreKit, so the paywall says Premium is unavailable |
| `PAYWALL_PREVIEW` is `false` in `src/config/features.ts` | True means the paywall renders fake prices and nobody can buy |
| `FORCE_PAYWALL` is `false` in `src/config/features.ts` | True means every Moon flow is blocked, including the free ones |
| `niyora.com/terms` loads | The paywall links to it, and Apple requires reachable terms for a subscription |
| `niyora.com/privacy` loads | Same, and the paywall links to it |
| Both pages actually describe the subscription | They must state the plans, the price, that it auto renews, and how to cancel. A terms page that says nothing about subscriptions is a rejection |
| Product IDs match the code exactly | `com.niyora.premium.monthly` and `com.niyora.premium.yearly` |
| The version you submit is a new build, not 3.0.0 | 3.0.0 is already live and has no paywall in it |

One more thing about timing: the first paid product an app ever offers generally has
to go through review attached to an app version, not on its own. So plan to submit
the two subscriptions together with the next build, and make sure they are selected
as part of that version's submission. After the first approval, later product changes
can usually be reviewed on their own.

---

## 9. How to test, before any of this is approved

There are two completely different ways to test a purchase, they behave differently,
and mixing them up is the usual reason someone spends an afternoon confused. Read
both before starting.

### Path A: the local StoreKit file, no App Store Connect at all

`Niyora.storekit` lives at the repo root, NOT inside `ios/`, because `/ios` is
gitignored and is regenerated by a prebuild, which silently deletes anything put
there. It already contains both products, both prices, and the 7 day
trial on the yearly plan. The Xcode scheme already points at it. Buying with it costs
nothing and touches no Apple servers.

**This works only when the app is launched from Xcode.**

1. Open `ios/Niyora.xcworkspace` in Xcode.
2. Product, then Run.

**It does not work with `expo run:ios`.** That command installs the app onto the
simulator with `simctl`, and an install done that way ignores the scheme entirely,
so the StoreKit configuration attached to the scheme never applies. The app launches,
asks for products, gets nothing, and the paywall says Premium is unavailable. Nothing
is broken, you just launched it the wrong way for this test.

If the paywall still shows no prices from a Run in Xcode, check that the Run action
of the scheme still has `Niyora.storekit` selected as its StoreKit configuration.
The setting lives in the scheme's Run settings, on the options side.

Use this path for: does the paywall render, does the yearly plan show the trial, does
a purchase open the gate, does Restore work, does the saving percentage look right.
This is where almost all of your testing should happen.

### Path B: a Sandbox Apple Account, real products, real device

This one tests the actual products you created above, so it only works after they
exist in App Store Connect and reach Ready to Submit, and after the agreement is
active.

1. Create a sandbox test account in the Users and Access area of App Store Connect,
   in its sandbox testers section. Use an email address you control that has never
   been used for an Apple Account.
2. On a physical iPhone, sign that sandbox account in through the Settings app, in
   the developer options section, where sandbox accounts are listed. Do not sign it
   into the main Apple Account settings.
3. Install a build on that device and buy through the paywall. You will be asked to
   confirm with the sandbox account. No money moves.

Two things to know about sandbox subscriptions: they renew on a heavily compressed
clock, so a monthly plan renews in minutes, and they auto cancel after a handful of
renewals. That is expected, not a bug.

Use this path for: confirming the real product IDs, prices, and trial come back from
Apple's servers, and that a purchase completes end to end. Once, near the end.

---

## 10. When something goes wrong

The most common symptom by far is the paywall saying Premium is unavailable, which
means the product fetch came back empty. Here is what that actually means, in the
order worth checking.

| What you see | What it usually is |
| --- | --- |
| Paywall shows no prices, on a simulator run started with `expo run:ios` | The local StoreKit file is not applied. Launch from Xcode with Product, then Run |
| Paywall shows no prices, on a real device or TestFlight | The Paid Applications agreement is not active yet, including banking and tax |
| Paywall shows no prices, agreement is fine | One or both products are not Ready to Submit. A product in Missing Metadata is invisible to StoreKit |
| One plan shows a price, the other does not | A typo in one product ID, or one of the two is missing its localization |
| Nothing at all, and the app was installed on a device from a different signing setup | The bundle ID on the build does not match `com.niyora.app`, so it is asking about products that belong to no app |
| The trial does not appear on the yearly plan | The introductory offer was not created, was created on the monthly plan, or its start date is in the future |
| Trial appears but reads "1 week" instead of "7 days" | Expected. The label comes from StoreKit, not from the app |
| Every Moon flow goes straight to the paywall, even the first | `FORCE_PAYWALL` is still `true` in `src/config/features.ts` |
| Prices look fake and buying does nothing | `PAYWALL_PREVIEW` is still `true` in `src/config/features.ts` |
| Purchase succeeds but the gate stays shut | Rare. The app opens the gate immediately on a successful purchase and caches the answer, so this points at the purchase not actually completing. Check whether the transaction finished |
| Sandbox purchase asks for a password over and over | The sandbox account was signed into the main Apple Account settings instead of the sandbox section |

A note on the app's behaviour that will save you a scare: if the App Store is
unreachable, the app keeps the last answer it had. A paying subscriber does not lose
access on a plane. So a subscriber who briefly has no network is not evidence that
anything is broken.
