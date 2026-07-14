const state = { filter: 'all', selectedSlug: null, catalog: [], readerOpen: false, activeChapter: null };

function setLoading(active, message = 'Summoning the latest chapters...') {
  const screen = document.getElementById('loadingScreen');
  const label = document.getElementById('loadingLabel');
  if (!screen || !label) return;
  label.textContent = message;
  screen.classList.toggle('active', active);
  document.body.classList.toggle('loading', active);
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return null;
  }
}

function renderCatalog(items) {
  const catalog = document.getElementById('catalog');
  if (!items.length) {
    catalog.innerHTML = '<div class="catalog__item"><strong>No results found.</strong><div class="catalog__meta">Try another query or refresh the catalog.</div></div>';
    return;
  }

  catalog.innerHTML = items.map((item) => `
    <article class="catalog__item">
      <img class="catalog__cover" src="${item.cover || 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80'}" alt="${item.title} cover" />
      <div class="catalog__body">
        <button data-slug="${item.slug}">
          <strong>${item.title}</strong>
          <div class="catalog__meta">${item.kind} • ${item.source}</div>
        </button>
        <p>${item.description}</p>
      </div>
    </article>
  `).join('');
}

function renderDetail(entry) {
  const detailHero = document.getElementById('detailHero');
  document.getElementById('detailTitle').textContent = entry.title;
  detailHero.style.borderColor = entry.highlight || '#d4af37';
  detailHero.innerHTML = `
    <img class="detail__cover" src="${entry.cover}" alt="${entry.title} cover" />
    <div class="detail__content">
      <p class="eyebrow">${entry.kind.toUpperCase()}</p>
      <p>${entry.description}</p>
      <p><a href="${entry.url}" target="_blank">Open source</a></p>
    </div>
  `;
  document.getElementById('detailBody').innerHTML = `
    <p class="detail__summary">New chapters and fresh cover art refresh every three days.</p>
  `;
  document.getElementById('exportButton').disabled = false;
  document.getElementById('exportButton').dataset.slug = entry.slug;
  document.getElementById('exportButton').dataset.chapter = entry.chapters[0]?.id || 'chapter-001';
  document.getElementById('downloadButton').disabled = false;
  document.getElementById('downloadButton').dataset.slug = entry.slug;
  document.getElementById('downloadButton').dataset.chapter = entry.chapters[0]?.id || 'chapter-001';
  state.activeChapter = entry.chapters[0]?.id || 'chapter-001';

  const chapterList = document.getElementById('chapterList');
  chapterList.innerHTML = entry.chapters.map((chapter) => `
    <div class="chapter__item">
      <button data-chapter="${chapter.id}" data-slug="${entry.slug}">${chapter.title}</button>
    </div>
  `).join('');
}

async function loadCatalog() {
  const query = document.getElementById('searchInput').value;
  const remoteData = await fetchJson(`/api/catalog?query=${encodeURIComponent(query)}&source=${state.filter}`);
  const baseCatalog = remoteData?.catalog || [];
  const needle = query.toLowerCase();
  state.catalog = baseCatalog.filter((entry) => {
    const matchesQuery = !needle || [entry.title, entry.description, entry.kind].join(' ').toLowerCase().includes(needle);
    const matchesSource = state.filter === 'all' || entry.kind === state.filter;
    return matchesQuery && matchesSource;
  });
  renderCatalog(state.catalog);
  if (state.selectedSlug) {
    const selected = state.catalog.find((entry) => entry.slug === state.selectedSlug);
    if (selected) {
      renderDetail(selected);
    }
  }
}

async function loadChapterImages(slug, chapterId) {
  const loadingLabel = document.getElementById('loadingLabel');
  if (loadingLabel) {
    loadingLabel.textContent = 'Fetching chapter pages...';
  }
  setLoading(true, 'Fetching chapter pages...');
  try {
    const payload = await fetchJson(`/api/chapter/${encodeURIComponent(slug)}/${encodeURIComponent(chapterId)}`);
    if (payload?.images?.length) {
      renderImages(payload.images);
      setLoading(false);
      return;
    }
  } catch (error) {
    console.warn('Unable to load chapter images', error);
  }
  setLoading(false);
}

async function selectEntry(slug) {
  state.selectedSlug = slug;
  const entry = state.catalog.find((item) => item.slug === slug);
  if (!entry) {
    document.getElementById('statusText').textContent = 'Selected title is unavailable in the current catalog.';
    return;
  }
  renderDetail(entry);
  await loadChapterImages(slug, entry.chapters[0]?.id || 'chapter-001');
}

function renderImages(images) {
  const imageGrid = document.getElementById('imageGrid');
  const readerFrame = document.getElementById('readerFrame');
  imageGrid.innerHTML = images.map((image) => `<img src="${image.src}" alt="${image.alt}" />`).join('');
  readerFrame.innerHTML = images.map((image) => `<img src="${image.src}" alt="${image.alt}" />`).join('');
}

async function openChapter(slug, chapterId) {
  state.activeChapter = chapterId;
  document.getElementById('exportButton').dataset.chapter = chapterId;
  document.getElementById('downloadButton').dataset.chapter = chapterId;
  await loadChapterImages(slug, chapterId);
}

async function refreshCatalog() {
  const status = document.getElementById('statusText');
  status.textContent = 'Refreshing the catalog and chapter pages now.';
  await fetchJson('/api/refresh', { method: 'POST' });
  await loadCatalog();
}

async function exportZip() {
  const button = document.getElementById('exportButton');
  const slug = button.dataset.slug;
  const chapter = button.dataset.chapter;
  const remoteResult = await fetchJson('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, chapter })
  });
  if (remoteResult?.downloadUrl) {
    window.location.href = remoteResult.downloadUrl;
    return;
  }
  alert('Export failed. Please try refreshing the catalog and selecting a chapter again.');
}

function toggleReader() {
  const readerFrame = document.getElementById('readerFrame');
  state.readerOpen = !state.readerOpen;
  readerFrame.classList.toggle('active', state.readerOpen);
  const button = document.getElementById('readerModeButton');
  button.textContent = state.readerOpen ? 'Hide onsite reader' : 'Open onsite reader';
}

document.getElementById('refreshButton').addEventListener('click', refreshCatalog);
document.getElementById('searchInput').addEventListener('input', () => loadCatalog());
document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', async () => {
    document.querySelectorAll('.filter').forEach((filterButton) => filterButton.classList.remove('active'));
    button.classList.add('active');
    state.filter = button.dataset.filter;
    await loadCatalog();
  });
});
document.getElementById('catalog').addEventListener('click', (event) => {
  const target = event.target.closest('button[data-slug]');
  if (!target) return;
  selectEntry(target.dataset.slug);
});
document.getElementById('chapterList').addEventListener('click', (event) => {
  const target = event.target.closest('button[data-chapter]');
  if (!target) return;
  openChapter(target.dataset.slug, target.dataset.chapter);
});
document.getElementById('exportButton').addEventListener('click', exportZip);
document.getElementById('downloadButton').addEventListener('click', exportZip);
document.getElementById('readerModeButton').addEventListener('click', toggleReader);

loadCatalog().catch(() => {
  document.getElementById('statusText').textContent = 'Unable to load the demo catalog.';
  setLoading(false);
});
