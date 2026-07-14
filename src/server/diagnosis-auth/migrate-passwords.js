import { ensureAuthTables, migrateStoredAuthRows } from "./pre-check.js";
import { formatErrorForLog } from "../diagnosis/safe_error.js";

function readToken(req) {
  const authorization = req.headers?.authorization || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return req.headers?.["x-auth-migration-token"] || req.body?.token || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const expectedToken = process.env.AUTH_MIGRATION_TOKEN || "";
  if (!expectedToken) {
    return res.status(503).json({
      success: false,
      error: "AUTH_MIGRATION_TOKEN 未配置，已拒绝执行数据库迁移。",
    });
  }

  if (readToken(req) !== expectedToken) {
    return res.status(403).json({ success: false, error: "迁移密钥无效。" });
  }

  try {
    await ensureAuthTables();
    const result = await migrateStoredAuthRows();
    return res.status(200).json({
      success: true,
      message: `认证数据迁移完成：扫描 ${result.scanned} 个账号，hash ${result.hashedPasswords} 个密码，normalize ${result.normalizedEmails} 个邮箱。`,
      result,
    });
  } catch (error) {
    console.error("[Diagnosis Auth] Password migration failed:", formatErrorForLog(error));
    return res.status(500).json({
      success: false,
      error: "认证数据迁移失败，请查看服务端日志。",
    });
  }
}
