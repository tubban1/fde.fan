import { getDatabaseConfigStatus, isPostgresMode, query } from "../diagnosis/db.js";
import { formatErrorForLog } from "../diagnosis/safe_error.js";
import { randomBytes } from "node:crypto";
import { getMailConfigStatus, sendVerificationEmail } from "./mailer.js";
import { hashPassword, isHashedPassword, normalizeEmail, verifyPassword } from "./auth-utils.js";

let authTablesPromise = null;

async function ignoreDuplicateColumn(task) {
  try {
    await task();
  } catch (error) {
    const code = error?.code || '';
    const message = String(error?.message || '').toLowerCase();
    if (
      code === 'ER_DUP_FIELDNAME' ||
      message.includes('duplicate column') ||
      message.includes('already exists')
    ) {
      return;
    }
    throw error;
  }
}

async function ignoreExistingTable(task) {
  try {
    await task();
  } catch (error) {
    const code = error?.code || '';
    const message = String(error?.message || '').toLowerCase();
    if (
      code === '42P07' ||
      code === 'ER_TABLE_EXISTS_ERROR' ||
      message.includes('already exists')
    ) {
      return;
    }
    throw error;
  }
}

async function runMigration(label, task) {
  try {
    return await task();
  } catch (error) {
    error.migrationLabel = label;
    throw error;
  }
}

async function runOptionalMigration(label, task) {
  try {
    return await task();
  } catch (error) {
    error.migrationLabel = label;
    console.warn("[Diagnosis Auth] Optional migration skipped:", formatErrorForLog(error));
    return null;
  }
}

async function updateEmailReferences(fromEmail, toEmail) {
  const tables = [
    "credit_transactions",
    "diagnosis_sessions",
    "diagnosis_export_leads",
    "gaokao_sessions",
  ];

  for (const table of tables) {
    await runOptionalMigration(`normalize ${table}.email`, () => query(`UPDATE ${table} SET email = ? WHERE email = ?`, [toEmail, fromEmail]));
  }
}

export async function migrateStoredAuthRows() {
  const rows = await query("SELECT email, password FROM user_credits");
  const result = {
    scanned: rows?.length || 0,
    normalizedEmails: 0,
    hashedPasswords: 0,
    skippedEmailConflicts: 0,
  };

  for (const row of rows || []) {
    const storedEmail = String(row.email || "");
    const trimmedEmail = storedEmail.trim();
    const normalizedEmail = normalizeEmail(storedEmail);
    if (!storedEmail || !normalizedEmail) continue;
    let authEmail = storedEmail;

    if (storedEmail !== normalizedEmail) {
      const existing = await query("SELECT email FROM user_credits WHERE email = ? LIMIT 1", [normalizedEmail]);
      if (!existing?.length) {
        await updateEmailReferences(storedEmail, normalizedEmail);
        if (trimmedEmail !== storedEmail) {
          await updateEmailReferences(trimmedEmail, normalizedEmail);
        }
        await query("UPDATE user_credits SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?", [normalizedEmail, storedEmail]);
        authEmail = normalizedEmail;
        result.normalizedEmails += 1;
      } else {
        result.skippedEmailConflicts += 1;
      }
    }

    if (row.password && !isHashedPassword(row.password)) {
      await query(
        "UPDATE user_credits SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
        [hashPassword(row.password), authEmail]
      );
      result.hashedPasswords += 1;
    }
  }

  return result;
}

export async function ensureAuthTables() {
  if (authTablesPromise) return authTablesPromise;

  authTablesPromise = doEnsureAuthTables().catch((error) => {
    authTablesPromise = null;
    throw error;
  });

  return authTablesPromise;
}

