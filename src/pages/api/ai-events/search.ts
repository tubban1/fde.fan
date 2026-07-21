import type { APIRoute } from "astro";
import { json, query } from "../../../server/ai-events/db.js";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const city = (url.searchParams.get("city") || "").trim();
    const dateFrom = (url.searchParams.get("date_from") || "").trim();
    const dateTo = (url.searchParams.get("date_to") || "").trim();
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
    if (dateFrom) {
      values.push(dateFrom);
      filters.push(`e.start_time >= $${values.length}::timestamptz`);
    }
    if (dateTo) {
      values.push(dateTo);
      filters.push(`e.start_time < $${values.length}::timestamptz`);
    }
    if (q) {
      values.push(`%${q}%`);
      filters.push(`(e.title ilike $${values.length} or e.description ilike $${values.length} or e.organizer ilike $${values.length} or e.city ilike $${values.length} or e.venue ilike $${values.length} or array_to_string(e.tags, ' ') ilike $${values.length})`);
    }
    if (city) {
      values.push(city);
      filters.push(`(e.city = $${values.length} or e.city_key = $${values.length})`);
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

    const facets = await query(
      `with visible_events as (
         select *
         from "aiEvents_events"
         where status = any($1::text[])
           and start_time is not null
           and start_time >= now()
       ),
       tag_counts as (
         select tag, count(*)::integer as tag_count
         from visible_events, unnest(tags) as tag
         where tag <> ''
         group by tag
         order by tag_count desc, tag
         limit 30
       )
       select json_build_object(
         'cities', (
           select coalesce(json_agg(json_build_object(
             'city_key', c.city_key,
             'display_name', c.display_name,
             'event_count', coalesce(city_counts.count, 0)
           ) order by coalesce(city_counts.count, 0) desc, c.display_name), '[]'::json)
           from "aiEvents_cities" c
           left join (
             select city_key, count(*)::integer as count
             from visible_events
             group by city_key
           ) city_counts on city_counts.city_key = c.city_key
           where c.is_active = true
         ),
         'tags', (
           select coalesce(json_agg(json_build_object('tag', tag, 'count', tag_count)), '[]'::json)
           from tag_counts
         )
       ) as facets`,
      [status],
    );

    return json({ ok: true, data: result.rows, facets: facets.rows[0]?.facets || { cities: [], tags: [] } });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (/connection string/i.test(message)) {
      console.warn("[ai-events] data connection is not configured");
      return json({ ok: false, error: "DATA_UNAVAILABLE", message: "数据服务暂未配置。" }, 503);
    }
    console.warn("[ai-events] search failed", message);
    return json({ ok: false, error: "SEARCH_FAILED", message: "活动数据查询失败。" }, 500);
  }
};
