const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'catalog.json');
const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 7;

function slugifyTitle(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeTitle(value) {
  return String(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .trim();
}

function resolveMediaUrl(value, baseUrl) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed || /^data:/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch (error) {
    return null;
  }
}

function extractCoverFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const candidates = [];

  $('meta[property="og:image"]').each((_, element) => {
    const content = $(element).attr('content');
    if (content) candidates.push(content);
  });

  $('img').each((_, element) => {
    const src = $(element).attr('src');
    if (src) candidates.push(src);
  });

  for (const candidate of candidates) {
    const resolved = resolveMediaUrl(candidate, baseUrl);
    if (!resolved) continue;
    const lower = resolved.toLowerCase();
    if (lower.includes('cover') || lower.includes('thumbnail') || lower.includes('poster')) {
      return resolved;
    }
  }

  return candidates.map((candidate) => resolveMediaUrl(candidate, baseUrl)).find(Boolean) || null;
}

function extractImageUrlsFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const urls = [];

  $('img').each((_, element) => {
    const src = $(element).attr('src');
    if (!src) return;
    const resolved = resolveMediaUrl(src, baseUrl);
    if (!resolved) return;
    const lower = resolved.toLowerCase();
    if (lower.includes('cover') || lower.includes('thumbnail') || lower.includes('poster')) {
      return;
    }
    if (!urls.includes(resolved)) {
      urls.push(resolved);
    }
  });

  return urls;
}

function buildFallbackCatalog() {
  return [
    {
      title: 'Solo Leveling',
      slug: 'solo-leveling',
      kind: 'manhwa',
      source: 'ENT fallback',
      description: 'A polished example of modern manhwa with fast-paced action and progression.',
      cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
      url: 'https://example.com/solo-leveling',
      chapters: [
        { id: 'chapter-001', title: 'Chapter 001', url: 'https://example.com/solo-leveling/chapter-001' },
        { id: 'chapter-002', title: 'Chapter 002', url: 'https://example.com/solo-leveling/chapter-002' }
      ]
    },
    {
      title: 'One Piece',
      slug: 'one-piece',
      kind: 'manga',
      source: 'ENT fallback',
      description: 'Classic adventure manga with hearty world-building and enduring characters.',
      cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
      url: 'https://example.com/one-piece',
      chapters: [
        { id: 'chapter-001', title: 'Chapter 001', url: 'https://example.com/one-piece/chapter-001' },
        { id: 'chapter-002', title: 'Chapter 002', url: 'https://example.com/one-piece/chapter-002' }
      ]
    },
    {
      title: 'The Beginning After the End',
      slug: 'the-beginning-after-the-end',
      kind: 'manhua',
      source: 'ENT fallback',
      description: 'Reincarnation fantasy with high stakes, polished art, and strong emotional pacing.',
      cover: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80',
      url: 'https://example.com/the-beginning-after-the-end',
      chapters: [
        { id: 'chapter-001', title: 'Chapter 001', url: 'https://example.com/the-beginning-after-the-end/chapter-001' },
        { id: 'chapter-002', title: 'Chapter 002', url: 'https://example.com/the-beginning-after-the-end/chapter-002' }
      ]
    }
  ];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ENT/1.0; +https://example.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.text();
}

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.slug}-${entry.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function scrapeDirectory(url, kind) {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const items = [];

    $('a').each(async (_, element) => {
      const href = $(element).attr('href');
      const label = normalizeTitle($(element).text() || '').trim();
      if (!href || !label) return;
      const resolvedUrl = new URL(href, url).toString();
      if (!resolvedUrl.includes('/manga/') && !resolvedUrl.includes('/manhwa/') && !resolvedUrl.includes('/manhua/')) return;
      const slug = slugifyTitle(label);
      let cover = 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80';
      let chapterUrls = [];
      try {
        const detailHtml = await fetchHtml(resolvedUrl);
        cover = extractCoverFromHtml(detailHtml, resolvedUrl) || cover;
        const detail$ = cheerio.load(detailHtml);
        detail$('a').each((__, chapterLink) => {
          const chapterHref = detail$(chapterLink).attr('href');
          if (!chapterHref) return;
          const chapterUrl = new URL(chapterHref, resolvedUrl).toString();
          if (chapterUrl.includes('/chapter/') || /\/chapter[-_]?/i.test(chapterUrl)) {
            chapterUrls.push(chapterUrl);
          }
        });
      } catch (error) {
        console.warn(`Title page scrape failed for ${resolvedUrl}: ${error.message}`);
      }

      const chapterCandidates = dedupeEntries(chapterUrls.map((chapterUrl, index) => ({
        url: chapterUrl,
        id: `chapter-${String(index + 1).padStart(3, '0')}`,
        title: `Chapter ${String(index + 1).padStart(3, '0')}`
      }))).slice(0, 2);

      items.push({
        title: label,
        slug,
        kind,
        source: 'mangafox-style',
        description: `Auto-collected ${kind} title from a directory listing.`,
        cover,
        url: resolvedUrl,
        chapters: chapterCandidates.length ? chapterCandidates : [
          { id: 'chapter-001', title: 'Chapter 001', url: `${resolvedUrl}chapter-001/` },
          { id: 'chapter-002', title: 'Chapter 002', url: `${resolvedUrl}chapter-002/` }
        ]
      });
    });

    return dedupeEntries(items.slice(0, 8));
  } catch (error) {
    console.warn(`Directory scrape failed for ${url}: ${error.message}`);
    return [];
  }
}

