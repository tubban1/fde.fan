import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface CaseItem {
  href: string;
  title: string;
  titleEn: string;
  category: string;
  difficulty: string;
  deliverables: string[];
}

export default function CaseFilter({ items }: { items: CaseItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchCategory = category === "all" || item.category === category;
      const matchQuery = !q || `${item.title} ${item.titleEn} ${item.deliverables.join(" ")}`.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [items, query, category]);

  return (
    <section className="interactive-block">
      <div className="case-tools">
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索案例 / Search cases" />
        </label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">全部 / All</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="content-grid">
        {filtered.map((item) => (
          <a className="doc-card case-card" href={item.href} key={item.href}>
            <span className="tag">{item.category}</span>
            <h3><span className="zh">{item.title}</span><span className="en">{item.titleEn}</span></h3>
            <p>{item.deliverables.join(" / ")}</p>
            <small>{item.difficulty}</small>
          </a>
        ))}
      </div>
    </section>
  );
}