async function doEnsureAuthTables() {
  if (isPostgresMode) {
    await runMigration('create user_credits', () => ignoreExistingTable(() => query(`
      CREATE TABLE user_credits (
        email TEXT PRIMARY KEY,
        password TEXT DEFAULT '12345688',
        credits INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)));
    await runOptionalMigration('create credit_transactions', () => ignoreExistingTable(() => query(`
      CREATE TABLE credit_transactions (
        id SERIAL PRIMARY KEY,
        email TEXT,
        type TEXT,
        amount INTEGER,
        balance_after INTEGER,
        description TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)));
    await runMigration('add user_credits.password', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN password TEXT DEFAULT '12345688'`)));
    await runMigration('add user_credits.credits', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN credits INTEGER DEFAULT 0`)));
    await runMigration('add user_credits.created_at', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)));
    await runMigration('add user_credits.updated_at', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)));
    await runMigration('add user_credits.email_verified', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN email_verified BOOLEAN DEFAULT TRUE`)));
    await runMigration('add user_credits.verification_token', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN verification_token TEXT NULL`)));
    await runMigration('add user_credits.verification_expires_at', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN verification_expires_at TIMESTAMPTZ NULL`)));
    await runMigration('add user_credits.reset_token', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN reset_token TEXT NULL`)));
    await runMigration('add user_credits.reset_expires_at', () => ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN reset_expires_at TIMESTAMPTZ NULL`)));
    await runMigration('backfill legacy verified users', () => query(`UPDATE user_credits SET email_verified = TRUE WHERE email_verified IS NULL`));
    await runMigration('backfill user_credits.password', () => query(`UPDATE user_credits SET password = '12345688' WHERE password IS NULL`));
    await runMigration('backfill user_credits.credits', () => query(`UPDATE user_credits SET credits = 0 WHERE credits IS NULL`));
    await runOptionalMigration('normalize and hash user_credits rows', migrateStoredAuthRows);
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS user_credits (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL DEFAULT '12345688',
      credits INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      amount INT NOT NULL,
      balance_after INT NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '12345688'`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN credits INT NOT NULL DEFAULT 0`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN email_verified BOOLEAN DEFAULT TRUE`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN verification_token VARCHAR(255) NULL`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN verification_expires_at TIMESTAMP NULL`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN reset_token VARCHAR(255) NULL`));
  await ignoreDuplicateColumn(() => query(`ALTER TABLE user_credits ADD COLUMN reset_expires_at TIMESTAMP NULL`));
  await query(`UPDATE user_credits SET email_verified = TRUE WHERE email_verified IS NULL`);
  await runOptionalMigration('normalize and hash user_credits rows', migrateStoredAuthRows);
}

export function isMissingAuthTableError(error) {
  const code = error?.code || '';
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'ER_NO_SUCH_TABLE' ||
    message.includes('relation "user_credits" does not exist') ||
    message.includes("relation 'user_credits' does not exist") ||
    message.includes("table 'user_credits'") ||
    message.includes('no such table')
  );
}

export async function findUserCredits(email) {
  try {
    return await query("SELECT password, credits, email_verified FROM user_credits WHERE email = ?", [email]);
  } catch (error) {
    if (!isMissingAuthTableError(error)) {
      throw error;
    }
    await ensureAuthTables();
    return await query("SELECT password, credits, email_verified FROM user_credits WHERE email = ?", [email]);
  }
}

export function generateToken() {
  return randomBytes(32).toString('hex');
}

export function tokenExpiresAt(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function saveVerificationToken(email, token) {
  await query(
    "UPDATE user_credits SET verification_token = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
    [token, tokenExpiresAt(24), email]
  );
}

async function createVerificationAndSend(req, email) {
  const mailStatus = getMailConfigStatus();
  if (!mailStatus.configured) {
    return { sent: false, missing: mailStatus.missing };
  }
  const token = generateToken();
  await saveVerificationToken(email, token);
  try {
    await sendVerificationEmail({ req, to: email, token });
    return { sent: true };
  } catch (error) {
    const formatted = formatErrorForLog(error);
    console.error("[Diagnosis Auth] Verification email failed:", formatted);
    return {
      sent: false,
      sendError: formatted.message || "SMTP_SEND_FAILED",
    };
  }
}

function verificationErrorMessage(mailResult, prefix = "账号尚未完成邮箱验证") {
  if (mailResult.sent) {
    return `${prefix}，已发送验证邮件，请先查收邮箱。`;
  }
  if (mailResult.missing?.length) {
    return `${prefix}，但邮件服务未配置：缺少 ${mailResult.missing.join(", ")}`;
  }
  if (mailResult.sendError) {
    return `${prefix}，但验证邮件发送失败：${String(mailResult.sendError).slice(0, 160)}`;
  }
  return `${prefix}，但验证邮件暂时无法发送，请稍后重试。`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const email = normalizeEmail(req.body?.email);
  const { password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "账号和密码不能为空！" });
  }

  try {
    const dbStatus = getDatabaseConfigStatus();
    if (!dbStatus.configured) {
      return res.status(503).json({
        success: false,
        error: `诊断服务数据库未配置：缺少 ${dbStatus.missing.join(", ")}`,
      });
    }

    await ensureAuthTables();

    const rows = await findUserCredits(email);
    if (rows && rows.length > 0) {
      if (!verifyPassword(password, rows[0].password)) {
        return res.status(401).json({ success: false, error: "密码错误，请重试！" });
      }
      if (!isHashedPassword(rows[0].password)) {
        await query(
          "UPDATE user_credits SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
          [hashPassword(password), email]
        );
      }
      if (!rows[0].email_verified) {
        const mailResult = await createVerificationAndSend(req, email);
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          verificationEmailSent: mailResult.sent,
          error: verificationErrorMessage(mailResult, "账号尚未完成邮箱验证"),
        });
      }
      return res.status(200).json({
        success: true,
        credits: rows[0].credits || 0,
        isNewUser: false,
      });
    }

    await query("INSERT INTO user_credits (email, password, credits, email_verified) VALUES (?, ?, ?, ?)", [email, hashPassword(password), 30, false]);
    await runOptionalMigration('insert welcome credit transaction', () => query(
      "INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)",
      [email, "gift", 30, 30, "FDE FAN Diagnosis welcome quota"]
    ));
    const mailResult = await createVerificationAndSend(req, email);

    return res.status(202).json({
      success: false,
      requiresVerification: true,
      verificationEmailSent: mailResult.sent,
      credits: 30,
      isNewUser: true,
      error: verificationErrorMessage(mailResult, "注册成功，请先完成邮箱验证"),
    });
  } catch (error) {
    const formatted = formatErrorForLog(error);
    console.error("[Diagnosis Auth] Pre-check error:", formatted);
    return res.status(500).json({
      success: false,
      error: "登录失败，请检查服务配置或稍后重试",
      errorCode: formatted.code || formatted.name || "UNKNOWN_DB_ERROR",
      detail: `${error.migrationLabel ? `${error.migrationLabel}: ` : ""}${String(formatted.message || "").slice(0, 180)}`,
    });
  }
}
