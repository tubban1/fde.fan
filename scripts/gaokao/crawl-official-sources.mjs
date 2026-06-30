import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { upsertSource, withDb } from './lib/db.mjs';

const DATA_KEYWORDS = [
  '招生计划', '招生专业', '计划查询', '选科要求', '选考科目',
  '投档线', '投档分', '投档情况', '录取分数', '录取最低', '最低分', '最低位次', '位次',
  '一分一段', '成绩分段', '分数段', '志愿填报', '填报规则', '招生章程',
  '普通类', '本科批', '专科批', '提前批', '征集志愿', '特殊类型'
];

const FILE_EXTENSIONS = new Set([
  '.pdf', '.xls', '.xlsx', '.csv', '.zip', '.doc', '.docx', '.rar'
]);

const DEFAULT_YEARS = [2026, 2025, 2024, 2023, 2022];

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeSegment(value) {
  return String(value || 'unknown').replace(/[^\p{Script=Han}\w.-]+/gu, '_').slice(0, 80);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(decodeEntities(href), baseUrl).toString();
  } catch {
    return null;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html, fallback) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeEntities(title || fallback || '');
}

function extractLinks(html, baseUrl) {
  const links = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(html))) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (!url) continue;
    const attrs = match[0].slice(0, match[0].indexOf('>') + 1);
    const titleAttr = attrs.match(/\btitle=["']([^"']+)["']/i)?.[1] || '';
    links.push({
      url,
      text: decodeEntities(stripHtml(match[2]) || titleAttr)
    });
  }
  const locationRe = /location\.href\s*=\s*["']([^"']+)["']/gi;
  while ((match = locationRe.exec(html))) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (!url) continue;
    links.push({
      url,
      text: 'script redirect'
    });
  }
  const plainFileRe = /["']([^"']+\.(?:pdf|xls|xlsx|csv|zip|doc|docx|rar)(?:\?[^"']*)?)["']/gi;
  while ((match = plainFileRe.exec(html))) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (!url) continue;
    links.push({
      url,
      text: path.basename(new URL(url).pathname)
    });
  }
  const metaFileRe = /<meta\b[^>]*(?:content|href)=["']([^"']+(?:filename=|showname=|\.pdf|\.xls|\.xlsx|\.csv|\.zip|\.doc|\.docx|\.rar)[^"']*)["'][^>]*>/gi;
  while ((match = metaFileRe.exec(html))) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (!url) continue;
    links.push({
      url,
      text: decodeURIComponent(url).split('/').pop()
    });
  }
  return links;
}

function inferYear(text, url, preferredYears) {
  const haystack = `${text || ''} ${url || ''}`;
  for (const year of preferredYears) {
    if (haystack.includes(String(year))) return year;
  }
  const match = haystack.match(/20\d{2}/);
  return match ? Number(match[0]) : null;
}

function isRelevant({ text, url }, years) {
  const haystack = `${text || ''} ${url || ''}`;
  const hasKeyword = DATA_KEYWORDS.some(keyword => haystack.includes(keyword));
  const hasYear = years.some(year => haystack.includes(String(year)));
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return (hasKeyword || FILE_EXTENSIONS.has(ext)) && (hasYear || !years.length);
}

function classifySource({ text, url }) {
  const haystack = `${text || ''} ${url || ''}`;
  if (/招生计划|招生专业|计划查询/.test(haystack)) return 'enrollment_plan';
  if (/投档|录取分数|录取最低|最低分|最低位次|位次/.test(haystack)) return 'admission_record';
  if (/志愿|规则|政策|办法|通知/.test(haystack)) return 'official_policy';
  if (/选科|选考/.test(haystack)) return 'other';
  if (/章程/.test(haystack)) return 'charter';
  return 'other';
}

function isSameHost(url, rootUrl) {
  try {
    const current = new URL(url);
    const root = new URL(rootUrl);
    return current.hostname === root.hostname;
  } catch {
    return false;
  }
}

function shouldDownload(url) {
  const pathname = new URL(url).pathname;
  return FILE_EXTENSIONS.has(path.extname(pathname).toLowerCase());
}

async function fetchBuffer(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'fde-fan-gaokao-data-crawler/0.1 (+https://www.fde.fan)',
        'accept': '*/*'
      }
    });
    const arrayBuffer = await response.arrayBuffer();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      buffer: Buffer.from(arrayBuffer)
    };
  } finally {
    clearTimeout(timer);
  }
}

function saveRawFile({ province, year, url, contentType, buffer }) {
  const hash = sha256(buffer);
  const extFromUrl = path.extname(new URL(url).pathname).toLowerCase();
  const ext = extFromUrl || (contentType.includes('html') ? '.html' : '.bin');
  const dir = path.join('data', 'gaokao', 'raw', safeSegment(province), String(year || 'unknown'));
  ensureDir(dir);
  const filePath = path.join(dir, `${hash.slice(0, 16)}${ext}`);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buffer);
  return { filePath, hash };
}

