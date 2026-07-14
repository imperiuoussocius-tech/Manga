const express = require('express');
const path = require('path');
const { refreshCatalog, listCatalog, getCatalogEntry, getChapterImages } = require('./lib/scraper');
const { exportChapterImages } = require('./lib/exporter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/cache', express.static(path.join(__dirname, 'data', 'cache')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ENT', timestamp: new Date().toISOString() });
});

app.get('/api/catalog', async (req, res) => {
  try {
    const query = (req.query.query || '').toString().trim();
    const source = (req.query.source || 'all').toString();
    const catalog = await listCatalog({ query, source });
    res.json({ catalog, generatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/refresh', async (_req, res) => {
  try {
    const result = await refreshCatalog();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/catalog/:slug', async (req, res) => {
  try {
    const entry = await getCatalogEntry(req.params.slug);
    res.json(entry);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/chapter/:slug/:chapter', async (req, res) => {
  try {
    const payload = await getChapterImages(req.params.slug, req.params.chapter);
    res.json(payload);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/export', async (req, res) => {
  try {
    const payload = await exportChapterImages(req.body);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/download/:name', (req, res) => {
  const file = path.join(__dirname, 'exports', req.params.name);
  if (!file.startsWith(path.join(__dirname, 'exports'))) {
    return res.status(400).json({ error: 'invalid export path' });
  }
  res.download(file);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ENT is live at http://localhost:${PORT}`);
});
