import { query } from "../diagnosis/db.js";
import { formatErrorForLog } from "../diagnosis/safe_error.js";
import { hashPassword } from "./auth-utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");
  if (!token) {
    return res.status(400).json({ success: false, error: "重置链接无效：缺少 token" });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: "新密码至少需要 8 位" });
  }

  try {
    const rows = await query(
      "SELECT email, reset_expires_at FROM user_credits WHERE reset_token = ? LIMIT 1",
      [token]
    );
    if (!rows?.length) {
      return res.status(400).json({ success: false, error: "重置链接无效或已经使用过" });
    }

    const expiresAt = rows[0].reset_expires_at ? new Date(rows[0].reset_expires_at).getTime() : 0;
    if (!expiresAt || expiresAt < Date.now()) {
      return res.status(400).json({ success: false, error: "重置链接已过期，请重新申请找回密码" });
    }

    await query(
      "UPDATE user_credits SET password = ?, email_verified = ?, reset_token = NULL, reset_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
      [hashPassword(password), true, rows[0].email]
    );
    return res.status(200).json({ success: true, email: rows[0].email });
  } catch (error) {
    const formatted = formatErrorForLog(error);
    console.error("[Diagnosis Auth] Reset password error:", formatted);
    return res.status(500).json({ success: false, error: "重置密码失败，请稍后重试" });
  }
}
