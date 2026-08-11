import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

// At-rest encryption for the sensitive fields of a stored moment (entry/response).
// The 256-bit key lives in the iOS Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY: no
// iCloud/backup sync), never beside the ciphertext in AsyncStorage. Callers stay
// plaintext; only the store touches this.
//
// Construction: AES-256-CBC, one random 16-byte IV per message, IV prepended to
// the ciphertext as `base64(iv):base64(ct)`. CryptoJS default padding is PKCS7.
//
// ponytail: crypto-js (JS AES) not a native/hardware cipher. Fine for at-rest text
// on-device; move to react-native-quick-crypto only if per-write latency shows up.

const KEY_NAME = 'niyora.momentKey';

let keyPromise: Promise<CryptoJS.lib.WordArray> | null = null;

/** The AES key from the Keychain, created once on first use. Cached per session. */
function getKey(): Promise<CryptoJS.lib.WordArray> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const opts = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
      let hex = await SecureStore.getItemAsync(KEY_NAME, opts);
      if (!hex) {
        hex = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex); // 256-bit
        await SecureStore.setItemAsync(KEY_NAME, hex, opts);
      }
      return CryptoJS.enc.Hex.parse(hex);
    })().catch((e) => {
      keyPromise = null; // let a later call retry rather than latch the failure
      throw e;
    });
  }
  return keyPromise;
}

/** Encrypt a plaintext string. Output is JSON/storage-safe (base64:base64). */
export async function encrypt(plain: string): Promise<string> {
  const key = await getKey();
  const iv = CryptoJS.lib.WordArray.random(16);
  const ct = CryptoJS.AES.encrypt(plain, key, { iv });
  return `${CryptoJS.enc.Base64.stringify(iv)}:${ct.ciphertext.toString(CryptoJS.enc.Base64)}`;
}

/** Decrypt a value produced by `encrypt`. Anything that isn't our ciphertext
 *  (legacy plaintext written before encryption existed, dev records) is returned
 *  unchanged rather than throwing, so old records still read. */
export async function decrypt(cipher: string): Promise<string> {
  const sep = cipher.indexOf(':');
  if (sep < 0) return cipher; // not our format → legacy plaintext
  try {
    const key = await getKey();
    const iv = CryptoJS.enc.Base64.parse(cipher.slice(0, sep));
    const ct = CryptoJS.enc.Base64.parse(cipher.slice(sep + 1));
    const plain = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: ct }),
      key,
      { iv },
    ).toString(CryptoJS.enc.Utf8);
    // Wrong key / corrupt / genuinely-plaintext-with-a-colon → empty (or throwing)
    // utf8. Treat empty as failure and fall back to the input. Safe because the
    // store never encrypts an empty entry/response (both are guarded non-empty).
    return plain || cipher;
  } catch {
    return cipher;
  }
}
