import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function loadLocalEnv(cwd = process.cwd()) {
  loadEnvFile(path.join(cwd, '.env.local'));
  loadEnvFile(path.join(cwd, '.env'));
}

export function getPostgresUrl() {
  loadLocalEnv();
  return process.env.DATA_URL || process.env.DATABASE_URL || '';
}

export function createPool() {
  const connectionString = getPostgresUrl();
  if (!connectionString) {
    throw new Error('Missing DATA_URL or DATABASE_URL.');
  }
  return new Pool({
    connectionString,
    ssl: process.env.DATA_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: Number(process.env.POSTGRES_POOL_MAX || 4),
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECT_TIMEOUT || 10000),
  });
}

export async function withDb(task) {
  const pool = createPool();
  try {
    return await task(pool);
  } finally {
    await pool.end();
  }
}
