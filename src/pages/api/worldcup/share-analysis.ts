import type { APIRoute } from "astro";
// @ts-ignore
import pkg from "pg";

const { Client } = pkg;

const getClient = () =>
  new Client({
    connectionString: import.meta.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

const ensureTable = async (client: any) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS worldcup_shared_analyses (
      id text PRIMARY KEY,
      match_id text NOT NULL,
      title text NOT NULL,
      home_team jsonb NOT NULL DEFAULT '{}'::jsonb,
      away_team jsonb NOT NULL DEFAULT '{}'::jsonb,
      question text,
      answer text NOT NULL,
      parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      features jsonb NOT NULL DEFAULT '{}'::jsonb,
      baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
      adjusted jsonb NOT NULL DEFAULT '{}'::jsonb,
      delta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

const createId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body?.match_id || !body?.title || !body?.answer) {
    return new Response(JSON.stringify({ error: "missing required fields" }), { status: 400 });
  }

  const client = getClient();

  try {
    await client.connect();
    await ensureTable(client);

    const id = createId();
    await client.query(
      `
        INSERT INTO worldcup_shared_analyses (
          id, match_id, title, home_team, away_team, question, answer,
          parsed_data, features, baseline, adjusted, delta
        ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb)
      `,
      [
        id,
        body.match_id,
        body.title,
        JSON.stringify(body.home_team || {}),
        JSON.stringify(body.away_team || {}),
        body.question || "",
        body.answer,
        JSON.stringify(body.parsed_data || {}),
        JSON.stringify(body.features || {}),
        JSON.stringify(body.baseline || {}),
        JSON.stringify(body.adjusted || {}),
        JSON.stringify(body.delta || {}),
      ],
    );

    const url = new URL(`/worldcup/share/${id}`, request.url).toString();
    return new Response(JSON.stringify({ id, url }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "share save failed" }), { status: 500 });
  } finally {
    await client.end();
  }
};
