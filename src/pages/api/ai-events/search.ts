import type { APIRoute } from "astro";
import { json, query } from "../../../server/ai-events/db.js";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const city = (url.searchParams.get("city") || "").trim();
    const tags = (url.searchParams.get("tags") || url.searchParams.get("tag") || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);
    const status = (url.searchParams.get("status") || "published,draft").split(",").map(value => value.trim()).filter(Boolean);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);

    const values: any[] = [status, limit];
    const filters = [`e.status = any($1::text[])`];
    if (url.searchParams.get("include_unscheduled") !== "1") {
      filters.push("e.start_time is not null");
    }
    if (url.searchParams.get("include_past") !== "1") {
      filters.push("e.start_time >= now()");
    }
    if (q) {
      values.push(`%${q}%`);
      filters.push(`(e.title ilike $${values.length} or e.description ilike $${values.length} or e.organizer ilike $${values.length} or array_to_string(e.tags, ' ') ilike $${values.length})`);
    }
    if (city) {
      values.push(city);
      filters.push(`e.city = $${values.length}`);
    }
    if (tags.length > 0) {
      values.push(tags);
      filters.push(`e.tags && $${values.length}::text[]`);
    }

    const result = await query(
      `select
         e.id, e.title, e.description, e.start_time, e.end_time, e.timezone,
         e.city, e.venue, e.online_url, e.organizer, e.speakers, e.tags, e.price,
         null::timestamptz as registration_deadline,
         coalesce(e.event_url, e.source_url) as registration_url,
         e.status, e.confidence_score,
         json_build_array(json_build_object('source_url', e.source_url, 'last_seen_at', e.updated_at)) as sources
       from "aiEvents_events" e
       where ${filters.join(" and ")}
       order by e.start_time nulls last, e.updated_at desc
       limit $2`,
      values,
    );

    let rows = result.rows;
    if (url.searchParams.get("include_raw") === "1" || rows.length === 0) {
      const rawValues: any[] = [limit];
      const rawFilters = [`r.processing_status = any('{pending,failed}'::text[])`];
      if (q) {
        rawValues.push(`%${q}%`);
        rawFilters.push(`(r.raw_title ilike $${rawValues.length} or r.raw_text ilike $${rawValues.length} or r.source_type ilike $${rawValues.length})`);
      }
      if (city) {
        rawValues.push(city);
        const cityIndex = rawValues.length;
        rawValues.push(`%${city}%`);
        const cityNeedleIndex = rawValues.length;
        rawFilters.push(`(r.city = $${cityIndex} or r.raw_title ilike $${cityNeedleIndex})`);
      }
      if (tags.length > 0) {
        rawValues.push(tags.map(tag => `%${tag}%`));
        rawFilters.push(`exists (
          select 1 from unnest($${rawValues.length}::text[]) as tag_pattern
          where r.raw_title ilike tag_pattern or r.raw_text ilike tag_pattern
        )`);
      }

      const rawResult = await query(
        `select
           r.id, coalesce(r.raw_title, r.source_url) as title,
           left(r.raw_text, 600) as description,
           null::timestamptz as start_time,
           null::timestamptz as end_time,
           'Asia/Shanghai'::text as timezone,
           r.city, null::text as venue, null::text as online_url,
           r.source_type as organizer,
           array[]::text[] as speakers,
           array[]::text[] as tags,
           null::text as price,
           r.source_url as registration_url,
           'raw_pending'::text as status,
           0::numeric as confidence_score,
           json_build_array(json_build_object('source_url', r.source_url, 'last_seen_at', r.fetched_at)) as sources
         from "aiEvents_raw" r
         where ${rawFilters.join(" and ")}
         order by r.fetched_at desc
         limit $1`,
        rawValues,
      );
      rows = [...rows, ...rawResult.rows].slice(0, limit);
    }

    return json({ ok: true, data: rows });
  } catch (error: any) {
    return json({ ok: false, error: "SEARCH_FAILED", message: error.message }, 500);
  }
};
