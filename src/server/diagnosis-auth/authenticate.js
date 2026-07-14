import { query } from "../diagnosis/db.js";
import { hashPassword, isHashedPassword, normalizeEmail, verifyPassword } from "./auth-utils.js";

export async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return { ok: false, email: normalizedEmail, reason: "missing" };
  }

  const rows = await query(
    "SELECT email, password, credits, email_verified FROM user_credits WHERE email = ? OR LOWER(email) = ? LIMIT 1",
    [normalizedEmail, normalizedEmail]
  );
  if (!rows?.length) {
    return { ok: false, email: normalizedEmail, reason: "not_found" };
  }

  const row = rows[0];
  if (!verifyPassword(password, row.password)) {
    return { ok: false, email: normalizedEmail, reason: "bad_password" };
  }

  if (!isHashedPassword(row.password)) {
    await query(
      "UPDATE user_credits SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
      [hashPassword(password), row.email]
    );
  }

  if (!row.email_verified) {
    return { ok: false, email: normalizeEmail(row.email), reason: "unverified", credits: row.credits || 0 };
  }

  return { ok: true, email: normalizeEmail(row.email), credits: row.credits || 0 };
}
