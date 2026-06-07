import { requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import { ViewStyle } from 'react-native';

// Load the native view defensively. requireNativeViewManager throws at import
// time if the module isn't in this binary, and this file is re-exported from
// the package index — so an uncaught throw here crashes every screen that
// imports niyora-sync. Fall back to null so the app runs without QR scanning.
let NativeView: React.ComponentType<QRScannerViewProps> | null = null;
try {
  NativeView = requireNativeViewManager('QRScannerView');
} catch {
  NativeView = null;
}

export type QRScannerViewProps = {
  active?: boolean;
  onScan?: (event: { nativeEvent: { value: string } }) => void;
  onError?: (event: { nativeEvent: { message: string } }) => void;
  style?: ViewStyle;
};

export function QRScannerView(props: QRScannerViewProps) {
  if (!NativeView) return null;
  return <NativeView {...props} />;
}
