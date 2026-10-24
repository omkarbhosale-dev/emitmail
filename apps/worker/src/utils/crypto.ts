import crypto from 'node:crypto';
import { env } from '../config/env.js';

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
