// Pure logic for the fill-in template, kept free of react-native imports so it
// stays unit-testable (the view lives in fill-in.tsx and re-exports these).

/** One blank in the sentence. `key` is stable; `placeholder` shows in the dashed
 *  slot until she fills it; `suggestions` are the tap-to-fill chips. */
export type Blank = { key: string; placeholder?: string; suggestions?: string[] };
/** A template is plain-text runs and blanks, in reading order. */
export type TemplatePart = string | Blank;

export const isBlank = (p: TemplatePart): p is Blank => typeof p !== 'string';

/** Assemble the finished sentence. Empty blanks fall back to their placeholder so
 *  the text always reads as a whole, never "I feel  when". */
export function assemble(parts: TemplatePart[], values: Record<string, string>): string {
  return parts
    .map((p) => (isBlank(p) ? values[p.key]?.trim() || p.placeholder || '…' : p))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
