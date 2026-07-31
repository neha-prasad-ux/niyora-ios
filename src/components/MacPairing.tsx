import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { radius, spacing } from '@/theme/spacing';
import { fontScale } from '@/theme/typography';
import type { SyncState } from '@/hooks/use-niyora-sync';

type Props = {
  syncState: SyncState;
  discoveredServers: string[];
  connectToMac: (name: string) => void;
  cancelPairing: () => void;
};

/**
 * Tap-and-approve pairing affordance for My Soul. Lists Macs found on the
 * wifi; tapping one starts the Noise handshake. While the Mac user decides,
 * the same number shows here and on the Mac for the glance-to-confirm.
 */
export function MacPairing({
  syncState,
  discoveredServers,
  connectToMac,
  cancelPairing,
}: Props) {
  const overlayVisible =
    syncState.state === 'connecting' ||
    syncState.state === 'awaiting_approval' ||
    syncState.state === 'failed';

  return (
    <>
      {discoveredServers.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.title}>Connect to your Mac</Text>
          {discoveredServers.map((name) => (
            <View key={name} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Pressable
                style={styles.connectBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  connectToMac(name);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Connect to ${name}`}
              >
                <Text style={styles.connectLabel}>Connect</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Modal
        visible={overlayVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelPairing}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {syncState.state === 'connecting' && (
              <>
                <Text style={styles.sheetTitle}>Connecting to your Mac</Text>
                <Text style={styles.sheetSub}>Just a moment.</Text>
              </>
            )}
            {syncState.state === 'awaiting_approval' && (
              <>
                <Text style={styles.sheetTitle}>Check your Mac</Text>
                <Text style={styles.sas}>{syncState.sas}</Text>
                <Text style={styles.sheetSub}>
                  Click Allow on your Mac if this number matches.
                </Text>
              </>
            )}
            {syncState.state === 'failed' && (
              <>
                <Text style={styles.sheetTitle}>Could not pair</Text>
                <Text style={styles.sheetSub}>{syncState.message}</Text>
              </>
            )}
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                Haptics.selectionAsync();
                cancelPairing();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.cancelLabel}>
                {syncState.state === 'failed' ? 'Close' : 'Cancel'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Surface (bg, padding, radius, border, bottom margin) comes from <Card>;
  // this only adds the inner gap between the title and the Mac rows.
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontScale.body,
    fontFamily: fonts.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(150, 200, 255, 0.9)',
  },
  name: {
    flex: 1,
    color: colors.textTertiary,
    fontSize: fontScale.body,
  },
  connectBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.beginStart,
    borderWidth: 1,
    borderColor: colors.beginBorder,
  },
  connectLabel: {
    color: colors.textPrimary,
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.faint,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: fontScale.emphasis,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  sheetSub: {
    color: colors.textSubtitle,
    fontSize: fontScale.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  sas: {
    color: colors.textPrimary,
    fontSize: 40,
    fontFamily: fonts.light,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    paddingVertical: spacing.xs,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.base,
  },
  cancelLabel: {
    color: colors.textTertiary,
    fontSize: fontScale.caption,
  },
});
