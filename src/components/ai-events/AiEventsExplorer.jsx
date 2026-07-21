import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Database, MapPin, RefreshCw, Search, ShieldCheck, Ticket, Users } from "lucide-react";

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

/**
 * @param {{ initialEvents?: any[] }} props
 */
export default function AiEventsExplorer({ initialEvents = [] } = {}) {
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("published,draft");
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status, limit: "80" });
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    if (tag.trim()) params.set("tags", tag.trim());
    try {
      const response = await fetch(`/api/ai-events/search?${params.toString()}`);
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.message || payload.error || "Search failed");
      setEvents(payload.data || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEvents.length === 0) loadEvents();
  }, []);

  const stats = useMemo(() => {
    const cities = new Set(events.map(event => event.city).filter(Boolean));
    const sourceCount = events.reduce((count, event) => count + (event.sources?.length || 0), 0);
    const reviewCount = events.filter(event => event.status === "needs_review").length;
    return { total: events.length, cities: cities.size, sourceCount, reviewCount };
  }, [events]);

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
        <label>
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、主办方、城市" />
        </label>
        <input value={city} onChange={event => setCity(event.target.value)} placeholder="城市或线上" />
        <input value={tag} onChange={event => setTag(event.target.value)} placeholder="标签，如 大模型、Agent" />
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="published,draft">可用活动</option>
          <option value="published,draft,needs_review">含待审核</option>
          <option value="published">已发布</option>
          <option value="draft">待发布</option>
          <option value="needs_review">待审核</option>
        </select>
        <button type="button" onClick={loadEvents} disabled={loading}>
          <RefreshCw size={16} />
          {loading ? "刷新中" : "刷新"}
        </button>
      </section>

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
