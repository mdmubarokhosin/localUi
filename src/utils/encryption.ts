/**
 * AES-GCM encryption utility using the Web Crypto API.
 * Provides simple encrypt/decrypt functions for string data.
 */

const DEFAULT_PASSWORD = 'llama-ui-default-key';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_ITERATIONS = 310_000;

/**
 * Derives a CryptoKey from a password string using PBKDF2.
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM.
 *
 * @param plaintext - The string to encrypt.
 * @param password - Optional password. Defaults to the app password.
 * @returns A base64-encoded string containing the salt + IV + ciphertext.
 */
export async function encrypt(
  plaintext: string,
  password?: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password ?? DEFAULT_PASSWORD, salt);
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt + iv + ciphertext into a single Uint8Array
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded AES-GCM ciphertext back to the original plaintext.
 *
 * @param ciphertext - The base64 string produced by {@link encrypt}.
 * @param password - Optional password. Must match the one used for encryption.
 * @returns The decrypted plaintext string.
 * @throws Error if decryption fails (wrong password or corrupted data).
 */
export async function decrypt(
  ciphertext: string,
  password?: string
): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) =>
    c.charCodeAt(0)
  );

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const data = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password ?? DEFAULT_PASSWORD, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
