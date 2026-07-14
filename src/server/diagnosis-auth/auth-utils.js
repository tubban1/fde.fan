import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(String(password), salt, KEY_LENGTH).toString("hex");
  return `${HASH_PREFIX}$${salt}$${key}`;
}

export function isHashedPassword(value) {
  return String(value || "").startsWith(`${HASH_PREFIX}$`);
}

export function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword || "");
  if (!isHashedPassword(stored)) {
    return stored === String(password);
  }

  const [, salt, key] = stored.split("$");
  if (!salt || !key) return false;
  const storedBuffer = Buffer.from(key, "hex");
  const candidateBuffer = scryptSync(String(password), salt, storedBuffer.length);
  if (storedBuffer.length !== candidateBuffer.length) return false;
  return timingSafeEqual(storedBuffer, candidateBuffer);
}
