// ============================================
// State
// ============================================
let currentBook = 'genesisy';
let currentChapter = 1;
let isDark = false;
let fontSize = 17;
let wakeLock = null;
let searchTimeout = null;
let vakitenyList = [];

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadVakiteny();
  buildBooksScreen();
  renderVakiteny();
  restorePosition();
  setupScrollProgress();

  // Reveal app, fade out skeleton
  const skeleton = document.getElementById('skeleton');
  document.getElementById('app').classList.remove('app-hidden');
  skeleton.classList.add('hide');
  setTimeout(() => skeleton.remove(), 300);
});

// ============================================
// Screen navigation
// ============================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + name).classList.add('active');
  if (name !== 'reader') closeSearch();
}

// ============================================
// Reader
// ============================================
function navigateTo(bookId, chapter, verseStart, verseEnd) {
  const book = BIBLE_DATA[bookId];
  if (!book || !book.chapters[chapter]) return;

  currentBook = bookId;
  currentChapter = chapter;
  savePosition();

  const verses = book.chapters[chapter];
  const verseNums = Object.keys(verses).map(Number).sort((a, b) => a - b);

  // Build passage HTML — group into paragraphs every ~5 verses
  let html = '';
  let p = '<p class="passage">';
  verseNums.forEach((num, i) => {
    const isHighlighted = verseStart != null && num >= verseStart && num <= (verseEnd || verseStart);
    const cls = isHighlighted ? ' class="verse-highlight"' : '';
    p += `<span id="v-${num}"${cls}><span class="v">${num}</span>${verses[num]} </span>`;
    if ((i + 1) % 5 === 0 && i < verseNums.length - 1) {
      p += '</p><p class="passage">';
    }
  });
  p += '</p>';
  html += p;

  // Chapter nav
  const chapters = Object.keys(book.chapters).map(Number).sort((a, b) => a - b);
  const idx = chapters.indexOf(chapter);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  // Find previous/next book if at boundary
  let prevLabel = '', nextLabel = '', prevAction = '', nextAction = '';
  if (prev !== null) {
    prevLabel = `&larr; Toko ${prev}`;
    prevAction = `navigateTo('${bookId}', ${prev})`;
  } else {
    const prevBook = getPrevBook(bookId);
    if (prevBook) {
      const pbChapters = Object.keys(BIBLE_DATA[prevBook].chapters).map(Number).sort((a, b) => a - b);
      const lastCh = pbChapters[pbChapters.length - 1];
      prevLabel = `&larr; ${BIBLE_DATA[prevBook].name}`;
      prevAction = `navigateTo('${prevBook}', ${lastCh})`;
    }
  }
  if (next !== null) {
    nextLabel = `Toko ${next} &rarr;`;
    nextAction = `navigateTo('${bookId}', ${next})`;
  } else {
    const nextBook = getNextBook(bookId);
    if (nextBook) {
      const nbChapters = Object.keys(BIBLE_DATA[nextBook].chapters).map(Number).sort((a, b) => a - b);
      nextLabel = `${BIBLE_DATA[nextBook].name} &rarr;`;
      nextAction = `navigateTo('${nextBook}', ${nbChapters[0]})`;
    }
  }

  html += `<div class="chapter-nav">
    <button class="chapter-nav-btn ${prevAction ? '' : 'hidden'}" onclick="${prevAction}">${prevLabel}</button>
    <button class="chapter-nav-btn ${nextAction ? '' : 'hidden'}" onclick="${nextAction}">${nextLabel}</button>
  </div>`;

  const content = document.getElementById('readerContent');
  content.innerHTML = html;
  content.scrollTop = 0;

  document.getElementById('readerLocation').innerHTML = `${book.name} <span class="reader-location-sep">|</span> ${chapter}`;
  document.getElementById('progressFill').style.width = '0%';

  closeSearch();
  showScreen('reader');

  // Scroll to verse if specified
  if (verseStart != null) {
    setTimeout(() => {
      const el = document.getElementById('v-' + verseStart);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

function getAllBookIds() {
  const ids = [];
  for (const group of BOOK_ORDER) {
    for (const b of group.books) ids.push(b.id);
  }
  return ids;
}

function getPrevBook(bookId) {
  const ids = getAllBookIds();
  const idx = ids.indexOf(bookId);
  return idx > 0 ? ids[idx - 1] : null;
}

function getNextBook(bookId) {
  const ids = getAllBookIds();
  const idx = ids.indexOf(bookId);
  return idx < ids.length - 1 ? ids[idx + 1] : null;
}

// ============================================
// Scroll progress
// ============================================
function setupScrollProgress() {
  document.getElementById('readerContent').addEventListener('scroll', function () {
    const el = this;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
    document.getElementById('progressFill').style.width = Math.min(100, Math.max(0, pct)) + '%';
  });
}

// ============================================
// Search
// ============================================
function toggleSearch() {
  const pull = document.getElementById('searchPull');
  if (pull.classList.contains('open')) {
    closeSearch();
  } else {
    pull.classList.add('open');
    document.getElementById('searchInput').focus();
  }
}

function closeSearch() {
  document.getElementById('searchPull').classList.remove('open');
  document.getElementById('searchResults').classList.remove('visible');
  document.getElementById('readerContent').style.display = '';
  document.getElementById('searchInput').value = '';
}

function onSearch(query) {
  clearTimeout(searchTimeout);
  const results = document.getElementById('searchResults');
  const reader = document.getElementById('readerContent');

  if (!query.trim()) {
    results.classList.remove('visible');
    reader.style.display = '';
    return;
  }

  // Debounce 200ms for performance with 31k verses
  searchTimeout = setTimeout(() => {
    results.classList.add('visible');
    reader.style.display = 'none';
    results.innerHTML = '';

    const q = query.toLowerCase();
    let found = 0;
    const max = 50; // limit results for performance

    for (const [bookId, book] of Object.entries(BIBLE_DATA)) {
      if (found >= max) break;
      for (const [ch, verses] of Object.entries(book.chapters)) {
        if (found >= max) break;
        for (const [vNum, text] of Object.entries(verses)) {
          if (found >= max) break;
          if (text.toLowerCase().includes(q)) {
            found++;
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.onclick = () => navigateTo(bookId, parseInt(ch), parseInt(vNum), parseInt(vNum));

            // Highlight match
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            const highlighted = text.replace(regex, '<mark>$1</mark>');

            // Truncate long text around match
            let display = highlighted;
            if (text.length > 150) {
              const matchIdx = text.toLowerCase().indexOf(q);
              const start = Math.max(0, matchIdx - 40);
              const end = Math.min(text.length, matchIdx + q.length + 80);
              const slice = text.substring(start, end);
              display = (start > 0 ? '...' : '') +
                slice.replace(regex, '<mark>$1</mark>') +
                (end < text.length ? '...' : '');
            }

            div.innerHTML = `
              <div class="search-result-ref">${book.name} ${ch}:${vNum}</div>
              <div class="search-result-text">${display}</div>
            `;
            results.appendChild(div);
          }
        }
      }
    }

    if (found === 0) {
      results.innerHTML = '<div class="search-hint">Tsy nahitana</div>';
    } else if (found >= max) {
      const more = document.createElement('div');
      more.className = 'search-hint';
      more.textContent = 'Misy vokatra maro hafa koa...';
      results.appendChild(more);
    }
  }, 200);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// Books screen
// ============================================
function buildBooksScreen() {
  const container = document.getElementById('booksContent');
  let html = '';

  BOOK_ORDER.forEach((group, gi) => {
    const tid = gi === 0 ? 'ot' : 'nt';
    html += `<div class="testament-label" onclick="toggleTestament('${tid}')">
      <span>${group.testament}</span>
      <svg class="testament-chevron" id="chevron-${tid}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>`;
    html += `<div class="books-grid" id="grid-${tid}">`;

    group.books.forEach(book => {
      const chCount = Object.keys(BIBLE_DATA[book.id].chapters).length;
      html += `<div class="book-card" data-book="${book.id}" onclick="selectBook(this, '${book.id}')">
        <div class="book-name">${book.name}</div>
        <div class="book-chapters">${chCount} toko</div>
      </div>`;
    });

    html += `</div>`;
  });

  container.innerHTML = html;

  // Mark current book as active
  const activeCard = container.querySelector(`[data-book="${currentBook}"]`);
  if (activeCard) activeCard.classList.add('active');
}

function toggleTestament(tid) {
  const grid = document.getElementById('grid-' + tid);
  const chevron = document.getElementById('chevron-' + tid);
  grid.classList.toggle('collapsed');
  chevron.classList.toggle('collapsed');
}

// Picker state
let pickerBookId = null;
let pickerChapter = null;
let pickerVerseStart = null;
let pickerVerseEnd = null;

function selectBook(card, bookId) {
  const existing = document.querySelector('.chapter-select');

  // Toggle off if already selected
  if (card.classList.contains('active') && existing) {
    card.classList.remove('active');
    existing.remove();
    resetPicker();
    return;
  }

  // Close any open selector and clear all active cards
  if (existing) existing.remove();
  document.querySelectorAll('.book-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  resetPicker();
  pickerBookId = bookId;

  showChapterGrid(card, bookId);
}

function resetPicker() {
  pickerBookId = null;
  pickerChapter = null;
  pickerVerseStart = null;
  pickerVerseEnd = null;
}

function showChapterGrid(card, bookId) {
  // Remove existing selector
  const existing = document.querySelector('.chapter-select');
  if (existing) existing.remove();

  const book = BIBLE_DATA[bookId];
  const chapters = Object.keys(book.chapters).map(Number).sort((a, b) => a - b);

  let cells = '';
  for (const ch of chapters) {
    cells += `<div class="chapter-cell" onclick="pickChapter(${ch})">${ch}</div>`;
  }

  const selector = document.createElement('div');
  selector.className = 'chapter-select visible';
  selector.innerHTML = `
    <div class="chapter-select-header">
      <div class="picker-pill-wrap">
        <div class="picker-pill" id="pickerPill">${buildPillHTML(book.name, null, null, null)}</div>
        <button class="picker-pill-reset" onclick="resetPickerToChapters()" aria-label="Reset">&times;</button>
      </div>
    </div>
    <div class="chapter-grid">${cells}</div>
  `;

  card.insertAdjacentElement('afterend', selector);
  setTimeout(() => selector.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function pickChapter(ch) {
  pickerChapter = ch;
  pickerVerseStart = null;
  pickerVerseEnd = null;

  const activeCard = document.querySelector('.book-card.active');
  if (!activeCard) return;

  // Remove existing selector
  const existing = document.querySelector('.chapter-select');
  if (existing) existing.remove();

  // Build verse grid
  const book = BIBLE_DATA[pickerBookId];
  const verses = Object.keys(book.chapters[ch]).map(Number).sort((a, b) => a - b);

  let cells = '';
  for (const v of verses) {
    cells += `<div class="chapter-cell" data-verse="${v}" onclick="pickVerse(${v})">${v}</div>`;
  }

  const selector = document.createElement('div');
  selector.className = 'chapter-select visible';
  selector.innerHTML = `
    <div class="chapter-select-header">
      <div class="picker-pill-wrap">
        <div class="picker-pill" id="pickerPill" onclick="openPickerSelection()">${buildPillHTML(book.name, ch, null, null)}</div>
        <button class="picker-add" id="pickerAdd" onclick="addToVakiteny()" aria-label="Ampio">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button class="picker-pill-reset" onclick="resetPickerToChapters()" aria-label="Reset">&times;</button>
      </div>
    </div>
    <div class="chapter-grid">${cells}</div>
  `;

  activeCard.insertAdjacentElement('afterend', selector);
  setTimeout(() => selector.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function pickVerse(v) {
  if (pickerVerseStart === null) {
    pickerVerseStart = v;
    pickerVerseEnd = null;
  } else if (pickerVerseEnd === null) {
    // Ensure start <= end
    if (v < pickerVerseStart) {
      pickerVerseEnd = pickerVerseStart;
      pickerVerseStart = v;
    } else {
      pickerVerseEnd = v;
    }
  } else {
    // Reset and start new selection
    pickerVerseStart = v;
    pickerVerseEnd = null;
  }

  updatePickerPill();
  highlightPickerVerses();
}

function buildPillHTML(bookName, chapter, verseStart, verseEnd) {
  const chClass = chapter != null ? '' : ' empty';
  const vsClass = verseStart != null ? '' : ' empty';
  const veClass = verseEnd != null ? '' : ' empty';
  return `<span class="pill-book pill-seg">${bookName}</span>` +
    `<span class="pill-chapter pill-seg${chClass}">${chapter != null ? chapter : '&nbsp;'}</span>` +
    `<span class="pill-sep">:</span>` +
    `<span class="pill-verse pill-seg${vsClass}">${verseStart != null ? verseStart : '&nbsp;'}</span>` +
    `<span class="pill-sep">-</span>` +
    `<span class="pill-verse pill-seg${veClass}">${verseEnd != null ? verseEnd : '&nbsp;'}</span>`;
}

function updatePickerPill() {
  const pill = document.getElementById('pickerPill');
  if (!pill) return;

  const book = BIBLE_DATA[pickerBookId];
  pill.innerHTML = buildPillHTML(book.name, pickerChapter, pickerVerseStart, pickerVerseEnd);
  const ready = pickerVerseStart !== null;
  pill.classList.toggle('ready', ready);

  const addBtn = document.getElementById('pickerAdd');
  if (addBtn) addBtn.classList.toggle('visible', ready);
}

function resetPickerToChapters() {
  const activeCard = document.querySelector('.book-card.active');
  if (!activeCard || !pickerBookId) return;
  pickerChapter = null;
  pickerVerseStart = null;
  pickerVerseEnd = null;
  showChapterGrid(activeCard, pickerBookId);
}

function highlightPickerVerses() {
  document.querySelectorAll('.chapter-select .chapter-cell').forEach(cell => {
    const v = parseInt(cell.dataset.verse);
    if (isNaN(v)) return;

    cell.classList.remove('selected', 'in-range');

    if (v === pickerVerseStart || v === pickerVerseEnd) {
      cell.classList.add('selected');
    } else if (pickerVerseStart !== null && pickerVerseEnd !== null &&
               v > pickerVerseStart && v < pickerVerseEnd) {
      cell.classList.add('in-range');
    }
  });
}

function openPickerSelection() {
  if (pickerChapter === null) return;
  navigateTo(pickerBookId, pickerChapter, pickerVerseStart, pickerVerseEnd);
}

// ============================================
// Theme
// ============================================
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('darkToggle').classList.toggle('on', isDark);
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#0F1724' : '#F5F8FC';
  saveSetting('dark', isDark);
}

// ============================================
// Font size
// ============================================
function setFontSize(val) {
  fontSize = parseInt(val);
  document.documentElement.style.setProperty('--font-size', fontSize + 'px');
  saveSetting('fontSize', fontSize);
}

// ============================================
// Wake lock
// ============================================
async function toggleWakeLock() {
  const toggle = document.getElementById('wakeLockToggle');
  toggle.classList.toggle('on');
  const isOn = toggle.classList.contains('on');
  saveSetting('wakeLock', isOn);

  if (isOn && 'wakeLock' in navigator) {
    try { wakeLock = await navigator.wakeLock.request('screen'); }
    catch (e) { /* not supported or denied */ }
  } else if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// ============================================
// Persistence (localStorage)
// ============================================
function savePosition() {
  localStorage.setItem('baiboly_book', currentBook);
  localStorage.setItem('baiboly_chapter', currentChapter);
}

function restorePosition() {
  const book = localStorage.getItem('baiboly_book') || 'genesisy';
  const ch = parseInt(localStorage.getItem('baiboly_chapter') || '1');
  navigateTo(book, ch);
}

function saveSetting(key, value) {
  localStorage.setItem('baiboly_' + key, JSON.stringify(value));
}

function loadSettings() {
  // Dark mode
  const dark = JSON.parse(localStorage.getItem('baiboly_dark') || 'false');
  if (dark) {
    isDark = true;
    document.documentElement.classList.add('dark');
    document.getElementById('darkToggle').classList.add('on');
    document.querySelector('meta[name="theme-color"]').content = '#0F1724';
  }

  // Font size
  const fs = JSON.parse(localStorage.getItem('baiboly_fontSize') || '17');
  fontSize = fs;
  document.getElementById('fontSlider').value = fs;
  document.documentElement.style.setProperty('--font-size', fs + 'px');

  // Wake lock
  const wl = JSON.parse(localStorage.getItem('baiboly_wakeLock') ?? 'true');
  document.getElementById('wakeLockToggle').classList.toggle('on', wl);
  if (wl && 'wakeLock' in navigator) {
    navigator.wakeLock.request('screen').then(l => wakeLock = l).catch(() => {});
  }
}

// ============================================
// Tabs (Boky / Vakiteny)
// ============================================
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}

// ============================================
// Vakiteny (reading list)
// ============================================
function loadVakiteny() {
  vakitenyList = JSON.parse(localStorage.getItem('baiboly_vakiteny') || '[]');
}

function saveVakiteny() {
  localStorage.setItem('baiboly_vakiteny', JSON.stringify(vakitenyList));
}

function addToVakiteny() {
  if (!pickerBookId || pickerChapter == null || pickerVerseStart == null) return;

  const book = BIBLE_DATA[pickerBookId];
  const entry = {
    id: Date.now(),
    bookId: pickerBookId,
    bookName: book.name,
    chapter: pickerChapter,
    verseStart: pickerVerseStart,
    verseEnd: pickerVerseEnd || pickerVerseStart
  };

  // Build preview text
  const verses = book.chapters[pickerChapter];
  let preview = '';
  for (let v = entry.verseStart; v <= entry.verseEnd; v++) {
    if (verses[v]) preview += verses[v] + ' ';
  }
  entry.preview = preview.trim().substring(0, 150);
  if (preview.trim().length > 150) entry.preview += '...';

  vakitenyList.push(entry);
  saveVakiteny();
  renderVakiteny();

  // Pulse the vakiteny tab as a save confirmation
  const tab = document.getElementById('tab-vakiteny');
  tab.classList.remove('pulse');
  void tab.offsetWidth; // force reflow to restart animation
  tab.classList.add('pulse');
}

function removeFromVakiteny(id) {
  vakitenyList = vakitenyList.filter(e => e.id !== id);
  saveVakiteny();
  renderVakiteny();
}

function renderVakiteny() {
  const container = document.getElementById('vakitenyContent');
  const empty = document.getElementById('vakitenyEmpty');

  if (vakitenyList.length === 0) {
    empty.style.display = '';
    container.querySelectorAll('.vakiteny-item').forEach(el => el.remove());
    return;
  }

  empty.style.display = 'none';
  container.querySelectorAll('.vakiteny-item').forEach(el => el.remove());

  vakitenyList.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'vakiteny-item';
    div.dataset.idx = idx;
    div.draggable = true;

    const ref = `${entry.bookName} ${entry.chapter}:${entry.verseStart}` +
      (entry.verseEnd !== entry.verseStart ? `-${entry.verseEnd}` : '');

    div.innerHTML = `
      <div class="vakiteny-drag" aria-label="Drag">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </div>
      <div class="vakiteny-item-body" onclick="navigateTo('${entry.bookId}', ${entry.chapter}, ${entry.verseStart}, ${entry.verseEnd})">
        <div class="vakiteny-item-ref">${ref}</div>
        <div class="vakiteny-item-text">${entry.preview}</div>
      </div>
      <button class="vakiteny-delete" onclick="removeFromVakiteny(${entry.id})" aria-label="Fafao">&times;</button>
    `;
    container.appendChild(div);
  });

  setupDragReorder();
}

// ============================================
// Drag reorder (touch + mouse)
// ============================================
let dragSrcIdx = null;

function setupDragReorder() {
  const container = document.getElementById('vakitenyContent');

  // Desktop drag & drop
  container.addEventListener('dragstart', e => {
    const item = e.target.closest('.vakiteny-item');
    if (!item) return;
    dragSrcIdx = parseInt(item.dataset.idx);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.vakiteny-item');
    if (!target) return;
    container.querySelectorAll('.vakiteny-item').forEach(el => el.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.vakiteny-item');
    if (!target) return;
    const toIdx = parseInt(target.dataset.idx);
    reorderVakiteny(dragSrcIdx, toIdx);
  });

  container.addEventListener('dragend', () => {
    container.querySelectorAll('.vakiteny-item').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
    dragSrcIdx = null;
  });

  // Touch drag reorder
  let touchItem = null;
  let touchStartY = 0;
  let touchClone = null;
  let touchIdx = null;

  container.addEventListener('touchstart', e => {
    const handle = e.target.closest('.vakiteny-drag');
    if (!handle) return;
    const item = handle.closest('.vakiteny-item');
    if (!item) return;

    touchIdx = parseInt(item.dataset.idx);
    touchStartY = e.touches[0].clientY;
    touchItem = item;

    // Create floating clone
    touchClone = item.cloneNode(true);
    touchClone.classList.add('drag-clone');
    const rect = item.getBoundingClientRect();
    touchClone.style.width = rect.width + 'px';
    touchClone.style.top = rect.top + 'px';
    touchClone.style.left = rect.left + 'px';
    document.body.appendChild(touchClone);

    item.classList.add('dragging');
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (!touchClone) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const rect = touchItem.getBoundingClientRect();
    touchClone.style.top = (y - rect.height / 2) + 'px';

    // Find drop target
    container.querySelectorAll('.vakiteny-item').forEach(el => {
      el.classList.remove('drag-over');
      const r = el.getBoundingClientRect();
      if (y > r.top && y < r.bottom && el !== touchItem) {
        el.classList.add('drag-over');
      }
    });
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (!touchClone) return;
    const overEl = container.querySelector('.vakiteny-item.drag-over');
    if (overEl) {
      const toIdx = parseInt(overEl.dataset.idx);
      reorderVakiteny(touchIdx, toIdx);
    } else {
      touchItem.classList.remove('dragging');
    }
    touchClone.remove();
    touchClone = null;
    touchItem = null;
    touchIdx = null;
    container.querySelectorAll('.vakiteny-item').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });
  });
}

function reorderVakiteny(fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx == null || toIdx == null) return;
  const [item] = vakitenyList.splice(fromIdx, 1);
  vakitenyList.splice(toIdx, 0, item);
  saveVakiteny();
  renderVakiteny();
}
