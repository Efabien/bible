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
  // Match `class=Chapitre` regardless of attribute order (e.g. `<p align=center class=Chapitre>`).
  const startIdx = html.search(/<p\b[^>]*\bclass=Chapitre\b/);
  const body = startIdx >= 0 ? html.slice(startIdx) : html;

  const out = {};
  const titles = {};
  const subtitles = {};
  // Single-chapter books (Obadia, Filemona, 2/3 Jaona, Joda) have no <p class=Chapitre>.
  // In that case, default to chapter "1" so verses still get collected.
  let currentChapter = startIdx >= 0 ? null : '1';
  if (currentChapter) out[currentChapter] = {};

  // Tolerate any attribute order: match every <p ...>, then extract class from the attrs.
  const paraRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  const classRe = /\bclass=(?:"([^"]+)"|'([^']+)'|([A-Za-z-]+))/;
  let m;
  while ((m = paraRe.exec(body)) !== null) {
    const attrs = m[1];
    let inner = m[2];
    const cm = attrs.match(classRe);
    if (!cm) continue;
    const cls = cm[1] || cm[2] || cm[3];

    if (cls === 'Chapitre') {
      // Salamo (Psalms) uses "PSAUME N" instead of "Chapitre N".
      const ch = clean(inner).match(/(?:Chapitre|PSAUME)\s+(\d+)/i);
      if (ch) {
        currentChapter = ch[1];
        if (!out[currentChapter]) out[currentChapter] = {};
      }
      continue;
    }

    // Salamo superscriptions ("Psaume de David, ..."). Capture per chapter.
    if (cls === 'Sous-Titre') {
      if (currentChapter == null) continue;
      const tx = clean(inner);
      if (!tx) continue;
      subtitles[currentChapter] = subtitles[currentChapter]
        ? subtitles[currentChapter] + ' ' + tx
        : tx;
      continue;
    }

    // Poetic books (Joba, Fitomaniana, parts of others) use class=Posie for verses.
    if (cls !== 'Usuel' && cls !== 'Posie') continue;

    // Some verses (Marka 16:9-20, Jaona 7:53-8:11, Jaona 5:4, Marka 7:16,
    // Asanny-apostoly 24:7) wrap their *entire* text in a green-color bracket
    // span to flag textual-variant / disputed status. Collect each bracket's
    // content so we can fall back to it if no other verse body remains.
    let titleCandidate = null;
    let greenBracketBody = null;
    inner = inner.replace(
      /<span\s+style=['"]color:green['"]\s*>\s*\[([\s\S]*?)\]\s*<\/span>/g,
      (_, t) => {
        const cleaned = clean(t);
        titleCandidate = cleaned;
        greenBracketBody = greenBracketBody ? greenBracketBody + ' ' + cleaned : cleaned;
        return ' ';
      }
    );

    let text = clean(inner);
    if (!text && !greenBracketBody) continue;

    // Some books (e.g. Efesianina ch. 2 & 5) inline the chapter heading inside a
    // class=Usuel paragraph: "Chapitre N. 1 <verse 1 text>". Detect that, switch
    // chapter, and keep the trailing verse text so verse 1 isn't lost.
    const inlineCm = text.match(/^Chapitre\s+(\d+)\.?\s*(.*)$/i);
    if (inlineCm) {
      currentChapter = inlineCm[1];
      if (!out[currentChapter]) out[currentChapter] = {};
      text = inlineCm[2].trim();
    }

    if (currentChapter == null) continue;

    let verseNum, verseText;
    const vm = text.match(/^(\d+)\s+([\s\S]+)$/);
    if (vm) {
      verseNum = vm[1];
      verseText = vm[2].trim();
      // Bare `[Title]` immediately after the verse number — used in Jeremia's
      // prophecy section headers (no <span> wrapper). Capture as title.
      const bareTitle = verseText.match(/^\[([^\]]+)\]\s*([\s\S]+)$/);
      if (bareTitle) {
        titleCandidate = clean(bareTitle[1]);
        verseText = bareTitle[2].trim();
      }
    } else {
      // Disputed-verse case: paragraph was just "<N>" with the body inside a
      // green-bracket span we already stripped. Use the bracket body as the verse.
      const onlyNum = text.match(/^(\d+)\s*$/);
      if (!onlyNum || !greenBracketBody) continue;
      verseNum = onlyNum[1];
      verseText = greenBracketBody;
      titleCandidate = null; // the bracket WAS the verse, not a title
    }

    out[currentChapter][verseNum] = verseText;

    if (titleCandidate) {
      if (!titles[currentChapter]) titles[currentChapter] = {};
      titles[currentChapter][verseNum] = titleCandidate;
    }
  }

  out.__titles = titles;
  if (Object.keys(subtitles).length) out.__subtitles = subtitles;
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
