import { requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import { ViewStyle } from 'react-native';

const NativeView = requireNativeViewManager('QRScannerView');

export type QRScannerViewProps = {
  active?: boolean;
  onScan?: (event: { nativeEvent: { value: string } }) => void;
  onError?: (event: { nativeEvent: { message: string } }) => void;
  style?: ViewStyle;
};

export function QRScannerView(props: QRScannerViewProps) {
  return <NativeView {...props} />;
}
