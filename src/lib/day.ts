/** Today's calendar day as YYYY-MM-DD, in the phone's timezone.
 *
 *  `new Date().toISOString().slice(0, 10)` is UTC, so east of Greenwich a
 *  late-night entry files under tomorrow. That is a silent off-by-one, and once
 *  moments are aligned to a cycle day it lands the entry in the wrong day of the
 *  cycle. Everything that stamps a `date` field goes through here. */
export function localYmd(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
