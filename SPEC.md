# Baiboly — Malagasy Bible App

## What is this

A simple, focused Android app for reading the Bible in Malagasy. The entire interface is in Malagasy. The app does two things well: **read** and **search**. Nothing else gets in the way.

## The content

The full Bible text lives in the `baiboly-json/` folder, organized like this:

- `Testameta taloha/` — Old Testament, 39 books (e.g. `genesisy.json`, `salamo.json`)
- `Testameta vaovao/` — New Testament, 27 books (e.g. `jaona.json`, `apokalypsy.json`)

Each JSON file represents one book. The structure is:

```
{
  "1": {              ← chapter number (string key)
    "1": "verse text",  ← verse number (string key): verse content
    "2": "verse text",
    ...
  },
  "2": { ... },
  ...
}
```

All text is in Malagasy. All 66 books, every chapter, every verse — the data is complete.

## What the app looks like

There is an HTML/CSS design sketch in `desing/index.html` that shows exactly how the app should look and behave. Open it in a browser to see and interact with the prototype. The sketch defines the layout, colors, typography, interactions, and screen flow. **The final app should match this design as closely as possible.**

Key design decisions already made:

- **Color palette**: Blue and white tones (see CSS variables in the sketch)
- **Typography**: Serif font for reading text, sans-serif for UI elements
- **Verse numbers**: Small, inline, subtle — not distracting
- **Text layout**: Paragraph format (not one line per verse)
- **Dark mode**: Deep navy palette, togglable

## Screens

### 1. Reader (home screen)

This is where the user spends most of their time. It opens to the last passage they were reading.

- The chapter text is displayed in paragraph format with small inline verse numbers
- A thin progress bar at the top shows how far through the chapter the user is (based on scroll position)
- The header shows the current book and chapter name (e.g. "Genesisy 1") — tapping it goes to the book picker
- Swipe left/right or tap previous/next buttons to move between chapters
- A search bar is hidden by default — the user pulls it down by tapping the search icon

### 2. Search

Not a separate screen — it slides down from the top of the reader.

- Search-as-you-type: results appear instantly as the user types
- Searches across all 66 books, all chapters, all verses
- Each result shows the reference (book, chapter, verse) and the matching text with the search term highlighted
- Tapping a result navigates directly to that passage in the reader
- The search must work well with Malagasy text (diacritics, apostrophes like in "Andriamanitra")

### 3. Book picker

A grid view for navigating to any book and chapter.

- Books are grouped into two sections: **Testameta Taloha** (Old Testament) and **Testameta Vaovao** (New Testament)
- Each book is shown as a card with the book name and chapter count
- Tapping a book expands a chapter number grid below it (and closes any other open chapter grid)
- Tapping a chapter number navigates to that chapter in the reader

### 4. Settings

Simple settings screen:

- Dark mode toggle
- Font size slider (affects reading text)
- Keep screen awake toggle

## Behavior

- **Remember reading position**: When the user closes and reopens the app, it should open to the exact book, chapter, and scroll position they left off at
- **Offline-first**: All Bible text is bundled with the app. No internet needed. Ever.
- **Fast**: Navigation between chapters and search results should feel instant
- **Smooth transitions**: Screen changes and search sliding down should be animated, not jarring
- **The entire UI is in Malagasy**: button labels, section headers, placeholders — everything

## What this app is NOT

- No user accounts or sign-in
- No social features, sharing, or comments
- No audio playback
- No daily devotionals or notifications
- No study notes or cross-references
- No ads
- No internet requirement

Just reading. Just searching. That's it.
