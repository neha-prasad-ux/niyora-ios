import { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NiyoraSync, SyncState } from 'niyora-sync';
import { colors } from '@/theme/colors';

type Props = {
  visible: boolean;
  syncState: SyncState;
  onClose: () => void;
};

export function QRPairingModal({ visible, syncState, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  // Guard against firing pairWithQR repeatedly while the camera keeps decoding
  // the same code frame after frame.
  const handledRef = useRef(false);

  const isScanning =
    syncState.state === 'unpaired' || syncState.state === 'failed';

  // Ask for camera access when the sheet opens; reset the one-shot scan guard
  // each time it opens.
  useEffect(() => {
    if (!visible) return;
    handledRef.current = false;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {});
    }
  }, [visible, permission, requestPermission]);

  // Allow another scan if pairing fell back to a scannable state.
  useEffect(() => {
    if (isScanning) handledRef.current = false;
  }, [isScanning]);

  function handleBarcode(result: { data: string }) {
    if (handledRef.current || !isScanning) return;
    handledRef.current = true;
    NiyoraSync.pairWithQR(result.data).catch(() => {
      handledRef.current = false;
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Pair with your Mac</Text>
        <Text style={styles.subtitle}>
          Open Niyora on your Mac and point this camera at the QR code.
        </Text>

        <View style={styles.scanner}>
          {visible && permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={isScanning ? handleBarcode : undefined}
            />
          ) : (
            <View style={styles.permission}>
              <Text style={styles.permissionText}>
                {permission && !permission.canAskAgain
                  ? 'Camera access is off. Enable it in Settings to scan.'
                  : 'Camera access is needed to scan the QR code.'}
              </Text>
              {permission?.canAskAgain !== false && (
                <Pressable
                  style={styles.permissionBtn}
                  onPress={() => requestPermission().catch(() => {})}
                >
                  <Text style={styles.permissionBtnText}>Allow camera</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {syncState.state === 'connecting' && (
          <Text style={styles.status}>Connecting...</Text>
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
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  permissionText: {
    color: colors.textSubtitle,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: colors.backgroundTop,
  },
  permissionBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    color: colors.textSubtitle,
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  success: { color: '#5FFFB5' },
  error: { color: '#FF6B6B' },
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
