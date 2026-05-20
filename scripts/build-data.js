const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'baiboly-json-v2');
const OUT = path.join(__dirname, '..', 'src', 'bible-data.js');

// Canonical book order with display names
const BOOKS = {
  'Testameta taloha': [
    { file: 'genesisy', name: 'Genesisy' },
    { file: 'eksodosy', name: 'Eksodosy' },
    { file: 'levitikosy', name: 'Levitikosy' },
    { file: 'nomery', name: 'Nomery' },
    { file: 'deoteronomia', name: 'Deoteronomia' },
    { file: 'josoa', name: 'Josoa' },
    { file: 'mpitsara', name: 'Mpitsara' },
    { file: 'rota', name: 'Rota' },
    { file: 'samoela-voalohany', name: '1 Samoela' },
    { file: 'samoela-faharoa', name: '2 Samoela' },
    { file: 'mpanjaka-voalohany', name: '1 Mpanjaka' },
    { file: 'mpanjaka-faharoa', name: '2 Mpanjaka' },
    { file: 'tantara-voalohany', name: '1 Tantara' },
    { file: 'tantara-faharoa', name: '2 Tantara' },
    { file: 'ezra', name: 'Ezra' },
    { file: 'nehemia', name: 'Nehemia' },
    { file: 'estera', name: 'Estera' },
    { file: 'joba', name: 'Joba' },
    { file: 'salamo', name: 'Salamo' },
    { file: 'ohabolana', name: 'Ohabolana' },
    { file: 'mpitoriteny', name: 'Mpitoriteny' },
    { file: 'tononkirani-solomona', name: 'Tononkiran\'i Solomona' },
    { file: 'isaia', name: 'Isaia' },
    { file: 'jeremia', name: 'Jeremia' },
    { file: 'fitomaniana', name: 'Fitomaniana' },
    { file: 'ezekiela', name: 'Ezekiela' },
    { file: 'daniela', name: 'Daniela' },
    { file: 'hosea', name: 'Hosea' },
    { file: 'joela', name: 'Joela' },
    { file: 'amosa', name: 'Amosa' },
    { file: 'obadia', name: 'Obadia' },
    { file: 'jona', name: 'Jona' },
    { file: 'mika', name: 'Mika' },
    { file: 'nahoma', name: 'Nahoma' },
    { file: 'habakoka', name: 'Habakoka' },
    { file: 'zefania', name: 'Zefania' },
    { file: 'hagay', name: 'Hagay' },
    { file: 'zakaria', name: 'Zakaria' },
    { file: 'malakia', name: 'Malakia' },
  ],
  'Testameta vaovao': [
    { file: 'matio', name: 'Matio' },
    { file: 'marka', name: 'Marka' },
    { file: 'lioka', name: 'Lioka' },
    { file: 'jaona', name: 'Jaona' },
    { file: 'asanny-apostoly', name: 'Asan\'ny Apostoly' },
    { file: 'romanina', name: 'Romanina' },
    { file: '1-korintianina', name: '1 Korintianina' },
    { file: '2-korintianina', name: '2 Korintianina' },
    { file: 'galatianina', name: 'Galatianina' },
    { file: 'efesianina', name: 'Efesianina' },
    { file: 'filipianina', name: 'Filipianina' },
    { file: 'kolosianina', name: 'Kolosianina' },
    { file: '1-tesalonianina', name: '1 Tesalonianina' },
    { file: '2-tesalonianina', name: '2 Tesalonianina' },
    { file: '1-timoty', name: '1 Timoty' },
    { file: '2-timoty', name: '2 Timoty' },
    { file: 'titosy', name: 'Titosy' },
    { file: 'filemona', name: 'Filemona' },
    { file: 'hebreo', name: 'Hebreo' },
    { file: 'jakoba', name: 'Jakoba' },
    { file: '1-petera', name: '1 Petera' },
    { file: '2-petera', name: '2 Petera' },
    { file: '1-jaona', name: '1 Jaona' },
    { file: '2-jaona', name: '2 Jaona' },
    { file: '3-jaona', name: '3 Jaona' },
    { file: 'joda', name: 'Joda' },
    { file: 'apokalypsy', name: 'Apokalypsy' },
  ]
};

const bible = {};
let totalVerses = 0;

for (const [testament, books] of Object.entries(BOOKS)) {
  for (const book of books) {
    const filePath = path.join(BASE, testament, book.file + '.json');
    if (!fs.existsSync(filePath)) {
      console.error(`MISSING: ${filePath}`);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Filter out non-numeric keys like "meta"
    const data = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!isNaN(parseInt(k))) data[k] = v;
    }
    const chapterCount = Object.keys(data).length;
    let verseCount = 0;
    for (const ch of Object.values(data)) {
      verseCount += Object.keys(ch).length;
    }
    totalVerses += verseCount;

    bible[book.file] = {
      name: book.name,
      testament: testament,
      chapters: data
    };
  }
}

// Write as a JS module (simple global assignment for no-build-tool setup)
const output = `// Auto-generated — do not edit. Run: npm run build:data
// ${Object.keys(bible).length} books, ${totalVerses} verses
window.BIBLE_DATA = ${JSON.stringify(bible)};

window.BOOK_ORDER = ${JSON.stringify(
  Object.entries(BOOKS).map(([testament, books]) => ({
    testament,
    books: books.map(b => ({ id: b.file, name: b.name }))
  }))
)};
`;

fs.writeFileSync(OUT, output, 'utf8');
const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`Built bible-data.js: ${Object.keys(bible).length} books, ${totalVerses} verses, ${sizeMB} MB`);
