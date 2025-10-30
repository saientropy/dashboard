import crypto from 'crypto';

const keyB64 = process.env.OTF_ENCRYPTION_KEY;
if (!keyB64) {
  // In production this must be set; during build we avoid throwing to not break
}

function getKey(): Buffer {
  if (!keyB64) throw new Error('Missing OTF_ENCRYPTION_KEY');
  const buf = Buffer.from(keyB64, 'base64');
  if (buf.length !== 32) throw new Error('OTF_ENCRYPTION_KEY must be 32 bytes base64');
  return buf;
}

export function encryptString(plain: string): { ivB64: string; cipherB64: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ivB64: Buffer.concat([iv, tag]).toString('base64'), cipherB64: enc.toString('base64') };
}

export function decryptString(ivWithTagB64: string, cipherB64: string): string {
  const key = getKey();
  const ivTag = Buffer.from(ivWithTagB64, 'base64');
  const iv = ivTag.subarray(0, 12);
  const tag = ivTag.subarray(12);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(Buffer.from(cipherB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}


