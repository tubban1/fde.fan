import { normalizeUrl } from './normalize.mjs';

export function classifySourceUrl(value) {
  const url = normalizeUrl(value).toLowerCase();
  const decoded = (() => {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  })();
  const params = (() => {
    try {
      return new URL(url).searchParams;
    } catch {
      return new URLSearchParams();
    }
  })();

  const isSingleEvent =
    /huodongxing\.com\/event\/\d+/.test(url) ||
    /eventbrite\.[^/]+\/e\//.test(url) ||
    /meetup\.com\/[^/]+\/events\/\d+/.test(url) ||
    /segmentfault\.com\/e\/\d+/.test(url);
  if (isSingleEvent) {
    return {
      source_kind: 'single_event',
      source_scope: 'single_event',
      relevance_level: 'event',
    };
  }

  if (/eventbrite\.[^/]+\/d\/[^/]+\/ai\/?/.test(url) || (/huodongxing\.com\/events/.test(url) && /tag=ai/i.test(decoded) && /city=/.test(decoded))) {
    return {
      source_kind: 'recurring_source',
      source_scope: 'city_ai',
      relevance_level: 'strong',
    };
  }

  if (/segmentfault\.com\/events/.test(url) || (/meetup\.com\/find\/?/.test(url) && (params.get('categoryId') === '546' || params.get('categoryid') === '546')) || /lianpu\.com\/city\//.test(url)) {
    return {
      source_kind: 'recurring_source',
      source_scope: 'city_tech',
      relevance_level: 'weak',
    };
  }

  if (/luma\.com\/[^/?#]+\/?$/.test(url) || /lu\.ma\/[^/?#]+\/?$/.test(url)) {
    return {
      source_kind: 'recurring_source',
      source_scope: 'city_only',
      relevance_level: 'city_only',
    };
  }

  if (/developer\.volcengine\.com\/activities/.test(url) || /cloud\.tencent\.com\/developer\/salon\/activities/.test(url)) {
    return {
      source_kind: 'recurring_source',
      source_scope: 'ai_global',
      relevance_level: 'strong',
    };
  }

  return {
    source_kind: 'recurring_source',
    source_scope: 'unknown',
    relevance_level: 'unknown',
  };
}
