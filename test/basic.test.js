const test = require('node:test');
const assert = require('node:assert/strict');
const { slugifyTitle, normalizeTitle, buildFallbackCatalog, REFRESH_INTERVAL_MS, extractCoverFromHtml, extractImageUrlsFromHtml } = require('../lib/scraper');
const { exportChapterImages } = require('../lib/exporter');

test('slugifyTitle converts spaces to hyphens', () => {
  assert.equal(slugifyTitle('Solo Leveling'), 'solo-leveling');
});

test('normalizeTitle collapses whitespace', () => {
  assert.equal(normalizeTitle('  Solo   Leveling  '), 'Solo Leveling');
});

test('buildFallbackCatalog returns example titles', () => {
  const catalog = buildFallbackCatalog();
  assert.ok(catalog.length >= 3);
  assert.ok(catalog.some((item) => item.kind === 'manhwa'));
});

test('exportChapterImages returns a CBZ-style download path', async () => {
  const result = await exportChapterImages({ slug: 'solo-leveling', chapter: 'chapter-001' });
  assert.match(result.filename, /\.zip$/);
  assert.match(result.downloadUrl, /\/api\/download\//);
});

test('refresh interval is set to seven days', () => {
  assert.equal(REFRESH_INTERVAL_MS, 1000 * 60 * 60 * 24 * 7);
});

test('html helpers extract cover and page images', () => {
  const html = `
    <html><body>
      <img src="https://cdn.example.com/cover.jpg" alt="cover" />
      <img src="https://cdn.example.com/page1.jpg" alt="page 1" />
      <img src="https://cdn.example.com/page2.jpg" alt="page 2" />
    </body></html>
  `;
  assert.equal(extractCoverFromHtml(html), 'https://cdn.example.com/cover.jpg');
  assert.deepEqual(extractImageUrlsFromHtml(html), [
    'https://cdn.example.com/page1.jpg',
    'https://cdn.example.com/page2.jpg'
  ]);
});
