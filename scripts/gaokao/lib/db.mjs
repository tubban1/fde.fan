import pg from 'pg';
import { getPostgresUrl } from './env.mjs';

const { Pool } = pg;

export function createPool() {
  const connectionString = getPostgresUrl();
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL, SUPABASE_DATABASE_URL, POSTGRES_URL, or DATABASE_URL.');
  }
  return new Pool({
    connectionString,
    ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: Number(process.env.POSTGRES_POOL_MAX || 4),
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECT_TIMEOUT || 10000)
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

export async function upsertSource(pool, source) {
  const result = await pool.query(
    `insert into gaokao_source_documents
       (source_type, province, year, title, publisher, url, file_url, file_hash, published_at, parse_status, raw_data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     on conflict do nothing
     returning id`,
    [
      source.source_type || 'other',
      source.province || null,
      source.year ? Number(source.year) : null,
      source.title || (source.url ? `Source: ${new URL(source.url).hostname}${new URL(source.url).pathname}` : 'Untitled Source'),
      source.publisher || null,
      source.url || null,
      source.file_url || null,
      source.file_hash || null,
      source.published_at || null,
      source.parse_status || 'pending',
      JSON.stringify(source.raw_data || source)
    ]
  );
  if (result.rows[0]?.id) return result.rows[0].id;
  const titleForQuery = source.title || (source.url ? `Source: ${new URL(source.url).hostname}${new URL(source.url).pathname}` : 'Untitled Source');
  const existing = await pool.query(
    `select id from gaokao_source_documents
      where title = $1 and coalesce(url, '') = coalesce($2, '')
      order by created_at desc
      limit 1`,
    [titleForQuery, source.url || null]
  );
  return existing.rows[0]?.id || null;
}
