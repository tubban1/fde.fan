import { EventSourceAdapter, extractAnchorCandidates, extractJsonLdEvents, extractNextDataEvents, uniqueCandidates } from './base.mjs';

function pageUrl(baseUrl, page) {
  const url = new URL(baseUrl);
  const pageParam = 'page';
  if (page > 1) url.searchParams.set(pageParam, String(page));
  else url.searchParams.delete(pageParam);
  return url.toString();
}

export class HtmlListAdapter extends EventSourceAdapter {
  async discoverUrls() {
    const maxPages = Number(this.source.raw_config?.max_pages || 1);
    return Array.from({ length: Math.max(1, maxPages) }, (_, index) => pageUrl(this.source.url, index + 1));
  }

  async parse(raw) {
    if (/json/i.test(raw.contentType)) {
      const parsed = JSON.parse(raw.text);
      const items = Array.isArray(parsed) ? parsed : parsed.events || parsed.data || parsed.items || [];
      return items.map(item => this.normalize({ ...item, source_url: item.url || raw.url }));
    }

    const candidates = uniqueCandidates([
      ...extractJsonLdEvents(raw.text, raw.url),
      ...extractNextDataEvents(raw.text, raw.url),
      ...extractAnchorCandidates(raw.text, raw.url),
    ]);
    return candidates.map(candidate => this.normalize(candidate));
  }
}