async function refreshCatalog() {
  const candidates = [
    { kind: 'manga', url: 'https://mangafox.me/directory/new/' },
    { kind: 'manhwa', url: 'https://mangafox.me/directory/new/' },
    { kind: 'manhua', url: 'https://mangafox.me/directory/new/' }
  ];

  const discovered = [];
  for (const candidate of candidates) {
    const items = await scrapeDirectory(candidate.url, candidate.kind);
    discovered.push(...items);
  }

  const merged = dedupeEntries([...(discovered.length ? discovered : buildFallbackCatalog()), ...buildFallbackCatalog()]);

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: merged, generatedAt: new Date().toISOString() }, null, 2));

  return { count: merged.length, generatedAt: new Date().toISOString(), refreshIntervalDays: 3 };
}

async function readCatalog() {
  if (!fs.existsSync(DATA_FILE)) {
    await refreshCatalog();
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const payload = JSON.parse(raw);
  const ageMs = Date.now() - new Date(payload.generatedAt || 0).getTime();
  if (ageMs > REFRESH_INTERVAL_MS) {
    await refreshCatalog();
    return readCatalog();
  }
  return payload;
}

async function listCatalog({ query = '', source = 'all' } = {}) {
  const payload = await readCatalog();
  const needle = query.toLowerCase();

  return payload.entries.filter((entry) => {
    const matchesQuery = !needle || [entry.title, entry.description, entry.kind].join(' ').toLowerCase().includes(needle);
    const matchesSource = source === 'all' || entry.kind === source;
    return matchesQuery && matchesSource;
  });
}

async function getCatalogEntry(slug) {
  const payload = await readCatalog();
  const match = payload.entries.find((entry) => entry.slug === slug);
  if (!match) {
    throw new Error(`No catalog entry found for ${slug}`);
  }
  return match;
}

async function getChapterImages(slug, chapterId) {
  const entry = await getCatalogEntry(slug);
  const chapter = entry.chapters.find((item) => item.id === chapterId) || entry.chapters[0];
  const chapterDir = path.join(CACHE_DIR, slug, chapterId || 'chapter-001');

  fs.mkdirSync(chapterDir, { recursive: true });

  const images = [];
  let chapterUrls = [];

  if (chapter.url) {
    try {
      const html = await fetchHtml(chapter.url);
      chapterUrls = extractImageUrlsFromHtml(html, chapter.url);
    } catch (error) {
      console.warn(`Chapter scrape failed for ${chapter.url}: ${error.message}`);
    }
  }

  if (chapterUrls.length) {
    for (let index = 0; index < chapterUrls.length; index += 1) {
      const remoteUrl = chapterUrls[index];
      const parsed = new URL(remoteUrl);
      const extension = path.extname(parsed.pathname) || '.jpg';
      const safeName = `page-${String(index + 1).padStart(2, '0')}${extension}`;
      const filePath = path.join(chapterDir, safeName);
      if (!fs.existsSync(filePath)) {
        try {
          const response = await fetch(remoteUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ENT/1.0; +https://example.com)'
            }
          });
          if (!response.ok) throw new Error(`Request failed with ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(filePath, buffer);
        } catch (error) {
          console.warn(`Image cache failed for ${remoteUrl}: ${error.message}`);
        }
      }
      if (fs.existsSync(filePath)) {
        images.push({
          src: `/api/cache/${slug}/${chapterId || 'chapter-001'}/${safeName}`,
          alt: `${entry.title} ${chapter.title} page ${index + 1}`
        });
      }
    }
  }

  if (!images.length) {
    for (let index = 1; index <= 4; index += 1) {
      const safeName = `page-${String(index).padStart(2, '0')}.svg`;
      const filePath = path.join(chapterDir, safeName);
      if (!fs.existsSync(filePath)) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1350"><rect width="100%" height="100%" fill="#111827"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="#f9fafb">${entry.title}</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#9ca3af">${chapter.title} • page ${index}</text></svg>`;
        fs.writeFileSync(filePath, svg);
      }
      images.push({
        src: `/api/cache/${slug}/${chapterId || 'chapter-001'}/${safeName}`,
        alt: `${entry.title} ${chapter.title} page ${index}`
      });
    }
  }

  return { slug, chapter, images, cover: entry.cover };
}

module.exports = {
  buildFallbackCatalog,
  normalizeTitle,
  slugifyTitle,
  refreshCatalog,
  listCatalog,
  getCatalogEntry,
  getChapterImages,
  extractCoverFromHtml,
  extractImageUrlsFromHtml,
  REFRESH_INTERVAL_MS
};
