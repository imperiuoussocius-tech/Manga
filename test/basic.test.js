const test = require('node:test');
const assert = require('node:assert/strict');
const { slugifyTitle, normalizeTitle, buildFallbackCatalog } = require('../lib/scraper');

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
