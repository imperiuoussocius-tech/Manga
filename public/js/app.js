const state = { filter: 'all', selectedSlug: null, catalog: [], readerOpen: false, activeChapter: null };

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function renderCatalog(items) {
  const catalog = document.getElementById('catalog');
  if (!items.length) {
    catalog.innerHTML = '<div class="catalog__item"><strong>No results found.</strong><div class="catalog__meta">Try another query or refresh the catalog.</div></div>';
    return;
  }

  catalog.innerHTML = items.map((item) => `
    <div class="catalog__item">
      <button data-slug="${item.slug}">
        <strong>${item.title}</strong>
        <div class="catalog__meta">${item.kind} • ${item.source}</div>
      </button>
    </div>
  `).join('');
}

function renderDetail(entry) {
  document.getElementById('detailTitle').textContent = entry.title;
  document.getElementById('detailBody').innerHTML = `
    <p><strong>${entry.kind.toUpperCase()}</strong></p>
    <p>${entry.description}</p>
    <p><a href="${entry.url}" target="_blank">Open source</a></p>
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
  const data = await fetchJson(`/api/catalog?query=${encodeURIComponent(query)}&source=${state.filter}`);
  state.catalog = data.catalog;
  renderCatalog(state.catalog);
  if (state.selectedSlug) {
    const selected = state.catalog.find((entry) => entry.slug === state.selectedSlug);
    if (selected) {
      renderDetail(selected);
    }
  }
}

async function selectEntry(slug) {
  state.selectedSlug = slug;
  const entry = state.catalog.find((item) => item.slug === slug) || await fetchJson(`/api/catalog/${slug}`);
  renderDetail(entry);
  const data = await fetchJson(`/api/chapter/${entry.slug}/${entry.chapters[0]?.id || 'chapter-001'}`);
  renderImages(data.images);
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
  const data = await fetchJson(`/api/chapter/${slug}/${chapterId}`);
  renderImages(data.images);
}

async function refreshCatalog() {
  const status = document.getElementById('statusText');
  status.textContent = 'Refreshing catalog…';
  const result = await fetchJson('/api/refresh', { method: 'POST' });
  status.textContent = `Catalog refreshed with ${result.count} entries.`;
  await loadCatalog();
}

async function exportZip() {
  const button = document.getElementById('exportButton');
  const slug = button.dataset.slug;
  const chapter = button.dataset.chapter;
  const result = await fetchJson('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, chapter })
  });
  window.location.href = result.downloadUrl;
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

loadCatalog().catch((error) => {
  document.getElementById('statusText').textContent = error.message;
});