async function crawlSource(source, options) {
  const rootUrl = source.url;
  const queue = [{ url: rootUrl, depth: 0, text: source.title }];
  const seen = new Set();
  const found = [];

  while (queue.length && found.length < options.maxItems) {
    const item = queue.shift();
    if (!item?.url || seen.has(item.url)) continue;
    seen.add(item.url);

    if (!isSameHost(item.url, rootUrl)) continue;
    await sleep(options.delayMs);

    let fetched;
    try {
      fetched = await fetchBuffer(item.url, options.timeoutMs);
    } catch (error) {
      found.push({
        source_type: 'other',
        province: source.province || null,
        year: inferYear(item.text, item.url, options.years),
        title: item.text || `Fetch Error: ${path.basename(new URL(item.url).pathname) || item.url}`,
        publisher: source.publisher,
        url: item.url,
        file_url: null,
        file_hash: null,
        parse_status: 'failed',
        raw_data: {
          root_url: rootUrl,
          http_status: 0,
          anchor_text: item.text,
          crawled_by: 'crawl-official-sources',
          fetch_error: error?.message || String(error)
        }
      });
      continue;
    }

    const contentType = fetched.contentType;
    const isFile = shouldDownload(item.url) || !contentType.includes('text/html');
    const pageText = contentType.includes('text/html') ? fetched.buffer.toString('utf8') : '';
    const title = pageText ? extractTitle(pageText, item.text || source.title) : item.text;
    const year = inferYear(`${item.text} ${title}`, item.url, options.years);
    const relevant = isRelevant({ text: `${item.text} ${title}`, url: item.url }, options.years);

    let fileInfo = null;
    if (relevant || isFile) {
      fileInfo = saveRawFile({
        province: source.province,
        year,
        url: item.url,
        contentType,
        buffer: fetched.buffer
      });
      found.push({
        source_type: classifySource({ text: `${item.text} ${title}`, url: item.url }),
        province: source.province || null,
        year,
        title: title || item.text || item.url,
        publisher: source.publisher,
        url: item.url,
        file_url: isFile ? item.url : null,
        file_hash: fileInfo.hash,
        parse_status: 'pending',
        raw_data: {
          root_url: rootUrl,
          local_path: fileInfo.filePath,
          content_type: contentType,
          http_status: fetched.status,
          anchor_text: item.text,
          crawled_by: 'crawl-official-sources'
        }
      });
    }

    if (!pageText || item.depth >= options.depth) continue;
    const links = extractLinks(pageText, item.url)
      .filter(link => isSameHost(link.url, rootUrl))
      .filter(link => isRelevant(link, options.years) || item.depth + 1 < options.depth);

    for (const link of links) {
      if (!seen.has(link.url)) queue.push({ ...link, depth: item.depth + 1 });
    }
  }

  return found;
}

function selectSources(registry, provinces, includeNational) {
  if (!provinces.length) return registry;
  return registry.filter(source => provinces.includes(source.province) || (includeNational && !source.province));
}

const registryPath = getArg('registry', 'data/gaokao/source-registry.json');
const provinces = getArg('provinces')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);
const includeNational = hasFlag('include-national');
const years = (getArg('years') || DEFAULT_YEARS.join(','))
  .split(',')
  .map(item => Number(item.trim()))
  .filter(Boolean);
const options = {
  years,
  depth: Number(getArg('depth', 2)),
  maxItems: Number(getArg('max-items', 80)),
  delayMs: Number(getArg('delay-ms', 900)),
  timeoutMs: Number(getArg('timeout-ms', 15000))
};
const writeDb = hasFlag('write-db');
const scanColumns = hasFlag('scan-columns');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const sources = selectSources(registry, provinces, includeNational);

