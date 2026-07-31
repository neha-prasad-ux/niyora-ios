// Speak-to-type for the entry (Neha 2026-07-31). Wraps expo-speech-recognition:
// tap to start, tap to stop; each finished phrase is handed back so the caller
// can append it to the field. On-device where iOS supports it; nothing is stored
// by us. Needs a dev-client rebuild after install (native module).
import { useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export function useDictation(onPhrase: (text: string) => void) {
  const [listening, setListening] = useState(false);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('error', () => setListening(false));
  useSpeechRecognitionEvent('result', (e) => {
    // Only commit finished phrases, so interim guesses don't churn the field.
    if (!e.isFinal) return;
    const t = e.results?.[0]?.transcript?.trim();
    if (t) onPhrase(t);
  });

  const toggle = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) return;
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
  };

  return { listening, toggle };
}
