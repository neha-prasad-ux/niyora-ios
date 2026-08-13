// The type-aware crisis / safety sheet, shared by every surface that can hand
// off (moment, rough-moment, WriteView). ONE component so the copy, the numbers
// and the DV-vs-suicide branch can never drift per screen -- it removes the
// former 3-way duplication of this sheet.
//
// Branch (audit H-1): an ACUTE violence / child-harm escalation (crisisType
// violence_to_her | child_harmed) shows the DV / safety resources; everything
// else -- including the keyword floor, which is suicide-shaped and leaves
// crisisType null -- shows the 988 suicide screen. Copy and numbers live in
// crisis-scan.ts beside their open* handlers, so a line can never dial the wrong
// place.
//
// Renders the inner block only (title, body, tappable lines, emergency). The
// surface provides the surrounding container and its own CTA (rephrase / close),
// because those differ per screen.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CRISIS_COPY,
  DV_CRISIS_COPY,
  HARM_OTHER_CRISIS_COPY,
  openCrisisLine,
  openDvCrisisLine,
  openHarmOtherCrisisLine,
} from '@/lib/crisis-scan';
import type { CrisisType } from '@/lib/moment-gemini';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';

export function CrisisSheet({ crisisType }: { crisisType: CrisisType | null }) {
  // Three branches: harm-to-other (de-escalation, never coach) → its own screen;
  // acute violence/child-harm → the DV/safety screen; everything else (incl. the
  // suicide-shaped keyword floor) → the 988 screen.
  const isHarmOther = crisisType === 'harm_to_other';
  const isDv = crisisType === 'violence_to_her' || crisisType === 'child_harmed';
  const copy = isHarmOther ? HARM_OTHER_CRISIS_COPY : isDv ? DV_CRISIS_COPY : CRISIS_COPY;
  const openLine = isHarmOther ? openHarmOtherCrisisLine : isDv ? openDvCrisisLine : openCrisisLine;
  return (
    <View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      {copy.lines.map((line, i) => (
        <Pressable
          key={line.label}
          style={styles.line}
          onPress={() => openLine(i)}
          accessibilityRole="button"
          accessibilityLabel={`${line.label}. ${line.detail}`}
        >
          <Text style={styles.lineLabel}>{line.label}</Text>
          <Text style={styles.lineDetail}>{line.detail}</Text>
        </Pressable>
      ))}
      <Text style={styles.emergency}>{copy.emergency}</Text>
    </View>
  );
}

// Mirrors the resource-sheet look already used in rough-moment.tsx (which itself
// matches the Soul tab's sheet), so the one surface she may have seen before
// looks the same when it matters most.
const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  line: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
    marginBottom: spacing.sm,
  },
  lineLabel: { fontFamily: fonts.medium, fontSize: fontScale.bodyLg, color: colors.textPrimary },
  lineDetail: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  emergency: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 18,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