const allFound = [];
for (const source of sources) {
  if (!source.url || source.verified === false) continue;
  if (scanColumns && source.url.includes('zjzs.net')) {
    const root = new URL(source.url).origin;
    for (let column = 1; column <= Number(getArg('scan-column-max', 220)); column += 1) {
      const url = `${root}/col/col${column}/index.html`;
      try {
        const page = await fetchBuffer(url, options.timeoutMs);
        if (!page.ok || !page.contentType.includes('text/html')) continue;
        const html = page.buffer.toString('utf8');
        const title = extractTitle(html, url);
        if (!isRelevant({ text: title + ' ' + stripHtml(html).slice(0, 1500), url }, options.years)) continue;
        const year = inferYear(title + ' ' + stripHtml(html).slice(0, 1500), url, options.years);
        const fileInfo = saveRawFile({
          province: source.province,
          year,
          url,
          contentType: page.contentType,
          buffer: page.buffer
        });
        allFound.push({
          source_type: classifySource({ text: title, url }),
          province: source.province || null,
          year,
          title,
          publisher: source.publisher,
          url,
          file_url: null,
          file_hash: fileInfo.hash,
          parse_status: 'pending',
          raw_data: {
            root_url: source.url,
            local_path: fileInfo.filePath,
            content_type: page.contentType,
            http_status: page.status,
            crawled_by: 'crawl-official-sources',
            scan_column: column
          }
        });
        const pageLinks = extractLinks(html, url)
          .filter(link => isSameHost(link.url, source.url))
          .filter(link => isRelevant(link, options.years));
        for (const link of pageLinks.slice(0, 30)) {
          try {
            const linkedPage = await fetchBuffer(link.url, options.timeoutMs);
            if (!linkedPage.ok) continue;
            const linkedHtml = linkedPage.contentType.includes('text/html') ? linkedPage.buffer.toString('utf8') : '';
            const linkedTitle = linkedHtml ? extractTitle(linkedHtml, link.text) : link.text;
            const linkedText = `${link.text} ${linkedTitle} ${linkedHtml ? stripHtml(linkedHtml).slice(0, 1200) : ''}`;
            if (!isRelevant({ text: linkedText, url: link.url }, options.years)) continue;
            const linkedYear = inferYear(linkedText, link.url, options.years);
            const linkedFile = saveRawFile({
              province: source.province,
              year: linkedYear,
              url: link.url,
              contentType: linkedPage.contentType,
              buffer: linkedPage.buffer
            });
            allFound.push({
              source_type: classifySource({ text: linkedText, url: link.url }),
              province: source.province || null,
              year: linkedYear,
              title: linkedTitle || link.text || link.url,
              publisher: source.publisher,
              url: link.url,
              file_url: shouldDownload(link.url) ? link.url : null,
              file_hash: linkedFile.hash,
              parse_status: 'pending',
              raw_data: {
                root_url: source.url,
                local_path: linkedFile.filePath,
                content_type: linkedPage.contentType,
                http_status: linkedPage.status,
                anchor_text: link.text,
                crawled_by: 'crawl-official-sources',
                scan_column: column
              }
            });
            if (linkedHtml) {
              const attachmentLinks = extractLinks(linkedHtml, link.url)
                .filter(attachment => shouldDownload(attachment.url) || /downfile\.jsp|download/i.test(attachment.url))
                .slice(0, 12);
              for (const attachment of attachmentLinks) {
                try {
                  const attachmentPage = await fetchBuffer(attachment.url, options.timeoutMs);
                  if (!attachmentPage.ok) continue;
                  const attachmentText = `${attachment.text} ${linkedTitle}`;
                  const attachmentYear = inferYear(attachmentText, attachment.url, options.years);
                  const attachmentFile = saveRawFile({
                    province: source.province,
                    year: attachmentYear || linkedYear,
                    url: attachment.url,
                    contentType: attachmentPage.contentType,
                    buffer: attachmentPage.buffer
                  });
                  allFound.push({
                    source_type: classifySource({ text: attachmentText, url: attachment.url }),
                    province: source.province || null,
                    year: attachmentYear || linkedYear,
                    title: attachment.text || linkedTitle || attachment.url,
                    publisher: source.publisher,
                    url: attachment.url,
                    file_url: attachment.url,
                    file_hash: attachmentFile.hash,
                    parse_status: 'pending',
                    raw_data: {
                      root_url: source.url,
                      parent_url: link.url,
                      local_path: attachmentFile.filePath,
                      content_type: attachmentPage.contentType,
                      http_status: attachmentPage.status,
                      anchor_text: attachment.text,
                      crawled_by: 'crawl-official-sources',
                      scan_column: column
                    }
                  });
                } catch {}
                await sleep(Math.max(100, Math.floor(options.delayMs / 2)));
              }
            }
          } catch {}
          await sleep(Math.max(100, Math.floor(options.delayMs / 2)));
        }
      } catch {}
      await sleep(Math.max(100, Math.floor(options.delayMs / 2)));
    }
  }
  console.log(`Crawling ${source.province || '全国'} ${source.title} ${source.url}`);
  const found = await crawlSource(source, options);
  console.log(`  found ${found.length} relevant source(s)`);
  allFound.push(...found);
}

const outDir = path.join('data', 'gaokao', 'crawl-results');
ensureDir(outDir);
const outPath = path.join(outDir, `crawl-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(outPath, JSON.stringify(allFound, null, 2));
console.log(`Saved crawl manifest: ${outPath}`);

if (writeDb) {
  await withDb(async (pool) => {
    for (const item of allFound) await upsertSource(pool, item);
  });
  console.log(`Upserted ${allFound.length} source records into gaokao_source_documents`);
} else {
  console.log('Skipped database write. Add --write-db to upsert source records.');
}
