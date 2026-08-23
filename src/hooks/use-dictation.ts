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
  // The in-progress utterance, updated on every interim result so the caller can
  // show words appear live (proof the mic is on) rather than only after a pause.
  const [partial, setPartial] = useState('');

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setPartial('');
  });
  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    setPartial('');
  });
  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results?.[0]?.transcript ?? '';
    if (e.isFinal) {
      // Phrase settled: commit it and clear the live preview.
      setPartial('');
      const trimmed = t.trim();
      if (trimmed) onPhrase(trimmed);
    } else {
      // Live interim transcript, shown as she speaks.
      setPartial(t);
    }
  });

  const toggle = async () => {
    if (listening) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        setListening(false);
      }
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) return;
    // Guard the native start: an unavailable recognizer / unsupported locale
    // throws synchronously, which would otherwise surface as an uncaught error.
    try {
      // continuous: keep listening across pauses so she can speak more than one
      // sentence without re-tapping; she stops it herself with the mic button.
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
    } catch {
      setListening(false);
    }
  };

  return { listening, partial, toggle };
}
