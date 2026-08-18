<div align="center">

# MIREVA
### Premium Visual Gallery & Creative Image Workspace

**Discover. Curate. Experience.**

A production-quality responsive image gallery and creative visual workspace built with
**HTML5 · CSS3 · Vanilla JavaScript (ES6 Modules)** — no frameworks, no build step, no backend.

[![HTML5](https://img.shields.io/badge/HTML5-Semantic-E85D4A?style=for-the-badge&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-Custom%20Properties-C44569?style=for-the-badge&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-F4A261?style=for-the-badge&logo=javascript&logoColor=1a1a1a)](#)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-E9C46A?style=for-the-badge&logo=pwa&logoColor=1a1a1a)](#)
[![Accessibility](https://img.shields.io/badge/A11y-WCAG%20Minded-3F8F6B?style=for-the-badge)](#)

<img src="screenshots/04-dashboard-light.png" alt="MIREVA dashboard" width="900">

</div>

---

## Overview

**MIREVA** is a personal visual workspace: a place to browse a curated image library, search and
filter it, keep favourites, build your own collections, upload your own photographs, adjust them
with a lightweight editor, and present them full screen — all running entirely in the browser and
persisted on your own device.

It was built for the **CodeAlpha Frontend Development Internship — Task 1: Image Gallery**, and then
taken well past the brief to demonstrate professional frontend engineering: modular architecture,
real state management, two persistence layers, accessibility, performance, motion design and PWA
offline support.

| | |
|---|---|
| **Internship** | CodeAlpha Frontend Development Internship |
| **Domain** | Frontend Development |
| **Task** | Task 1 — Image Gallery |
| **Author** | Nilusha Madhuwanthi |
| **Stack** | HTML5, CSS3, Vanilla JavaScript ES6+ |
| **Dependencies** | None at runtime (fonts and icons are self-hosted) |

---

## CodeAlpha Task 1 — requirements checklist

The original brief asked for an image gallery with JavaScript navigation. Every one of those
requirements is implemented and working:

| Requirement | Status | Where |
|---|---|---|
| Image gallery using HTML/CSS | ✅ | `pages/gallery.html`, `css/gallery.css` |
| JavaScript navigation | ✅ | `js/gallery.js`, `js/lightbox.js` |
| Previous / Next buttons | ✅ | Lightbox arrows + `←` / `→` keys |
| Lightbox view | ✅ | `js/lightbox.js` — full screen, zoom, pan, metadata |
| Hover effects | ✅ | Lift, image zoom, caption + favourite reveal |
| Smooth transitions | ✅ | 200–400 ms motion system, `css/animations.css` |
| Responsive design | ✅ | Phone → tablet → laptop → ultrawide, per-breakpoint design |
| Image filters / categories | ✅ | 8 categories + orientation, aspect, favourites, recency |

---

## Feature tour

### 1 · Three-screen onboarding + personalisation

Shown once on first visit, remembered in `localStorage`, and replayable from Settings.
The optional interest picker feeds the dashboard's featured strip — real personalisation from
real stored preferences, not a fake "AI" label.

<img src="screenshots/01-onboarding.png" alt="MIREVA onboarding screen one" width="850">
<img src="screenshots/02-onboarding-features.png" alt="MIREVA onboarding — curate your visual world" width="850">
<img src="screenshots/03-personalisation.png" alt="MIREVA interest picker" width="850">

### 2 · Editorial dashboard

An asymmetric image collage with editorial labels, real statistics read from local storage
(never random numbers), quick actions with keyboard shortcuts, a featured strip driven by your
chosen interests, and your recent history.

<img src="screenshots/04-dashboard-light.png" alt="MIREVA dashboard, light theme" width="850">

### 3 · Genuine dark theme

Not an inverted palette — a separately designed set of deep plum, charcoal, muted coral and soft
peach tokens with contrast maintained throughout.

<img src="screenshots/05-dashboard-dark.png" alt="MIREVA dashboard, dark theme" width="850">

### 4 · Gallery — masonry, grid and focus

Three layouts, switchable instantly and remembered between sessions. Masonry uses CSS columns so
there is no layout-thrashing JavaScript; images are lazy-loaded with intrinsic dimensions to avoid
layout shift.

<img src="screenshots/06-gallery-masonry.png" alt="Masonry layout" width="850">
<img src="screenshots/07-gallery-grid.png" alt="Grid layout" width="850">

### 5 · Search, categories, sorting and advanced filters

Live search across **title, category, tags and description**; eight categories with live counts;
six sort orders; and an advanced panel for orientation, aspect ratio, favourites and recency.
Active filters appear as removable pills, and the result count is announced to screen readers.

<img src="screenshots/08-search-filters.png" alt="Advanced filters" width="850">
<img src="screenshots/09-search-results.png" alt="Live search results" width="850">

### 6 · Cinematic lightbox

Full-screen viewing with previous/next, zoom in/out/reset, drag-to-pan, double-click zoom,
pinch-to-zoom, swipe navigation, a filmstrip, and complete keyboard control.

| Key | Action | | Key | Action |
|---|---|---|---|---|
| `Esc` | Close | | `+` | Zoom in |
| `←` | Previous | | `−` | Zoom out |
| `→` | Next | | `0` | Reset zoom |
| `F` | Favourite | | `I` | Image info |

<img src="screenshots/10-lightbox.png" alt="MIREVA lightbox" width="850">

### 7 · Image details + Colour Explorer

Real metadata only — dimensions, aspect ratio, orientation, file type, file size, date added,
favourite state, personal view count and source. Where a value genuinely is not available, MIREVA
says *"Metadata unavailable"* rather than inventing one.

The Colour Explorer down-samples the image into a canvas and buckets the pixels to estimate its
dominant, secondary and accent colours. Click any swatch to copy the hex. If the canvas cannot be
read, MIREVA says so instead of fabricating colours.

<img src="screenshots/11-lightbox-details-colours.png" alt="Image details and colour explorer" width="850">

### 8 · Image effects & lightweight editor

Seven live adjustments (brightness, contrast, saturation, warmth, blur, grayscale, sepia), six
presets, rotate and flip. Preview uses CSS filters for speed; **Apply** and **Export PNG** re-render
through Canvas at full resolution. Originals are never destroyed — applying saves a copy (or,
for your own uploads, offers to replace).

<img src="screenshots/12-image-editor.png" alt="MIREVA image editor" width="850">

### 9 · Favourites

<img src="screenshots/13-favourites.png" alt="Favourites" width="850">

### 10 · Collections

Create, rename, delete, add and remove images. Each card shows a live three-image cover built from
its actual contents.

<img src="screenshots/14-collections.png" alt="Collections" width="850">

### 11 · Recently viewed + personal view counts

A private, local history with open / favourite / remove actions. View counts are labelled
**"Viewed by you"** — MIREVA never claims global popularity it cannot know.

<img src="screenshots/15-recently-viewed.png" alt="Recently viewed" width="850">

### 12 · Local upload

File picker and drag & drop, multiple selection, per-file title and category, live previews,
type and size validation with friendly errors, and removal before committing. Accepted images are
stored as blobs in **IndexedDB** — nothing is ever uploaded to a server.

<img src="screenshots/16-upload.png" alt="Upload with drag and drop" width="850">

### 13 · Presentation mode

A full-screen slideshow over all images, a category, your favourites, your recent history or any
collection, with play/pause, manual navigation, 3 / 5 / 8-second speeds, a progress bar, an
auto-hiding control bar and a subtle Ken Burns drift that is disabled under reduced motion.

<img src="screenshots/17-presentation.png" alt="Presentation mode" width="850">

### 14 · Settings

Theme (light / dark / system), default layout, image quality, reduce motion, animations, destructive
confirmations, interests, a live storage meter across localStorage and IndexedDB, restore hidden
images, replay onboarding, and two clearly separated reset actions.

<img src="screenshots/18-settings.png" alt="Settings" width="850">

### 15 · Command centre — `Ctrl` / `⌘` + `K`

Keyboard-first navigation with arrow-key selection, filtering and one-key shortcuts
(`G` then `H`, `G` then `G`, `G` then `F`, …).

<img src="screenshots/19-command-centre.png" alt="Command centre" width="850">

### 16 · Responsive by design

Each breakpoint is designed, not merely scaled: an editorial sidebar on desktop, a bottom
navigation bar with a drawer for secondary pages on mobile, touch-friendly targets, landscape
handling, and hover effects that resolve to always-visible states on touch devices.

<p>
<img src="screenshots/20-mobile-dashboard.png" alt="Mobile dashboard" width="255">
<img src="screenshots/21-mobile-gallery.png" alt="Mobile gallery" width="255">
<img src="screenshots/22-mobile-lightbox.png" alt="Mobile lightbox" width="255">
</p>

### 17 · PWA — installable and genuinely offline

`manifest.json` plus a service worker that pre-caches the full application shell — every page,
stylesheet, module, font, icon and library image (165 entries). With the network disconnected the
gallery still loads completely and an **Offline Mode** banner appears.

> MIREVA does **not** claim cloud synchronisation. Everything is local, and the UI says so.

<img src="screenshots/23-offline-pwa.png" alt="MIREVA running fully offline" width="850">

---

## The image library

The starter library is **48 pieces of artwork across 8 categories**, generated procedurally as SVG
by `scripts/generate-assets.py` and committed to the repository.

This was a deliberate engineering decision:

- the project is **100 % self-contained** — no image CDN, no API key, no rate limit, no dead links;
- the service worker can honestly pre-cache **every** asset, so offline mode is real;
- there are no third-party licensing or attribution questions;
- SVG stays crisp at any zoom level and the whole library is under 500 KB.

Every image carries real, non-fabricated metadata (true dimensions, orientation, file type, aspect
ratio). Add your own photographs at any time from the **Upload** page — they sit alongside the
library everywhere in the app.

---

## Architecture

```
MIREVA/
├── index.html                     # Dashboard
├── pages/
│   ├── gallery.html               # Masonry / grid / focus, search, filters
│   ├── favorites.html
│   ├── collections.html
│   ├── upload.html
│   ├── presentation.html
│   ├── recently-viewed.html
│   └── settings.html
│
├── css/                           # One stylesheet per concern
│   ├── variables.css              # Design tokens (light + dark)
│   ├── fonts.css                  # Self-hosted @font-face
│   ├── reset.css
│   ├── global.css                 # Buttons, fields, cards, toasts, modals
│   ├── layout.css                 # App shell, sidebar, topbar, bottom nav
│   ├── animations.css             # Motion system + reduced-motion overrides
│   ├── dashboard.css   gallery.css   lightbox.css
│   ├── upload.css      collections.css  editor.css
│   ├── presentation.css settings.css    onboarding.css  command.css
│   └── responsive.css             # Per-breakpoint refinements
│
├── js/
│   ├── app.js                     # bootApp() — builds the shell, boots everything
│   ├── state.js                   # ImageRepository + AppState + event bus
│   ├── storage.js                 # StorageService (localStorage) + ImageStore (IndexedDB)
│   ├── library.js                 # Generated seed library (data only)
│   ├── gallery.js                 # GalleryManager + layout switcher
│   ├── lightbox.js                # LightboxController
│   ├── search.js                  # SearchController + matching
│   ├── filters.js                 # FilterController + pure filter/sort functions
│   ├── favorites.js               # FavoritesManager
│   ├── collections.js             # CollectionManager
│   ├── upload.js                  # UploadController + upload manager
│   ├── editor.js                  # EditorController (CSS preview → Canvas render)
│   ├── presentation.js            # PresentationController
│   ├── command-center.js          # CommandCenter (⌘K)
│   ├── onboarding.js              # OnboardingFlow
│   ├── theme.js                   # ThemeManager
│   ├── notifications.js           # Toast
│   ├── dialogs.js                 # confirm / prompt / picker / choose
│   ├── accessibility.js           # Focus trap, announcer, scroll lock
│   ├── icons.js                   # Inlined 24×24 icon set
│   ├── utils.js                   # Shared helpers
│   └── pages/                     # One thin controller per page
│       ├── dashboard.js   gallery-page.js   favorites-page.js
│       ├── collections-page.js    upload-page.js    presentation-page.js
│       └── recent-page.js         settings-page.js
│
├── assets/
│   ├── images/        # 48 full-size SVG artworks
│   ├── thumbnails/    # 48 lighter thumbnails
│   ├── fonts/         # Playfair Display + Manrope (woff2, latin subset)
│   └── icons/         # App icons (SVG + PNG)
│
├── scripts/generate-assets.py     # Regenerates the seed library
├── screenshots/                   # Documentation screenshots
├── manifest.json
├── sw.js
├── .gitignore
└── README.md
```

### Design principles applied

- **One responsibility per module.** `GalleryManager` renders tiles; it does not know about search.
  `FilterController` renders the panel; the filtering itself is pure functions that are unit-testable.
- **A single source of truth.** `ImageRepository` merges the shipped library with IndexedDB uploads
  and applies hidden-image state; `AppState` owns favourites, collections, history and preferences.
  UI modules never touch `localStorage` directly.
- **Events, not polling.** A tiny event bus notifies every open view when data changes, so
  favouriting an image in the lightbox updates the sidebar counter and the dashboard instantly.
- **Progressive enhancement & graceful failure.** Private-mode storage, quota errors, unreadable
  files, tainted canvases and missing IndexedDB are all handled with friendly messages — never a
  raw exception, never `alert()`.
- **Tokens, not magic values.** Every colour, space, radius, shadow and duration is a CSS custom
  property defined once in `variables.css`.

---

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `aside`, `section`, `figure`) and a skip link
- Full keyboard operation, including the gallery, lightbox, dialogs and command centre
- Focus trapping and focus restoration in every overlay; scroll locking while open
- `aria-pressed`, `aria-current`, `aria-expanded`, `aria-modal`, `role="dialog"`, live regions
- Polite screen-reader announcements for result counts, zoom level and favourite changes
- Visible focus rings that survive theming; `prefers-contrast: more` support
- Honest alt text — uploaded images without a title are described as **"Untitled Image"** rather
  than given an invented description
- `prefers-reduced-motion` respected, **plus** an in-app reduce-motion setting and a full
  animations-off switch

## Performance

- Lazy loading with `loading="lazy"` and `decoding="async"`; the first four tiles load eagerly
- Intrinsic `width`/`height` and `aspect-ratio` on every tile to prevent cumulative layout shift
- Masonry via CSS columns — no measurement loop, no reflow storm
- Debounced search, throttled resize work, delegated event listeners (one per gallery, not per tile)
- Lighter SVG thumbnails in the grid; full-resolution assets only in the lightbox and editor
- Object URLs for uploads are created once, cached, and revoked on delete
- Self-hosted subset fonts with `font-display: swap` — no third-party font request

## Data & privacy

| Data | Where | Key |
|---|---|---|
| Theme | localStorage | `mireva_theme` |
| Onboarding completion | localStorage | `mireva_onboarding_complete` |
| Preferences & interests | localStorage | `mireva_preferences` |
| Favourites | localStorage | `mireva_favorites` |
| Recently viewed | localStorage | `mireva_recently_viewed` |
| View counts | localStorage | `mireva_view_counts` |
| Filters | localStorage | `mireva_filters` |
| Layout | localStorage | `mireva_layout` |
| Collections | localStorage | `mireva_collections` |
| Hidden library images | localStorage | `mireva_hidden_images` |
| **Uploaded image blobs** | **IndexedDB** (`mireva-db` → `images`) | — |

No account. No server. No analytics. No tracking. Nothing leaves your device.

---

## How to run

MIREVA is static — but it must be served over `http://`, not opened as a `file://` path, because
service workers, ES modules and Canvas pixel reads all require an origin.

**VS Code (recommended)**

1. Open the `MIREVA` folder in VS Code.
2. Install the **Live Server** extension (`ritwickdey.liveserver`) — it is already listed in
   `.vscode/extensions.json`, so VS Code will offer it automatically.
3. Right-click `index.html` → **Open with Live Server**.

**Any terminal**

```bash
# Python 3
python3 -m http.server 5500

# or Node
npx serve .
```

Then open <http://localhost:5500>.

**Regenerating the artwork library** (optional)

```bash
python3 scripts/generate-assets.py
```

---

## Browser support

Tested in Chromium-based browsers. Uses widely supported modern platform features: ES modules,
CSS custom properties, `aspect-ratio`, `color-mix()`, `<dialog>`, IndexedDB, Service Worker,
Pointer Events and the Fullscreen API. Every one of them fails gracefully if unavailable.

---

## Quality assurance

Verified in an automated headless-Chromium pass across all eight pages, both themes, desktop and
mobile viewports:

- **0** console errors, **0** page errors, **0** failed requests
- **0** dead buttons or broken links, **0** broken images
- **0** unintended horizontal scrolling at any breakpoint
- Onboarding, search, filters, sorting, layout switching, favourites, collections, upload,
  editor, presentation, command centre and every dialog exercised end-to-end
- Offline reload verified: 48 images and the full shell served from the service-worker cache

---

## Future enhancements

- Optional export / import of the whole workspace as a single JSON + blob archive
- Crop and straighten tools in the editor
- Tag editing and bulk actions in the gallery
- Multi-select drag-to-reorder inside collections
- Optional Web Share integration for individual images

---

## LinkedIn demo

A suggested recording flow: onboarding → dashboard → gallery → masonry-to-grid → search →
category filter → lightbox → next/previous → zoom → favourite → favourites page → create a
collection → drag & drop upload → image effects → editor → presentation mode → dark mode →
command centre → mobile layout → back to the dashboard.

A full illustrated walkthrough is included as **`MIREVA_Project_Showcase.pdf`**.

---

<div align="center">

**Nilusha Madhuwanthi**
CodeAlpha Frontend Development Internship · Task 1 — Image Gallery

*Built with HTML, CSS and vanilla JavaScript. No frameworks were used.*

</div>
