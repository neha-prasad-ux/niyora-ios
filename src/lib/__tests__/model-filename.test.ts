// The model filename appears in THREE places and they must agree exactly:
//
//   modules/niyora-gemma/src/index.ts          GEMMA_MODEL_FILENAME
//   modules/niyora-gemma/ios/NiyoraGemmaModule.swift  kLiteRtResource + ext
//   modules/niyora-gemma/scripts/fetch-model.mjs      MODEL_FILENAME
//
// A mismatch does not fail the build. The fetch writes one name, the Swift
// looks up another, Bundle.main returns nil, availability() reports
// modelNotReady, and the app runs fully scripted with no error anywhere. The
// existing comments say "keep in sync"; comments do not keep things in sync.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('model filename agreement', () => {
  const ts = read('modules/niyora-gemma/src/index.ts');
  const swift = read('modules/niyora-gemma/ios/NiyoraGemmaModule.swift');
  const fetch = read('modules/niyora-gemma/scripts/fetch-model.mjs');

  const tsName = /GEMMA_MODEL_FILENAME\s*=\s*'([^']+)'/.exec(ts)?.[1];
  const swiftResource = /kLiteRtResource\s*=\s*"([^"]+)"/.exec(swift)?.[1];
  const swiftExt = /kLiteRtExtension\s*=\s*"([^"]+)"/.exec(swift)?.[1];
  const fetchName = /MODEL_FILENAME\s*=\s*'([^']+)'/.exec(fetch)?.[1];

  it('every source declares a filename', () => {
    expect(tsName).toBeTruthy();
    expect(swiftResource).toBeTruthy();
    expect(swiftExt).toBeTruthy();
    expect(fetchName).toBeTruthy();
  });

  it('TypeScript and the fetch script agree', () => {
    expect(fetchName).toBe(tsName);
  });

  it('Swift resource + extension reconstruct the same name', () => {
    expect(`${swiftResource}.${swiftExt}`).toBe(tsName);
  });

  it('the extension selects a runtime we actually support', () => {
    // .litertlm -> LiteRT-LM, .task -> MediaPipe. Anything else loads nothing.
    expect(['litertlm', 'task']).toContain(tsName?.split('.').pop());
  });
});
