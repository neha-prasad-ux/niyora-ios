import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
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
        <View style={styles.card}>
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
        </View>
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 14,
  },
  connectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.beginStart,
    borderWidth: 1,
    borderColor: colors.beginBorder,
  },
  connectLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#141220',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  sheetSub: {
    color: colors.textSubtitle,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  sas: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
    paddingVertical: 4,
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  cancelLabel: {
    color: colors.textTertiary,
    fontSize: 13,
  },
});
