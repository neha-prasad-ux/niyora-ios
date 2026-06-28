/**
 * Global enforcement of two design-system text rules.
 *
 * 1. All text is Poppins. If a style already names a fontFamily we respect it;
 *    otherwise we derive the family from the style's fontWeight (see
 *    weightToFamily), defaulting to Poppins-Regular. Nothing ever falls back to
 *    the system font, even if an individual style forgets `fontFamily`.
 *
 * 2. Every text starts with a capital. We uppercase the first letter of each
 *    <Text>'s leading string so copy reads as sentence case without restating
 *    the rule at every call site (or capitalising ~80 data strings by hand).
 *    Only the first character is touched: "calms under pressure" -> "Calms
 *    under pressure", while "5 things you can see" and already-capital strings
 *    are left alone. Nested <Text> children re-enter this same patched render,
 *    so each composed segment capitalises its own start correctly.
 *
 * Both are applied by wrapping the render of React Native's <Text> (and
 * <TextInput>, font only). Import this once, for its side effect, at the app
 * root (src/app/_layout.tsx) before anything renders.
 */
import { cloneElement } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { weightToFamily } from './fonts';

// Uppercase the first letter of a string, skipping leading whitespace. Leaves
// the string untouched when its first non-space character is not a lowercase
// a–z (digits, symbols, already-capital letters), so only sentence starts that
// need it get capitalised.
function leadCap(s: string): string {
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ' ' || ch === '\n' || ch === '\t') continue;
    if (ch >= 'a' && ch <= 'z') {
      return s.slice(0, i) + ch.toUpperCase() + s.slice(i + 1);
    }
    return s;
  }
  return s;
}

// Capitalise the leading string of a <Text>'s children. Returns the new
// children when something changed, or undefined to leave them as-is. A single
// string child is capped directly; for an array we only touch the first child
// when it is a string (a leading element is itself a <Text> that will cap its
// own start via this same patch).
function capChildren(children: unknown): unknown {
  if (typeof children === 'string') {
    const next = leadCap(children);
    return next === children ? undefined : next;
  }
  if (Array.isArray(children) && typeof children[0] === 'string') {
    const next = leadCap(children[0]);
    if (next === children[0]) return undefined;
    return [next, ...children.slice(1)];
  }
  return undefined;
}

function patch(Component: unknown, capitalize: boolean): void {
  const C = Component as {
    render?: (...args: unknown[]) => any;
    __poppinsPatched?: boolean;
  };
  if (!C || C.__poppinsPatched || typeof C.render !== 'function') return;

  const original = C.render;
  C.render = function patchedRender(...args: unknown[]) {
    const element = original.apply(this, args);
    if (!element || !element.props) return element;

    const flat = (StyleSheet.flatten(element.props.style) ?? {}) as {
      fontFamily?: string;
      fontWeight?: number | string;
    };
    const fontFamily = flat.fontFamily ?? weightToFamily(flat.fontWeight);

    // Append last so the chosen family applies; since `fontFamily` already
    // honours an explicit family, this never overrides an intentional choice.
    const props: Record<string, unknown> = {
      style: [element.props.style, { fontFamily }],
    };
    if (capitalize) {
      const capped = capChildren(element.props.children);
      if (capped !== undefined) props.children = capped;
    }
    return cloneElement(element, props);
  };
  C.__poppinsPatched = true;
}

patch(RNText, true);
patch(RNTextInput, false);
