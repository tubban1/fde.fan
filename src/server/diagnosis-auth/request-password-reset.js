import { query } from "../diagnosis/db.js";
import { formatErrorForLog } from "../diagnosis/safe_error.js";
import { generateToken, tokenExpiresAt } from "./pre-check.js";
import { getMailConfigStatus, sendPasswordResetEmail } from "./mailer.js";
import { normalizeEmail } from "./auth-utils.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const email = normalizeEmail(req.body?.email);
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, error: "请输入有效邮箱" });
  }

  try {
    const mailStatus = getMailConfigStatus();
    if (!mailStatus.configured) {
      return res.status(503).json({ success: false, error: `邮件服务未配置：缺少 ${mailStatus.missing.join(", ")}` });
    }

    const rows = await query("SELECT email FROM user_credits WHERE email = ? LIMIT 1", [email]);
    if (rows?.length) {
      const token = generateToken();
      await query(
        "UPDATE user_credits SET reset_token = ?, reset_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
        [token, tokenExpiresAt(2), email]
      );
      try {
        await sendPasswordResetEmail({ req, to: email, token });
      } catch (error) {
        const formatted = formatErrorForLog(error);
        console.error("[Diagnosis Auth] Password reset email failed:", formatted);
        return res.status(502).json({
          success: false,
          error: `重置邮件发送失败：${String(formatted.message || "SMTP_SEND_FAILED").slice(0, 160)}`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "如果该邮箱已注册，我们已发送密码重置链接，请查收邮件。",
    });
  } catch (error) {
    const formatted = formatErrorForLog(error);
    console.error("[Diagnosis Auth] Request password reset error:", formatted);
    return res.status(500).json({ success: false, error: "发送重置邮件失败，请稍后重试" });
  }
}
