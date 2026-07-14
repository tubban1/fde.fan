import { query } from "../diagnosis/db.js";
import { formatErrorForLog } from "../diagnosis/safe_error.js";
import { ensureAuthTables } from "./pre-check.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const token = req.method === "GET" ? req.query?.token : req.body?.token;
  if (!token) {
    return res.status(400).json({ success: false, error: "验证链接无效：缺少 token" });
  }

  try {
    await ensureAuthTables();
    const rows = await query(
      "SELECT email, verification_expires_at FROM user_credits WHERE verification_token = ? LIMIT 1",
      [token]
    );
    if (!rows?.length) {
      return res.status(400).json({ success: false, error: "验证链接无效或已经使用过" });
    }

    const expiresAt = rows[0].verification_expires_at ? new Date(rows[0].verification_expires_at).getTime() : 0;
    if (!expiresAt || expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: "验证链接已过期，请回到登录页重新发送验证邮件" });
    }

    await query(
      "UPDATE user_credits SET email_verified = ?, verification_token = NULL, verification_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
      [true, rows[0].email]
    );
    return res.status(200).json({ success: true, email: rows[0].email });
  } catch (error) {
    const formatted = formatErrorForLog(error);
    console.error("[Diagnosis Auth] Verify email error:", formatted);
    return res.status(500).json({ success: false, error: "邮箱验证失败，请稍后重试" });
  }
}
