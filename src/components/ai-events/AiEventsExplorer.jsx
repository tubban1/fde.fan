import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Database, Filter, MapPin, RefreshCw, Search, ShieldCheck, Ticket } from "lucide-react";

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
    raw_pending: "Raw 待处理",
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
  const [city, setCity] = useState("成都");
  const [status, setStatus] = useState("published,draft");
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status, limit: "80", include_raw: "1" });
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
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
    const rawCount = events.filter(event => event.status === "raw_pending").length;
    return { total: events.length, cities: cities.size, sourceCount, reviewCount, rawCount };
  }, [events]);

  const originalUrlFor = event => event.sources?.[0]?.source_url || event.source_url || event.registration_url || event.online_url || "#";

  return (
    <div className="ai-events-app">
      <section className="ai-events-hero">
        <div>
          <p className="ai-events-eyebrow">AI EVENTS GRAPH</p>
          <h1>AI 活动来源雷达</h1>
          <p>聚合平台、组织、搜索发现和人工审核队列里的 AI 活动。</p>
        </div>
      </section>

      <section className="ai-events-stats" aria-label="AI events stats">
        <div><Database size={18} /><strong>{stats.total}</strong><span>活动/Raw</span></div>
        <div><MapPin size={18} /><strong>{stats.cities}</strong><span>城市</span></div>
        <div><ShieldCheck size={18} /><strong>{stats.sourceCount}</strong><span>来源记录</span></div>
        <div><Filter size={18} /><strong>{stats.rawCount}</strong><span>Raw 待处理</span></div>
      </section>

      <section className="ai-events-toolbar">
        <label>
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、主办方、城市" />
        </label>
        <select value={city} onChange={event => setCity(event.target.value)}>
          <option value="">全部城市</option>
          <option value="成都">成都</option>
          <option value="上海">上海</option>
          <option value="北京">北京</option>
          <option value="线上">线上</option>
          <option value="Zurich">Zurich</option>
        </select>
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
                <span>{Math.round(Number(event.confidence_score || 0))}%</span>
              </div>
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
