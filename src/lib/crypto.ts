import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY env var is required (32-byte hex).");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex chars).");
  return key;
}

/** AES-256-GCM encrypt. Returns hex-encoded ciphertext (with auth tag prepended) and iv. */
export function encrypt(plaintext: string): { enc: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc: Buffer.concat([tag, ct]).toString("hex"), iv: iv.toString("hex") };
}

/** AES-256-GCM decrypt. */
export function decrypt(enc: string, iv: string): string {
  const key = getKey();
  const data = Buffer.from(enc, "hex");
  const ivBuf = Buffer.from(iv, "hex");
  const tag = data.subarray(0, 16);
  const ct = data.subarray(16);
  const decipher = createDecipheriv("aes-256-gcm", key, ivBuf);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/** Mask an API key for display: ••••last4. */
export function maskKey(key: string): string {
  if (!key || key.length < 4) return "••••";
  return `••••${key.slice(-4)}`;
}
