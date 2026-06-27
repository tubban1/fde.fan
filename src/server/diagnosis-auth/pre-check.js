import { getDatabaseConfigStatus, isPostgresMode, query } from "../diagnosis/db.js";
import { initDiagnosisTables } from "../diagnosis/diagnosis_init.js";
import { formatErrorForLog } from "../diagnosis/safe_error.js";

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

async function ensureAuthTables() {
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
    await runMigration('backfill user_credits.password', () => query(`UPDATE user_credits SET password = '12345688' WHERE password IS NULL`));
    await runMigration('backfill user_credits.credits', () => query(`UPDATE user_credits SET credits = 0 WHERE credits IS NULL`));
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
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { email, password } = req.body || {};
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
    try {
      await initDiagnosisTables();
    } catch (error) {
      console.warn("[Diagnosis Auth] Diagnosis table init skipped during login:", formatErrorForLog(error));
    }

    const rows = await query("SELECT password, credits FROM user_credits WHERE email = ?", [email]);
    if (rows && rows.length > 0) {
      if (rows[0].password !== password) {
        return res.status(401).json({ success: false, error: "密码错误，请重试！" });
      }
      return res.status(200).json({
        success: true,
        credits: rows[0].credits || 0,
        isNewUser: false,
      });
    }

    await query("INSERT INTO user_credits (email, password, credits) VALUES (?, ?, ?)", [email, password, 30]);
    await runOptionalMigration('insert welcome credit transaction', () => query(
      "INSERT INTO credit_transactions (email, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)",
      [email, "gift", 30, 30, "FDE FAN Diagnosis welcome quota"]
    ));

    return res.status(200).json({
      success: true,
      credits: 30,
      isNewUser: true,
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
