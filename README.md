# Baiboly

A simple, offline-first Malagasy Bible reader built as a Progressive Web App (PWA).

## Features

- **Read** the full Malagasy Bible (66 books, Old & New Testament)
- **Search** across all books, chapters, and verses with instant results
- **Offline** — all text is bundled, no internet needed
- **Dark mode** toggle
- **Adjustable font size**
- **Remembers your reading position** between sessions
- **Installable** on mobile and desktop via PWA

## Getting Started

```bash
# Install dependencies (none required beyond Node.js)

# Build the Bible data and start the dev server
npm start
```

This runs two steps:
1. `npm run build:data` — compiles the JSON Bible files from `baiboly-json/` into a single `bible-data.js` bundle
2. `npm run dev` — starts a local development server

Then open the URL shown in your terminal.

## Project Structure

```
baiboly-json/          # Source Bible text (JSON, one file per book)
  Testameta taloha/    #   Old Testament (39 books)
  Testameta vaovao/    #   New Testament (27 books)
scripts/
  build-data.js        # Compiles JSON files into bible-data.js
  dev-server.js        # Local dev server
src/
  index.html           # App shell
  app.js               # Main application logic
  style.css            # Styles (light + dark themes)
  bible-data.js        # Generated — bundled Bible text
  sw.js                # Service worker for offline caching
  manifest.json        # PWA manifest
  icon-192.png         # App icon (192x192)
  icon-512.png         # App icon (512x512)
desing/
  index.html           # Design prototype / reference mockup
SPEC.md                # Detailed app specification
```

## How It Works

The app is a single-page PWA served as static files. A build step (`build-data.js`) merges all per-book JSON files into one JavaScript module that the app loads at startup. A service worker caches everything for full offline support.

## Screens

1. **Reader** — paragraph-format chapter view with inline verse numbers, swipe navigation, and a scroll progress bar
2. **Search** — slides down from the reader header; search-as-you-type across the entire Bible
3. **Book Picker** — grid of books grouped by testament; tap to expand chapter list
4. **Settings** — dark mode, font size, keep screen awake

## License

Private project.
