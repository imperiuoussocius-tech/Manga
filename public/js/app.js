const state = { filter: 'all', selectedSlug: null, catalog: [], readerOpen: false, activeChapter: null };

function buildLocalCatalog() {
  return [
    {
      title: 'Solo Leveling',
      slug: 'solo-leveling',
      kind: 'manhwa',
      source: 'Local demo',
      description: 'A polished sample title with an onsite reader and CBZ-style download.',
      cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
      url: 'https://www.webtoons.com/en/fantasy/solo-leveling/list?title_no=1',
      chapters: [
        { id: 'chapter-001', title: 'Chapter 001', url: 'https://www.webtoons.com/en/fantasy/solo-leveling/list?title_no=1' },
        { id: 'chapter-002', title: 'Chapter 002', url: 'https://www.webtoons.com/en/fantasy/solo-leveling/list?title_no=1' }
      ]
    },
    {
      title: 'One Piece',
      slug: 'one-piece',
      kind: 'manga',
      source: 'Local demo',
      description: 'Classic adventure manga in a lightweight GitHub Pages-friendly layout.',
      cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
      url: 'https://www.viz.com/shonenjump/chapters/one-piece',
      chapters: [
        { id: 'chapter-001', title: 'Chapter 001', url: 'https://www.viz.com/shonenjump/chapters/one-piece' },
        { id: 'chapter-002', title: 'Chapter 002', url: 'https://www.viz.com/shonenjump/chapters/one-piece' }
      ]
    },
    {
      title: 'The Beginning After the End',
      slug: 'the-beginning-after-the-end',
      kind: 'manhua',
      source: 'Local demo',
      description: 'A fantasy title that demonstrates the same reader experience on GitHub Pages.',
      cover: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80',
      url: 'https://www.webtoons.com/en/fantasy/the-beginning-after-the-end/list?title_no=1',
      chapters: [
        { id: 'chapter-001', title: 'Chapter 001', url: 'https://www.webtoons.com/en/fantasy/the-beginning-after-the-end/list?title_no=1' },
        { id: 'chapter-002', title: 'Chapter 002', url: 'https://www.webtoons.com/en/fantasy/the-beginning-after-the-end/list?title_no=1' }
      ]
    }
  ];
}

function createPageSvg(title, chapterTitle, pageNumber) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1350"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="42%" dominant-baseline="middle" text-anchor="middle" font-size="38" fill="#f8fafc">${title}</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#94a3b8">${chapterTitle}</text><text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="#38bdf8">Page ${pageNumber}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildStaticImages(entry, chapterId) {
  const chapter = entry.chapters.find((item) => item.id === chapterId) || entry.chapters[0];
  return [1, 2, 3, 4].map((pageNumber) => ({
    src: createPageSvg(entry.title, chapter.title, pageNumber),
    alt: `${entry.title} ${chapter.title} page ${pageNumber}`
  }));
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
  const remoteData = await fetchJson(`/api/catalog?query=${encodeURIComponent(query)}&source=${state.filter}`);
  const baseCatalog = remoteData?.catalog || buildLocalCatalog();
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

async function selectEntry(slug) {
  state.selectedSlug = slug;
  const entry = state.catalog.find((item) => item.slug === slug) || buildLocalCatalog().find((item) => item.slug === slug);
  renderDetail(entry);
  const images = buildStaticImages(entry, entry.chapters[0]?.id || 'chapter-001');
  renderImages(images);
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
  const entry = state.catalog.find((item) => item.slug === slug) || buildLocalCatalog().find((item) => item.slug === slug);
  renderImages(buildStaticImages(entry, chapterId));
}

async function refreshCatalog() {
  const status = document.getElementById('statusText');
  status.textContent = 'Using the built-in demo catalog for GitHub Pages.';
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
  window.location.href = '/public/assets/sample.cbz';
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
});
