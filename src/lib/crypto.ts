import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Resolve the AES-256 key.
 *
 * Order of precedence:
 *   1. ENCRYPTION_KEY env var (64-char hex) — required for production.
 *   2. A persisted key file (<cwd>/.encryption-key) — auto-generated on first
 *      run so the app works out-of-the-box in dev without manual setup.
 *   3. A freshly generated ephemeral key (used only if the key file cannot be
 *      written, e.g. read-only FS; encrypted values then won't survive restart).
 *
 * The resolved key is cached for the lifetime of the process.
 */
let _key: Buffer | null = null;

function keyFilePath(): string {
  return join(process.cwd(), ".encryption-key");
}

function resolveKey(): Buffer {
  // 1. env var — authoritative for production.
  const hex = process.env.ENCRYPTION_KEY;
  if (hex && hex.trim()) {
    const key = Buffer.from(hex.trim(), "hex");
    if (key.length === 32) return key;
    console.warn(
      `[crypto] ENCRYPTION_KEY is set but is not 32 bytes (got ${key.length}); falling back.`
    );
  }

  // 2. persisted key file (auto-generated on first run).
  const file = keyFilePath();
  try {
    if (existsSync(file)) {
      const stored = readFileSync(file, "utf8").trim();
      const key = Buffer.from(stored, "hex");
      if (key.length === 32) return key;
    }
  } catch {
    /* ignore read errors and fall through */
  }

  // 3. generate a new key and try to persist it.
  const key = randomBytes(32);
  try {
    writeFileSync(file, key.toString("hex"), { mode: 0o600 });
    console.warn(
      `[crypto] ENCRYPTION_KEY not set — generated and saved to ${file}. Set ENCRYPTION_KEY in production.`
    );
  } catch {
    console.warn(
      `[crypto] ENCRYPTION_KEY not set and could not persist a key file — using an ephemeral key. Encrypted values will not survive a restart.`
    );
  }
  return key;
}

function getKey(): Buffer {
  if (_key) return _key;
  _key = resolveKey();
  return _key;
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
