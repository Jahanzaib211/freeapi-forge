import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    console.warn("[ENCRYPTION] ENCRYPTION_SECRET not set or too short. Using fallback (NOT production-safe).");
    return crypto.scryptSync("forge-studio-fallback-key", "salt", 32);
  }
  return Buffer.from(secret.slice(0, 32));
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

export function decrypt(encrypted: string): string {
  const key = getKey();
  const [ivBase64, data] = encrypted.split(":");
  if (!ivBase64 || !data) throw new Error("Invalid encrypted format");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
