import * as cheerio from 'cheerio';
import { EventSourceAdapter } from './base.mjs';
import { normalizeUrl, normalizeWhitespace } from '../lib/normalize.mjs';

const CITY_SUBDOMAINS = new Map([
  ['成都', 'cd'],
  ['北京', 'bj'],
  ['上海', 'sh'],
  ['深圳', 'sz'],
  ['广州', 'gz'],
  ['杭州', 'hz'],
  ['武汉', 'wh'],
  ['重庆', 'cq'],
  ['南京', 'nj'],
  ['苏州', 'su'],
  ['长沙', 'cs'],
  ['西安', 'xa'],
  ['厦门', 'xm'],
  ['郑州', 'zz'],
  ['东莞', 'dg'],
  ['青岛', 'qd'],
  ['天津', 'tj'],
  ['宁波', 'nb'],
  ['昆明', 'km'],
]);

function canonicalSearchUrl(source) {
  const city = normalizeWhitespace(source.city || source.raw_config?.city || '');
  const citySubdomain = source.raw_config?.city_subdomain || CITY_SUBDOMAINS.get(city);
  const raw = source.url || 'https://www.huodongxing.com/events';
  const url = new URL(raw);
  if (citySubdomain) url.hostname = `${citySubdomain}.huodongxing.com`;
  url.pathname = '/events';
  url.searchParams.set('orderby', source.raw_config?.orderby || 'o');
  url.searchParams.set('d', source.raw_config?.date_range || 't5');
  url.searchParams.set('tag', source.raw_config?.tag || 'AI');
  if (city) url.searchParams.set('city', city);
  url.searchParams.delete('page');
  return url.toString();
}

function pageUrl(baseUrl, page) {
  const url = new URL(baseUrl);
  if (page > 1) url.searchParams.set('page', String(page));
  else url.searchParams.delete('page');
  return url.toString();
}

function paginationPageCount(html) {
  const match = html.match(/laypage\.render\(\{\s*[\s\S]*?count:\s*(\d+)\s*,\s*[\s\S]*?limit:\s*(\d+)/);
  if (!match) return 1;
  const count = Number(match[1]);
  const limit = Number(match[2]) || 20;
  if (!Number.isFinite(count) || count <= 0) return 1;
  return Math.max(1, Math.ceil(count / limit));
}

export class HuodongxingAdapter extends EventSourceAdapter {
  async discoverUrls() {
    const baseUrl = canonicalSearchUrl(this.source);
    const maxPages = Number(this.source.raw_config?.max_pages || process.env.AI_EVENTS_HUODONGXING_MAX_PAGES || 5);
    return Array.from({ length: Math.max(1, maxPages) }, (_, index) => pageUrl(baseUrl, index + 1));
  }

  async parse(raw) {
    const $ = cheerio.load(raw.text);
    const detectedPages = paginationPageCount(raw.text);
    const candidates = [];

    $('.search-tab-content-item-mesh').each((_, element) => {
      const card = $(element);
      const titleLink = card.find('a.item-title[href]').first();
      const title = normalizeWhitespace(titleLink.text());
      const href = normalizeUrl(titleLink.attr('href'), raw.url);
      if (!title || !href) return;

      const dateText = normalizeWhitespace(card.find('.item-dress p').first().text());
      const venueText = normalizeWhitespace(card.find('.item-dress-pp').first().text());
      const organizer = normalizeWhitespace(card.find('.user-name').first().text());
      const imageAlt = normalizeWhitespace(card.find('img.item-logo').attr('alt'));
      const description = normalizeWhitespace([
        title,
        dateText,
        venueText,
        organizer,
        imageAlt && imageAlt !== title ? imageAlt : '',
      ].filter(Boolean).join('\n'));

      candidates.push(this.normalize({
        title,
        canonical_title: title,
        description,
        date: dateText,
        city: this.source.city,
        venue: venueText,
        organizer,
        source_url: href,
        registration_url: href,
        confidence_score: 80,
        raw_data: {
          list_date_text: dateText,
          list_venue_text: venueText,
          list_page_url: raw.url,
          detected_pages: detectedPages,
        },
      }));
    });

    return candidates;
  }
}
