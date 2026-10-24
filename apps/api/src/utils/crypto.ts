import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * SHA-256 hash helper
 */
export const hashSha256 = (value: string): string => {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
};

/**
 * AES-256-GCM Encryption
 * Encrypts plaintext string using 32-byte hex encryption key
 * Returns format: iv:authTag:ciphertext (all in hex)
 */
export const encryptAes256Gcm = (
  plaintext: string,
  hexKey: string = env.ENCRYPTION_KEY
): string => {
  const key = Buffer.from(hexKey, 'hex');
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
};

/**
 * AES-256-GCM Decryption
 * Decrypts string from format: iv:authTag:ciphertext
 */
export const decryptAes256Gcm = (
  encryptedStr: string,
  hexKey: string = env.ENCRYPTION_KEY
): string => {
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = Buffer.from(hexKey, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

/**
 * Generates a fresh 2048-bit RSA keypair for DKIM.
 * Strips PEM headers & whitespace from public key so it can be used directly in DNS TXT records.
 */
export const generateDkimKeyPair = (): {
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyDnsTxt: string;
} => {
  const { publicKey: publicKeyPem, privateKey: privateKeyPem } = crypto.generateKeyPairSync(
    'rsa',
    {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    }
  );

  // Strip PEM headers, footers, carriage returns, and newlines
  const publicKeyDnsTxt = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');

  return {
    publicKeyPem,
    privateKeyPem,
    publicKeyDnsTxt,
  };
};

/**
 * Generates API Key and API Secret pair.
 * API Key format: emit_live_<32 hex chars>
 * API Secret format: emit_sec_<48 hex chars>
 * Key Prefix format: first 18 characters (e.g. emit_live_a1b2c3d4)
 */
export const generateApiKeyPair = (): {
  apiKey: string;
  apiSecret: string;
  keyPrefix: string;
  keyHash: string;
  secretHash: string;
} => {
  const apiKey = `emit_live_${crypto.randomBytes(16).toString('hex')}`;
  const apiSecret = `emit_sec_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = apiKey.slice(0, 18);
  const keyHash = hashSha256(apiKey);
  const secretHash = hashSha256(apiSecret);

  return {
    apiKey,
    apiSecret,
    keyPrefix,
    keyHash,
    secretHash,
  };
};
