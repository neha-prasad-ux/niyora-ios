import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { TECHNIQUES, isBreathing } from '@/models/techniques';
import {
  clipForLabel,
  introClipsFor,
  type VoiceClip,
} from '@/models/voice-cues';

const VOICE_DIR = join(__dirname, '..', '..', 'assets', 'audio', 'voice');

describe('voice cue mapping', () => {
  it('resolves a clip for every phase label across all breathing techniques', () => {
    const unmapped: string[] = [];
    for (const t of TECHNIQUES) {
      if (!isBreathing(t)) continue;
      for (const phase of t.phases) {
        if (!clipForLabel(phase.label)) {
          unmapped.push(`${t.id}: "${phase.label}"`);
        }
      }
    }
    // If this fails, a technique's phase label changed and its cue went silent —
    // add the label to LABEL_TO_CLIP (or record the matching clip).
    expect(unmapped).toEqual([]);
  });

  it('opens Ocean with the haaa intro and other techniques without it', () => {
    expect(introClipsFor('ocean')).toEqual(['settle', 'intro-ocean', 'begin']);
    expect(introClipsFor('box')).toEqual(['settle', 'begin']);
    expect(introClipsFor('belly')).not.toContain('intro-ocean');
  });

  it('has a bundled audio file for every clip the session can play', () => {
    const used = new Set<VoiceClip>(['well-done']);
    for (const id of ['ocean', 'box']) {
      introClipsFor(id).forEach((c) => used.add(c));
    }
    for (const t of TECHNIQUES) {
      if (!isBreathing(t)) continue;
      for (const phase of t.phases) {
        const clip = clipForLabel(phase.label);
        if (clip) used.add(clip);
      }
    }
    const missing = [...used].filter(
      (clip) => !existsSync(join(VOICE_DIR, `${clip}.m4a`))
    );
    expect(missing).toEqual([]);
  });
});
