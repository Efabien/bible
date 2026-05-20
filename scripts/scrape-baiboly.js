#!/usr/bin/env node
const fs = require('fs');

process.stdout.on('error', (err) => { if (err.code === 'EPIPE') process.exit(0); });

const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  ocirc: 'ô', ecirc: 'ê', acirc: 'â', ucirc: 'û', icirc: 'î',
  eacute: 'é', egrave: 'è', agrave: 'à', ugrave: 'ù',
  ouml: 'ö', auml: 'ä', uuml: 'ü', ntilde: 'ñ', ccedil: 'ç',
  laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, n) ? NAMED_ENTITIES[n] : m);
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

function clean(s) {
  return decodeEntities(stripTags(s)).replace(/\s+/g, ' ').trim();
}

async function scrape(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  const html = await res.text();

  // Skip the breadcrumb / chapter-index links at the top — start at the first chapter heading.
  const startIdx = html.search(/<p\s+class=Chapitre\b/);
  const body = startIdx >= 0 ? html.slice(startIdx) : html;

  const out = {};
  const titles = {};
  // Single-chapter books (Obadia, Filemona, 2/3 Jaona, Joda) have no <p class=Chapitre>.
  // In that case, default to chapter "1" so verses still get collected.
  let currentChapter = startIdx >= 0 ? null : '1';
  if (currentChapter) out[currentChapter] = {};

  const paraRe = /<p\s+class=([A-Za-z-]+)\b[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = paraRe.exec(body)) !== null) {
    const cls = m[1];
    let inner = m[2];

    if (cls === 'Chapitre') {
      // Salamo (Psalms) uses "PSAUME N" instead of "Chapitre N".
      const cm = clean(inner).match(/(?:Chapitre|PSAUME)\s+(\d+)/i);
      if (cm) {
        currentChapter = cm[1];
        if (!out[currentChapter]) out[currentChapter] = {};
      }
      continue;
    }

    // Poetic books (Joba, Fitomaniana, parts of others) use class=Posie for verses.
    if ((cls !== 'Usuel' && cls !== 'Posie') || currentChapter == null) continue;

    let titleCandidate = null;
    inner = inner.replace(
      /<span\s+style=['"]color:green['"]\s*>\s*\[([\s\S]*?)\]\s*<\/span>/g,
      (_, t) => {
        titleCandidate = clean(t);
        return ' ';
      }
    );

    const text = clean(inner);
    if (!text) continue;

    const vm = text.match(/^(\d+)\s+([\s\S]+)$/);
    if (!vm) continue;

    const verseNum = vm[1];
    out[currentChapter][verseNum] = vm[2].trim();

    if (titleCandidate) {
      if (!titles[currentChapter]) titles[currentChapter] = {};
      titles[currentChapter][verseNum] = titleCandidate;
    }
  }

  out.__titles = titles;
  return out;
}

async function main() {
  const [, , url, outputPath] = process.argv;
  if (!url) {
    console.error('Usage: node scripts/scrape-baiboly.js <url> [outputPath]');
    process.exit(1);
  }
  const data = await scrape(url);
  const json = JSON.stringify(data, null, 4);
  if (outputPath) {
    fs.writeFileSync(outputPath, json);
    console.error(`Wrote ${outputPath}`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
