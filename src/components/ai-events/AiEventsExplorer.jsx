import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Database, MapPin, Search, ShieldCheck, Tag, Ticket, Users } from "lucide-react";

const STATUS_FILTER = "published,draft";

function formatDate(value) {
  if (!value) return "时间待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status) {
  const labels = {
    published: "已发布",
    draft: "待发布",
    needs_review: "待审核",
    archived: "已归档",
  };
  return labels[status] || status;
}

function sourceHost(url) {
  if (!url) return "unknown";
  if (url.startsWith("search://")) return "search";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function nextDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function dateParams(range, customFrom, customTo) {
  if (range === "all") return { includePast: "1", from: "", to: "" };
  if (range === "custom") return { includePast: customFrom ? "1" : "", from: customFrom, to: nextDate(customTo) };
  const days = Number(range || 30);
  return { includePast: "", from: "", to: isoDate(days + 1) };
}

/**
 * @param {{ initialEvents?: any[] }} props
 */
export default function AiEventsExplorer({ initialEvents = [] } = {}) {
  const [events, setEvents] = useState(initialEvents);
  const [facets, setFacets] = useState({ cities: [], tags: [] });
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [tag, setTag] = useState("");
  const [timeRange, setTimeRange] = useState("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ status: STATUS_FILTER, limit: "80" });
      const dates = dateParams(timeRange, dateFrom, dateTo);
      if (query.trim()) params.set("q", query.trim());
      if (city) params.set("city", city);
      if (tag.trim()) params.set("tags", tag.trim());
      if (dates.includePast) params.set("include_past", dates.includePast);
      if (dates.from) params.set("date_from", dates.from);
      if (dates.to) params.set("date_to", dates.to);

      try {
        const response = await fetch(`/api/ai-events/search?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        if (!payload.ok) throw new Error(payload.message || payload.error || "Search failed");
        setEvents(payload.data || []);
        setFacets(payload.facets || { cities: [], tags: [] });
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || String(err));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, city, tag, timeRange, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const cities = new Set(events.map(event => event.city).filter(Boolean));
    const sourceCount = events.reduce((count, event) => count + (event.sources?.length || 0), 0);
    const reviewCount = events.filter(event => event.status === "needs_review").length;
    return { total: events.length, cities: cities.size, sourceCount, reviewCount };
  }, [events]);

  const popularTags = useMemo(() => {
    return (facets.tags || [])
      .map(item => [item.tag, item.count])
      .slice(0, 14);
  }, [facets.tags]);

  const originalUrlFor = event => event.sources?.[0]?.source_url || event.source_url || event.registration_url || event.online_url || "#";

  return (
    <div className="ai-events-app">
      <section className="ai-events-hero">
        <div>
          <p className="ai-events-eyebrow">AI EVENTS GRAPH</p>
          <h1>AI 活动</h1>
          <p>按城市、标签、时间和来源整理后的 AI 活动数据。</p>
        </div>
      </section>

      <section className="ai-events-stats" aria-label="AI events stats">
        <div><Database size={18} /><strong>{stats.total}</strong><span>活动</span></div>
        <div><MapPin size={18} /><strong>{stats.cities}</strong><span>城市</span></div>
        <div><ShieldCheck size={18} /><strong>{stats.sourceCount}</strong><span>来源记录</span></div>
        <div><Users size={18} /><strong>{stats.reviewCount}</strong><span>待审核</span></div>
      </section>

      <section className="ai-events-toolbar">
        <label className="ai-events-search-control">
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、主办方、城市" />
        </label>
        <label className="ai-events-select-control">
          <MapPin size={16} />
          <select value={city} onChange={event => setCity(event.target.value)} aria-label="选择城市">
            <option value="">全部城市</option>
            {(facets.cities || []).map(item => (
              <option value={item.city_key} key={item.city_key}>
                {item.display_name}{Number(item.event_count || 0) > 0 ? ` ${item.event_count}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="ai-events-tag-control">
          <Tag size={16} />
          <input value={tag} onChange={event => setTag(event.target.value)} placeholder="标签，如 大模型、Agent" />
        </label>
        <select value={timeRange} onChange={event => setTimeRange(event.target.value)}>
          <option value="7">未来 7 天</option>
          <option value="30">未来 30 天</option>
          <option value="90">未来 90 天</option>
          <option value="custom">自定义时间</option>
          <option value="all">全部时间</option>
        </select>
        {timeRange === "custom" && (
          <div className="ai-events-date-range" aria-label="时间过滤">
            <label><Clock size={16} /><input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} /></label>
            <span>至</span>
            <label><CalendarDays size={16} /><input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} /></label>
          </div>
        )}
        <span className="ai-events-loading-state" aria-live="polite">{loading ? "更新中" : ""}</span>
      </section>

      {popularTags.length > 0 && (
        <section className="ai-events-popular-tags" aria-label="热门标签">
          <span>热门标签</span>
          {popularTags.map(([item, count]) => (
            <button type="button" key={item} onClick={() => setTag(item)}>
              {item}<small>{count}</small>
            </button>
          ))}
        </section>
      )}

      {error && <div className="ai-events-error">{error}</div>}

      <section className="ai-events-list">
        {events.map(event => (
          <article className="ai-event-row" key={event.id}>
            <div className="ai-event-date">
              <CalendarDays size={18} />
              <span>{formatDate(event.start_time)}</span>
            </div>
            <div className="ai-event-main">
              <div className="ai-event-head">
                <h2>{event.title}</h2>
                <span className={`ai-event-status ${event.status}`}>{statusLabel(event.status)}</span>
              </div>
              <p>{event.description}</p>
              <div className="ai-event-meta">
                <span><MapPin size={14} />{event.city || "地点待确认"}{event.venue ? ` · ${event.venue}` : ""}</span>
                <span><Ticket size={14} />{event.organizer || "主办方待确认"}</span>
                {event.price && <span>{event.price}</span>}
                {Array.isArray(event.speakers) && event.speakers.length > 0 && <span>{event.speakers.slice(0, 3).join("、")}</span>}
                <span>{Math.round(Number(event.confidence_score || 0))}%</span>
              </div>
              {Array.isArray(event.tags) && event.tags.length > 0 && (
                <div className="ai-event-tags">
                  {event.tags.map(tagItem => <button type="button" key={tagItem} onClick={() => setTag(tagItem)}>{tagItem}</button>)}
                </div>
              )}
              <div className="ai-event-sources">
                {(event.sources || []).map(source => (
                  <a href={source.source_url?.startsWith("http") ? source.source_url : undefined} target="_blank" rel="noreferrer" key={source.source_url}>
                    {sourceHost(source.source_url)}
                  </a>
                ))}
              </div>
            </div>
            <a className="ai-event-register" href={originalUrlFor(event)} target="_blank" rel="noreferrer">
              原始链接
            </a>
          </article>
        ))}
        {!loading && events.length === 0 && <div className="ai-events-empty">暂无匹配活动</div>}
      </section>
    </div>
  );
}
