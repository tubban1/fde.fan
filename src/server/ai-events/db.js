import pg from 'pg';

const { Pool } = pg;

let pool = null;

function getConnectionString() {
  return (
    import.meta.env.DATA_URL ||
    import.meta.env.DATABASE_URL ||
    process.env.DATA_URL ||
    process.env.DATABASE_URL ||
    ''
  );
}

export function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) throw new Error('Missing data connection string.');
    pool = new Pool({
      connectionString,
      ssl: (import.meta.env.DATA_SSL || process.env.DATA_SSL) === 'false' ? false : { rejectUnauthorized: false },
      max: Number(import.meta.env.POSTGRES_POOL_MAX || process.env.POSTGRES_POOL_MAX || 4),
      connectionTimeoutMillis: Number(import.meta.env.POSTGRES_CONNECT_TIMEOUT || process.env.POSTGRES_CONNECT_TIMEOUT || 8000),
    });
  }
  return pool;
}

export async function query(sql, values = []) {
  return getPool().query(sql, values);
}

export function requireAdmin(request) {
  const token = import.meta.env.ADMIN_ACCESS_TOKEN || process.env.ADMIN_ACCESS_TOKEN || '';
  if (!token) return false;
  const url = new URL(request.url);
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || url.searchParams.get('admin_token') || '';
  return provided === token;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function text(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}
