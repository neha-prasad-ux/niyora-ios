/**
 * Global enforcement of the "all text is Poppins" design-system rule.
 *
 * Wraps the render of React Native's <Text> and <TextInput> so that every text
 * node gets a Poppins family. If a style already names a fontFamily we respect
 * it; otherwise we derive the family from the style's fontWeight (see
 * weightToFamily), defaulting to Poppins-Regular. This guarantees nothing ever
 * falls back to the system font, even if an individual style forgets
 * `fontFamily`.
 *
 * Import this once, for its side effect, at the app root (src/app/_layout.tsx)
 * before anything renders.
 */
import { cloneElement } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { weightToFamily } from './fonts';

function patch(Component: unknown): void {
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
    return cloneElement(element, {
      style: [element.props.style, { fontFamily }],
    });
  };
  C.__poppinsPatched = true;
}

patch(RNText);
patch(RNTextInput);
