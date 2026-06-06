import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { NiyoraSync, QRScannerView, SyncState } from 'niyora-sync';
import { colors } from '@/theme/colors';

type Props = {
  visible: boolean;
  syncState: SyncState;
  onClose: () => void;
};

export function QRPairingModal({ visible, syncState, onClose }: Props) {
  function handleScan(event: { nativeEvent: { value: string } }) {
    NiyoraSync.pairWithQR(event.nativeEvent.value).catch(() => {});
  }

  const isScanning = syncState.state === 'unpaired' || syncState.state === 'failed';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Pair with your Mac</Text>
        <Text style={styles.subtitle}>
          Open Niyora on your Mac and point this camera at the QR code.
        </Text>

        <View style={styles.scanner}>
          <QRScannerView
            active={visible && isScanning}
            onScan={handleScan}
            onError={() => {}}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {syncState.state === 'connecting' && (
          <Text style={styles.status}>Connecting...</Text>
        )}
        {syncState.state === 'awaiting_response' && (
          <Text style={styles.status}>Waiting for Mac confirmation...</Text>
        )}
        {syncState.state === 'paired' && (
          <Text style={[styles.status, styles.success]}>Paired!</Text>
        )}
        {syncState.state === 'failed' && (
          <Text style={[styles.status, styles.error]}>{syncState.message}</Text>
        )}

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>
            {syncState.state === 'paired' ? 'Done' : 'Cancel'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundMid,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 32,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSubtitle,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  scanner: {
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  status: {
    color: colors.textSubtitle,
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  success: { color: '#5FFFB5' },
  error:   { color: '#FF6B6B' },
  closeBtn: {
    marginTop: 'auto',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 100,
    backgroundColor: colors.backgroundTop,
  },
  closeTxt: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
