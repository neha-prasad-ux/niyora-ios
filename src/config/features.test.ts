// The tripwire for the paywall preview flags.
//
// PAYWALL_PREVIEW renders the wall from a fixture and never mounts StoreKit;
// FORCE_PAYWALL sends every Moon flow to the wall. Both are for looking at the
// design. Either one reaching a build is silent and expensive: with the first
// on, the buy button is wired to nothing and NOBODY CAN EVER SUBSCRIBE, and the
// wall still looks completely normal while that is true. That is not something
// to catch by remembering, so it fails the build instead.

import { FORCE_PAYWALL, PAYWALL_PREVIEW } from './features';

describe('paywall preview flags', () => {
  it('are off, so the wall is wired to the real App Store', () => {
    expect(PAYWALL_PREVIEW).toBe(false);
    expect(FORCE_PAYWALL).toBe(false);
  });
});
