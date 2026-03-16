# বাংলা পাঠাগার · Bangla Library
## Project Specification

**Version:** 1.8 — Final  
**Date:** March 2026  
**Status:** In Development  
**Live URL:** https://shahriarspace.github.io/bangla-library  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Features & Pages](#3-features--pages)
4. [Content Strategy & SEO](#4-content-strategy--seo)
5. [Publishing Workflow](#5-publishing-workflow)
6. [Scheduled Publishing Pipeline](#6-scheduled-publishing-pipeline)
7. [Analytics & Read Counter](#7-analytics--read-counter)
8. [User Authentication & Personalisation](#8-user-authentication--personalisation)
9. [Giscus Comments & Custom Theme](#9-giscus-comments--custom-theme)
10. [Bot Account & Token Setup](#10-bot-account--token-setup)
11. [Roadmap](#11-roadmap)

---

## 1. Project Overview

### Vision

A free, bilingual digital library of classical Bengali literature — presenting original Bangla texts alongside English translations, side by side, in a beautiful and accessible reading experience.

### Mission

Make the rich literary heritage of Bengal accessible to the global Bengali diaspora, language learners, academics, and anyone curious about one of the world's great literary traditions.

### Target Audience

| Audience | Need |
|---|---|
| Bangladeshi & Bengali diaspora (UK, Germany, USA, Canada) | Connect with cultural roots, read classics they couldn't access growing up |
| Second-generation diaspora | Understand Bangla literature through English translations |
| Academics & students | Comparative literature, South Asian studies, linguistic research |
| Bangla language learners | Context-rich reading with parallel translation |
| General readers | Discover Nobel Prize-winning and world-class literature |

### Core Value Proposition

No other platform offers a unified, high-quality, side-by-side bilingual reading experience for classical Bangla literature. This fills a genuine gap that fragmented PDFs, low-quality OCR scans, and scattered translation sites have failed to address.

### Principles

- **Free forever** — no paywalls, no ads, no subscriptions
- **Public domain only** — all content legally verified as copyright-free
- **Quality over quantity** — accurate translations, clean text, beautiful presentation
- **Open source** — code and content open for community contribution
- **Privacy respecting** — no user tracking, no data selling

---

## 2. Tech Stack & Architecture

### Overview

```
Static Site (Astro SSG)
  ├── Content: JSON files in Git
  ├── Frontend: Astro + React Islands
  ├── Search: Pagefind (client-side)
  ├── Hosting: GitHub Pages
  ├── DNS: Cloudflare
  └── Interactions: GitHub API + Cloudflare Worker
```

### Core Technologies

| Layer | Technology | Reason |
|---|---|---|
| Framework | Astro 4.x (SSG mode) | Static output, React islands, content collections, sitemap |
| UI Components | React 18 | Bilingual reader, author timeline, interaction island |
| Styling | Inline CSS + CSS variables | No build dependency, fast, consistent theming |
| Content | Astro Content Collections (JSON) | Type-safe, auto-generates pages, scalable |
| Search | Pagefind | Runs in browser, no server, indexes all text at build time |
| Hosting | GitHub Pages | Free, reliable, Git-native deployment |
| CI/CD | GitHub Actions | Auto-build and deploy on every push to main |
| DNS | Cloudflare | Already in use, fast CDN, easy domain management |
| Interactions | GitHub API + Cloudflare Worker | Anonymous likes + comments via bot account |
| Comments (GitHub users) | Giscus (GitHub Discussions) | Threaded, reactions, custom theme |
| Comments (anonymous) | Cloudflare Worker → banglalib-bot | Posts to same Giscus thread as bot |
| Read Counter | Cloudflare KV + Cron Worker | Batches read events, commits to GitHub every 10 min |
| Traffic Analytics | Cloudflare Web Analytics | Free, no cookies, GDPR compliant, no banner needed |
| Authentication | Firebase Auth (Anonymous + Google) | Universal login, anonymous-first, free Spark tier |
| User Data | Firebase Firestore | Bookmarks, reading progress, history — free Spark tier |
| Comments | Giscus (GitHub Discussions) | Data stored in your repo, custom theme, free |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  Build Time (GitHub Actions)                        │
│                                                     │
│  src/content/books/*.json                           │
│  src/content/authors/*.json          Astro Build    │
│  src/pages/**/*.astro          ─────────────────►  │
│  src/components/*.jsx                               │
│                                    + Pagefind index │
└──────────────────────┬──────────────────────────────┘
                       │ static HTML + JS + search index
                       ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Pages (CDN)                                 │
│  shahriarspace.github.io/bangla-library             │
│                                                     │
│  Every page = pure HTML, fully crawlable by Google  │
│  React islands hydrate for interactive features     │
└──────────────────────┬──────────────────────────────┘
                       │
           ┌───────────┴──────────────┐
           │                          │
           ▼                          ▼
  Read interactions              Write interactions
  (GitHub raw JSON,              (POST to Cloudflare
   public, no auth)               Worker → GitHub API)
```

### Content Collections Schema

#### Books (`src/content/books/[slug].json`)

```typescript
{
  title_bn: string           // Bengali title
  title_en: string           // English title
  author_bn: string          // Author name in Bengali
  author_en: string          // Author name in English
  author_slug: string        // Links to author profile
  year: string               // Original publication year
  published_date: string     // ISO date added to THIS library e.g. "2026-03-15"
  status: 'published' | 'unpublished'  // Controls site visibility
  publish_date: string       // ISO date when Action should publish e.g. "2026-03-20"
  priority: 1 | 2            // 1 = scheduled specific date, 2 = flexible
  category: string           // Novel | Poetry | Short Story | Drama | Essay
  description_en: string     // Back cover description
  description_bn: string     // Back cover description in Bengali
  cover_image: string        // Path to cover image (optional)
  back_image: string         // Path to back cover image (optional)
  edition_note: string       // Notes on this edition/translation
  original_publisher: string // Original publisher
  source: string             // Where text was sourced from
  translation_reviewed: boolean  // Human-reviewed translation flag
  paragraphs: Array<{
    id: number
    bn: string               // Original Bengali text
    en: string               // English translation
  }>
}
```

#### Authors (`src/content/authors/[slug].json`)

```typescript
{
  name_bn: string            // Name in Bengali script
  name_en: string            // Name in English
  born: string               // ISO date
  died: string               // ISO date
  born_place_en: string
  born_place_bn: string
  nationality: string
  genres: string[]
  awards: string[]
  bio_en: string             // Full biography in English
  bio_bn: string             // Full biography in Bengali
  facts: string[]            // 3 interesting facts
  wikipedia_en: string       // Wikipedia URL
  image_url: string          // Portrait image (Wikimedia Commons)
  image_credit: string       // Attribution
}
```

#### Interactions (`data/interactions/[slug].json`)

```typescript
{
  likes: number
  comments: Array<{
    id: string               // UUID
    name: string             // Commenter name
    message: string          // Comment text
    date: string             // ISO timestamp
    approved: boolean        // Moderation flag
  }>
}
```

#### Analytics (`data/analytics/reads.json`)

```typescript
// Simple flat object — slug → cumulative counts
// Updated every 10 minutes by Cloudflare Worker cron
{
  reads: { [slug: string]: number },
  likes: { [slug: string]: number },

  // Example:
  // reads: { "gitanjali": 847, "devdas": 1923 },
  // likes: { "gitanjali": 47,  "devdas": 124  }
}
```

```
bangla-library/
├── .github/
│   └── workflows/
│       ├── deploy.yml              ← Auto-deploy on push to main
│       └── scheduled-publish.yml   ← Daily 6am UTC scheduled book publisher
├── src/
│   ├── components/
│   │   ├── BilingualReader.jsx     ← Core reading experience + feedback icons
│   │   ├── FeedbackPopover.jsx     ← Paragraph feedback popover + GitHub Issue
│   │   ├── BookCover.jsx           ← Cover + fallback CSS cover
│   │   ├── FallbackCover.jsx       ← CSS cover generator (shared)
│   │   ├── FeaturedSection.jsx     ← Homepage featured showcase island
│   │   ├── RequestForm.jsx         ← Request a Book form island
│   │   ├── ConsentManager.jsx      ← GDPR consent: banner + modal + script injection
│   │   ├── AuthIsland.jsx          ← Login button + user menu (React island)
│   │   ├── BookmarkButton.jsx      ← Per-book bookmark toggle (React island)
│   │   ├── ReadingHistory.jsx      ← User reading history page island
│   │   ├── AuthorTimeline.jsx      ← Interactive timeline
│   │   ├── InteractionIsland.jsx   ← Likes + comments
│   │   └── ReadCounter.jsx         ← Read counter island (30s trigger)
│   ├── lib/
│   │   ├── firebase.js             ← Firebase app init + exports
│   │   ├── auth.js                 ← Auth helpers (signIn, signOut, onAuthChange)
│   │   └── firestore.js            ← Firestore helpers (bookmarks, progress, history)
│   ├── context/
│   │   └── AuthContext.jsx         ← React context: user state across all islands
│   ├── content/
│   │   ├── config.ts               ← Collection schemas
│   │   ├── books/                  ← One JSON per book
│   │   └── authors/                ← One JSON per author
│   ├── layouts/
│   │   └── Base.astro              ← Nav, footer, fonts, meta
│   └── pages/
│       ├── index.astro             ← Homepage
│       ├── stats/
│       │   └── index.astro         ← Public stats page (most read books)
│       ├── books/
│       │   ├── index.astro         ← All books + category filter
│       │   └── [slug].astro        ← Individual book reader (SSG)
│       ├── authors/
│       │   ├── index.astro         ← Author cards grid
│       │   └── [slug].astro        ← Author profile page (SSG)
│       ├── about/
│       │   └── index.astro
│       ├── privacy/
│       │   └── index.astro         ← Privacy policy (bilingual, GDPR Art.13)
│       ├── request/
│       │   └── index.astro         ← Request a Book page (fetches GitHub Issues)
│       └── sitemap.xml.js          ← Auto-generated by @astrojs/sitemap
├── public/
│   ├── images/
│   │   ├── covers/                 ← Book cover images
│   │   ├── backs/                  ← Back cover images
│   │   └── authors/                ← Author portrait images
│   ├── robots.txt
│   └── [google-verification].html  ← Search Console verification
├── data/
│   ├── coming-soon.json            ← Manually curated upcoming books list
│   └── analytics/
│       └── reads.json              ← Cumulative read + like counts (committed by Worker cron)
├── cloudflare-worker/
│   ├── index.js                    ← Unified Worker: interactions + read counter + cron
│   └── wrangler.toml               ← Worker config + KV binding + cron schedule
├── scripts/
│   ├── scheduled-publish.mjs       ← Finds due books, flips status to published
│   └── translate-book.mjs          ← CLI translation helper
├── astro.config.mjs
├── package.json
└── README.md
```

---

## 3. Features & Pages

### 3.1 Homepage (`/`)

**Purpose:** Entry point, discovery, search

**Layout (top to bottom):**

```
┌─────────────────────────────────────────────────────┐
│  1. HERO                                            │
│     Site title (bn + en), tagline, search box       │
├─────────────────────────────────────────────────────┤
│  2. STATS BAR                                       │
│     Total books · Authors · Languages · Readers     │
├─────────────────────────────────────────────────────┤
│  3. FEATURED SHOWCASE (React Island)                │
│     Fancy cover slideshow + tabbed panels           │
│     ┌──────────────────┬────────────────────────┐  │
│     │  Cover Slideshow │  Tab: Recently Added   │  │
│     │  (animated,      │  Tab: Coming Soon      │  │
│     │   auto-plays)    │  Tab: Top Read         │  │
│     └──────────────────┴────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  4. BOOKS BY CATEGORY                               │
│     Grid grouped by Novel / Poetry / etc.           │
├─────────────────────────────────────────────────────┤
│  5. FEATURED AUTHOR OF THE MONTH                    │
│     Portrait, bio snippet, books in library         │
└─────────────────────────────────────────────────────┘
```

---

### 3.1.1 Featured Showcase Component (`FeaturedSection.jsx`)

**Purpose:** The centrepiece of the homepage — visually striking, editorial feel, drives readers into books.

**Component:** React Island (`client:load`) — receives all data as props from Astro at build time. No API calls needed.

#### Props Interface

```typescript
interface FeaturedSectionProps {
  recentBooks: BookCard[]      // last 6 books added (by file date)
  comingSoon: ComingSoon[]     // manually curated upcoming books
  topRead: BookCard[]          // top 6 from data/analytics/reads.json
  slideshowBooks: BookCard[]   // curated 8 books for the cover slideshow
}

interface BookCard {
  slug: string
  title_bn: string
  title_en: string
  author_en: string
  author_bn: string
  year: string
  category: string
  cover_image: string | null   // null triggers CSS fallback cover
  reads?: number
}

interface ComingSoon {
  title_bn: string
  title_en: string
  author_en: string
  expected: string             // e.g. "Next week" or "March 2026"
  category: string
}
```

#### Sub-components

**A) Cover Slideshow**

Full-height book cover carousel on the left side. Cinematic, slow auto-advance.

```
Visual behaviour:
- Shows one book cover at a time, large format (like a real book)
- Auto-advances every 4 seconds
- Smooth crossfade transition between covers
- Active book info fades in below: title (bn + en), author, year
- Clicking the cover navigates to the book page
- Dots indicator at bottom showing position
- Pauses on hover

Cover display:
- Real cover image if available
- CSS-generated fallback if not:
  Dark background, gold border, Bangla title large,
  English subtitle, author, year — matches site aesthetic

Book 3D effect:
- Subtle CSS perspective transform gives covers a slight
  3D tilt — like a real book sitting on a shelf
- Lifts and flattens on hover
```

**CSS fallback cover generator:**
```jsx
// When cover_image is null, render this instead of <img>
function FallbackCover({ title_bn, title_en, author_en, year }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #1c1812 0%, #2c1f0e 100%)',
      border: '1px solid rgba(200,160,80,0.3)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      padding: '24px', textAlign: 'center',
      fontFamily: "'Noto Serif Bengali', serif",
    }}>
      <div style={{ width: '40px', height: '1px',
        background: 'rgba(200,160,80,0.4)', marginBottom: '20px' }} />
      <div style={{ fontSize: '1.6rem', color: '#f0dfa0',
        lineHeight: 1.4, marginBottom: '12px' }}>{title_bn}</div>
      <div style={{ fontSize: '0.8rem', color: '#c8a050',
        fontStyle: 'italic', fontFamily: 'Georgia, serif',
        marginBottom: '20px' }}>{title_en}</div>
      <div style={{ width: '40px', height: '1px',
        background: 'rgba(200,160,80,0.4)', marginBottom: '16px' }} />
      <div style={{ fontSize: '0.72rem', color: '#a08050',
        fontFamily: 'Georgia, serif' }}>{author_en}</div>
      <div style={{ fontSize: '0.65rem', color: '#6a5030',
        fontFamily: 'Georgia, serif', marginTop: '4px' }}>{year}</div>
    </div>
  );
}
```

**B) Tabbed Book Lists (right side)**

Three tabs — clicking a tab shows that list. Default tab: Recently Added.

```
[ Recently Added ] [ Coming Soon ] [ Top Read ]
─────────────────────────────────────────────────
List of 6 book rows, each showing:
  [Mini cover] Title (bn)
               Title (en) · Author · Year
               [→ Read]         (badge: category)
```

Tab: **Recently Added**
- Last 6 books committed to the repo
- Determined at build time by Astro reading file modification dates
- Badge: "NEW" on books added in last 7 days

Tab: **Coming Soon**
- Manually curated list in a `data/coming-soon.json` file
- Shows: category, expected timeframe — **not specific book titles**
- Badge: "SOON" in muted gold
- Teases upcoming content without revealing exactly what or when

**Security reasoning:** Listing specific book titles and exact dates reveals your publishing schedule to copyright holders, competitors, and automated scrapers before the content is live. Keep entries vague — category and approximate timeframe only.

```json
// data/coming-soon.json
// Vague entries — category + timeframe, no specific titles
[
  {
    "teaser": "A landmark 19th century novel",
    "category": "Novel",
    "expected": "This week"
  },
  {
    "teaser": "Poetry collection by Bangladesh's national poet",
    "category": "Poetry",
    "expected": "Later this month"
  },
  {
    "teaser": "A feminist classic ahead of its time",
    "category": "Essay",
    "expected": "Coming soon"
  }
]
```

This builds anticipation without exposing the schedule. Curious readers check back regularly — which also signals to Google that the site has returning visitors.

Tab: **Top Read**
- Top 6 books by read count from `data/analytics/reads.json`
- Shows read count: "👁 1,923 readers"
- Rank number (1–6) displayed prominently
- Updates every deploy (reads.json committed every 10 min by Worker)

#### Full Component Layout

```
Desktop (>768px):
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌──────────────────────┐  ┌─────────────────────────┐ │
│  │                      │  │ Recently  Coming  Top   │ │
│  │   [Book Cover]       │  │ Added     Soon    Read  │ │
│  │                      │  │─────────────────────────│ │
│  │   3D tilt effect     │  │ [▪] বিষাদ সিন্ধু        │ │
│  │   shadow beneath     │  │     Bishad Sindhu NEW   │ │
│  │                      │  │─────────────────────────│ │
│  │   গীতাঞ্জলি          │  │ [▪] গীতাঞ্জলি           │ │
│  │   Gitanjali          │  │     Gitanjali           │ │
│  │   Tagore · 1910      │  │─────────────────────────│ │
│  │                      │  │ [▪] ময়ূরাক্ষী           │ │
│  │   ● ○ ○ ○ ○ ○ ○ ○   │  │     Moyurakkhi          │ │
│  └──────────────────────┘  └─────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘

Mobile (<768px):
┌─────────────────────────┐
│  [Cover Slideshow]      │  ← full width, shorter height
│  Title · Author         │
│  ● ○ ○ ○ ○              │
├─────────────────────────┤
│ Recent  Soon  Top Read  │  ← tabs below slideshow
│─────────────────────────│
│ [▪] Book title          │
│     Author              │
└─────────────────────────┘
```

#### Animation Spec

```
Cover slideshow:
  - Transition: opacity crossfade, 600ms ease-in-out
  - Auto-advance: every 4000ms
  - 3D tilt: transform: perspective(800px) rotateY(-8deg)
  - Hover: rotateY(0deg), scale(1.02), transition 300ms
  - Shadow: box-shadow shifts on hover for depth illusion

Tab switch:
  - Content fades in: opacity 0 → 1, translateY(4px) → 0
  - Duration: 200ms ease-out

Book row hover:
  - Border-left: transparent → gold, 200ms
  - Background: transparent → rgba(gold, 0.05)
  - Mini cover: scale(1.05), 200ms

NEW badge:
  - Subtle pulse animation on the badge dot
  - 2s infinite, opacity 1 → 0.4 → 1
```

#### Astro Integration (in `index.astro`)

```astro
---
import { getCollection } from 'astro:content';
import FeaturedSection from '../components/FeaturedSection.jsx';

const allBooks = await getCollection('books');
const reads = await import('../../data/analytics/reads.json');
const comingSoon = await import('../../data/coming-soon.json');

// Recently added — sort by file slug alphabetically as proxy,
// or use a `published_date` field in the JSON
const recentBooks = [...allBooks]
  .sort((a, b) => b.data.published_date?.localeCompare(a.data.published_date))
  .slice(0, 6)
  .map(b => ({ slug: b.slug, ...b.data }));

// Top read — sort by reads.json counts
const topRead = [...allBooks]
  .sort((a, b) => (reads[b.slug] || 0) - (reads[a.slug] || 0))
  .slice(0, 6)
  .map(b => ({ slug: b.slug, ...b.data, reads: reads[b.slug] || 0 }));

// Slideshow — manually pick 8 visually interesting covers
// or auto-select from topRead + recentBooks combined
const slideshowBooks = [...topRead, ...recentBooks]
  .filter((b, i, arr) => arr.findIndex(x => x.slug === b.slug) === i)
  .slice(0, 8);
---

<FeaturedSection
  client:load
  recentBooks={recentBooks}
  comingSoon={comingSoon.default}
  topRead={topRead}
  slideshowBooks={slideshowBooks}
/>
```

#### Add `published_date` to Book JSON Schema

Add one field to every book JSON so "Recently Added" works accurately:

```json
{
  "title_bn": "...",
  "published_date": "2026-03-15",
  ...
}
```

Set this to the date you added the book to the library (not the original publication year). Astro reads it at build time to sort the recently added list.

#### File Location

```
src/components/FeaturedSection.jsx    ← main component
src/components/FallbackCover.jsx      ← CSS cover generator (shared)
data/coming-soon.json                 ← manually edited upcoming list
```

---

### 3.2 Books Index (`/books`)

**Purpose:** Browse and filter all books

**Features:**
- Grid of all books with cover images
- Filter by category (Novel, Poetry, Short Story, Drama, Essay)
- Filter by author
- Sort by year / title / most liked
- Search within the page

---
### 3.3 Book Reader (`/books/[slug]`)

**Purpose:** The core experience — bilingual reading

**Sections:**

1. **Book Header**
   - Cover image (or CSS fallback cover)
   - Title in Bangla + English
   - Author link, year, category breadcrumb
   - **Translation quality badge** — prominent, colour-coded:
     - 🟡 Amber: `AI-assisted translation — not yet reviewed`
     - 🟢 Green: `Translation reviewed` (when `translation_reviewed: true`)
   - Badge appears directly under the title — never hidden in fine print
   - Links to the paragraph feedback system so readers can report issues

2. **Book Introduction** (collapsible)
   - Collapsed by default — shows only a one-line teaser
   - "About this book ▾" toggle expands full content
   - Expanded content:
     - Back cover image (if available)
     - Description in English + Bangla (side by side)
     - Edition note, source attribution
   - **Why collapsed:** On mobile a reader arrives from Google wanting to read — not scroll through 3 screens of metadata before reaching text. Collapse reduces time-to-first-word significantly.

3. **Bilingual Reader** (React Island)
   - **Mobile behaviour (< 640px):**
     - Default: single column, language chosen by browser locale
       - Bangla locale (`bn`, `bn-BD`, `bn-IN`) → Bangla column
       - All other locales → English column
     - Toggle bar: `[ বাংলা ] [ English ] [ Both ↔ ]`
     - "Both" mode on mobile: stacked vertically (Bangla above, English below) not side-by-side
   - **Desktop behaviour (≥ 640px):**
     - Default: side-by-side columns
     - View mode toggle: Side by Side / Bangla only / English only
   - Synchronized scrolling (desktop side-by-side only)
   - Click any paragraph to highlight both columns
   - Font size control: Small / Medium / Large
   - Reading progress bar (thin gold line at top of reader)
   - **Continue reading toast** (returning visitors only):
     - Appears as a non-intrusive bar at the top of the reader
     - "You left off at paragraph 42 — [Continue from here] [Start from beginning]"
     - Auto-dismisses after 8 seconds if no action
     - **Never auto-jumps** — always waits for explicit user confirmation
     - Only shown if saved progress > paragraph 5 (ignore near-beginning saves)
   - **Paragraph grouping target:** 3-5 sentences per paragraph entry
     - Enforced in the translation prompt (see section 5.1)
     - Prevents choppy sync scroll with single-sentence entries
     - Books with existing single-sentence entries should be re-chunked

4. **Interactions** (React Island)
   - Like button with count
     - **Empty state:** Hide count until ≥ 3 likes — show "Be the first to like" instead
     - Never show "0 likes" — looks abandoned
   - Comments section
     - **Empty state:** "Start the conversation — be the first to comment"
     - No login required for anonymous comments
     - Comment approval wait time shown: "Comments reviewed within 24 hours"
   - Read counter — shown when ≥ 10 reads
   - **Paragraph feedback — touch device fix:**
     - Desktop (hover): ⚑ icon appears on paragraph hover
     - Mobile (touch): persistent small "⚑ Report" button shown at the bottom-right of each paragraph — always visible, never requires hover

5. **Navigation**
   - Previous / Next book by same author
   - Back to author profile
   - Back to library

**SEO:** All paragraph text rendered as hidden static HTML (`display:none`) for Google indexing, in addition to the React island.

**Performance — Virtual Scrolling:**
Books over 300 paragraphs (e.g. Moyurakkhi with 1,126) must use virtual scrolling — only render paragraphs near the viewport. Rendering 1,126 DOM nodes at once causes noticeable freeze on low-end Android devices common in the target diaspora audience.

Implementation: use `react-virtual` or `@tanstack/react-virtual`. Maintain paragraph IDs and URL anchors — deep links (`/books/moyurakkhi#p42`) must still scroll to the correct position even with virtualisation.

---

### 3.3.1 Paragraph Feedback System

**Purpose:** Allow readers to report translation inaccuracies, typos, or awkward phrasing at the individual paragraph level. Each submission creates a GitHub Issue with full context — book, paragraph ID, original text, current translation, and the reader's suggestion.

**Value:** Crowdsourced quality improvement. Diaspora readers and academics can flag errors that AI translation missed. Creates a Wikipedia-style improvement culture around the library.

---

#### UX Flow

```
Reader scrolling through book
          ↓
Hovers over any paragraph
          ↓
Small feedback icon [⚑] fades in on the
right edge of the paragraph row
(appears on BOTH columns simultaneously)
          ↓
Reader clicks [⚑]
          ↓
Inline popover opens anchored to that paragraph
(does not navigate away, does not open new page)
          ↓
Reader selects issue type + optional suggestion
          ↓
Clicks "Send Feedback"
          ↓
Cloudflare Worker creates GitHub Issue
          ↓
Popover shows success confirmation
          ↓
Icon changes to [✓] for this paragraph
(for this session only — not persisted)
```

---

#### Feedback Icon Behaviour

```
Default state:
  → Icon invisible (opacity: 0)
  → Takes no space visually

Paragraph hovered:
  → [⚑] icon fades in (opacity: 0 → 0.4, 200ms)
  → Positioned: absolute right edge of paragraph row
  → Both Bangla and English paragraph rows show
    the SAME icon (shared, not duplicated)
  → Tooltip on hover: "Report translation issue"

Icon clicked:
  → Popover opens anchored to that paragraph
  → Icon changes to [⚑] active state (opacity: 1, gold)
  → Other open popovers close automatically
    (only one open at a time)

Feedback submitted successfully:
  → Icon changes to [✓] (checkmark, muted green)
  → Tooltip: "Feedback submitted — thank you"
  → Popover closes
  → State persists for session only

Already reported (session):
  → Icon shows [✓] — no re-opening
```

---

#### Feedback Popover

Anchored inline — appears adjacent to the paragraph, not as a full-page modal. Closes on Escape, on outside click, or on Cancel.

```
Desktop (side-by-side mode):
                                     ┌─────────────────────────────┐
  বাংলা অনুচ্ছেদ...           [⚑] → │ Feedback · Paragraph #42    │
  English translation...       [⚑]   │ গীতাঞ্জলি                  │
                                     │─────────────────────────────│
                                     │ What is the issue?          │
                                     │                             │
                                     │ ● Translation inaccurate    │
                                     │ ○ Typo in Bangla text       │
                                     │ ○ Awkward English phrasing  │
                                     │ ○ Missing/extra content     │
                                     │ ○ Other                     │
                                     │                             │
                                     │ Your suggestion (optional)  │
                                     │ ┌─────────────────────────┐ │
                                     │ │                         │ │
                                     │ │                         │ │
                                     │ └─────────────────────────┘ │
                                     │ max 1000 chars              │
                                     │                             │
                                     │ Your name (optional)        │
                                     │ ┌─────────────────────────┐ │
                                     │ │ Anonymous if blank      │ │
                                     │ └─────────────────────────┘ │
                                     │                             │
                                     │ [Cancel] [Send Feedback →]  │
                                     └─────────────────────────────┘

Mobile (single column mode):
  Popover opens as bottom sheet (slides up from bottom)
  Full width, rounded top corners
  Same fields, touch-friendly tap targets
```

**Visual spec:**
- Background: `#1c1812` site theme
- Border: `1px solid rgba(200,160,80,0.3)` gold
- Border radius: `4px`
- Max width: `340px` on desktop
- Arrow pointer toward the paragraph row
- `box-shadow: 0 8px 32px rgba(0,0,0,0.5)`
- Radio buttons: custom gold dot style
- Textarea: 3 rows, resizable vertically only
- "Send Feedback" button: solid gold background
- Submit loading state: button shows spinner, disabled
- `z-index: 1000` — above reader columns

---

#### Issue Types

```typescript
type FeedbackType =
  | 'translation_inaccurate'   // meaning is wrong
  | 'typo_bangla'              // spelling error in original
  | 'typo_english'             // spelling error in translation
  | 'awkward_phrasing'         // grammatically ok but unnatural
  | 'missing_content'          // something was omitted
  | 'extra_content'            // something was added that isn't there
  | 'other'                    // free-form
```

---

#### GitHub Issue Format

Each submission creates a GitHub Issue with this exact format:

```markdown
## Translation Feedback

**Book:** গীতাঞ্জলি (Gitanjali)
**Author:** Rabindranath Tagore
**Paragraph:** #42
**Issue type:** Translation inaccurate

---

### Original Bangla text (paragraph #42)
আমার মাথা নত করে দাও হে তোমার চরণ-ধূলার তলে।

### Current English translation
Let me bow my head at the dust of thy feet.

### Reader's suggestion
"Lay low my head" would be more literal and preserve
the humility of the original better than "bow".

---

**Reported by:** Karim Ahmed (anonymous if blank)
**Date:** 2026-03-15
**Page:** https://banglalib.org/books/gitanjali#p42

---
*Submitted via paragraph feedback tool*
*Book slug: gitanjali · Paragraph ID: 42*
```

**Issue title format:**
```
Translation feedback: [Book title] §[paragraph id] — [issue type]

Example:
Translation feedback: Gitanjali §42 — translation_inaccurate
```

**Labels applied automatically:**
- `translation-feedback` — all feedback submissions
- `translation-fix` — when type is `translation_inaccurate`
- `typo` — when type is `typo_bangla` or `typo_english`
- `phrasing` — when type is `awkward_phrasing`

---

#### Paragraph URL Anchor

Each paragraph gets an HTML `id` attribute so the GitHub issue URL links directly to it:

```html
<!-- Rendered in static HTML for each paragraph -->
<div id="p42" data-paragraph-id="42">
  <!-- Bangla text -->
</div>
```

The GitHub issue body includes:
```
https://banglalib.org/books/gitanjali#p42
```

Clicking this link from GitHub jumps directly to paragraph 42. Reviewers can see the context instantly without searching.

---

#### Cloudflare Worker — `/feedback` endpoint

Add to unified worker (`cloudflare-worker/index.js`):

```js
// POST /feedback — create GitHub issue for paragraph feedback
if (path === '/feedback' && request.method === 'POST') {

  const body = await request.json();

  // Honeypot check
  if (body.honeypot) {
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  // Rate limit: 10 feedback reports per IP per hour
  // (more generous than request form — feedback is high value)
  const ip = request.headers.get('CF-Connecting-IP');
  const rateKey = `rate:feedback:${ip}`;
  const count = parseInt(await env.READS_KV.get(rateKey) || '0');
  if (count >= 10) {
    return new Response(
      JSON.stringify({ error: 'rate_limited' }),
      { status: 429, headers }
    );
  }
  await env.READS_KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });

  // Validate required fields
  const { bookSlug, bookTitle, authorEn, paragraphId,
          paragraphBn, paragraphEn, feedbackType,
          suggestion, name, pageUrl } = body;

  if (!bookSlug || !paragraphId || !feedbackType) {
    return new Response(
      JSON.stringify({ error: 'missing_fields' }),
      { status: 400, headers }
    );
  }

  // Sanitise
  const s = (v, max = 2000) =>
    String(v || '').slice(0, max).replace(/<[^>]*>/g, '').trim();

  const ISSUE_TYPE_LABELS = {
    translation_inaccurate: ['translation-feedback', 'translation-fix'],
    typo_bangla:            ['translation-feedback', 'typo'],
    typo_english:           ['translation-feedback', 'typo'],
    awkward_phrasing:       ['translation-feedback', 'phrasing'],
    missing_content:        ['translation-feedback', 'translation-fix'],
    extra_content:          ['translation-feedback', 'translation-fix'],
    other:                  ['translation-feedback'],
  };

  const ISSUE_TYPE_LABELS_DISPLAY = {
    translation_inaccurate: 'Translation inaccurate',
    typo_bangla:            'Typo in Bangla text',
    typo_english:           'Typo in English translation',
    awkward_phrasing:       'Awkward English phrasing',
    missing_content:        'Missing content',
    extra_content:          'Extra content added',
    other:                  'Other',
  };

  const issueBody = [
    '## Translation Feedback',
    '',
    `**Book:** ${s(bookTitle)}`,
    `**Author:** ${s(authorEn)}`,
    `**Paragraph:** #${s(paragraphId)}`,
    `**Issue type:** ${ISSUE_TYPE_LABELS_DISPLAY[feedbackType] || s(feedbackType)}`,
    '',
    '---',
    '',
    `### Original Bangla text (paragraph #${s(paragraphId)})`,
    s(paragraphBn, 5000),
    '',
    '### Current English translation',
    s(paragraphEn, 5000),
    '',
    suggestion ? `### Reader\'s suggestion\n${s(suggestion, 1000)}` : '',
    '',
    '---',
    '',
    `**Reported by:** ${s(name) || 'Anonymous'}`,
    `**Date:** ${new Date().toISOString().split('T')[0]}`,
    `**Page:** ${s(pageUrl)}`,
    '',
    '---',
    '*Submitted via paragraph feedback tool*',
    `*Book slug: ${s(bookSlug)} · Paragraph ID: ${s(paragraphId)}*`,
  ].filter(l => l !== null).join('\n');

  const issueRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'bangla-library-worker',
      },
      body: JSON.stringify({
        title: `Translation feedback: ${s(bookTitle)} §${s(paragraphId)} — ${feedbackType}`,
        body: issueBody,
        labels: ISSUE_TYPE_LABELS[feedbackType] || ['translation-feedback'],
      }),
    }
  );

  if (!issueRes.ok) {
    return new Response(
      JSON.stringify({ error: 'github_error' }),
      { status: 500, headers }
    );
  }

  const issue = await issueRes.json();
  return new Response(
    JSON.stringify({ ok: true, issue_url: issue.html_url }),
    { headers }
  );
}
```

---

#### Your Triage Workflow

```
GitHub notification: new "translation-feedback" issue
          ↓
Open the issue — see full context:
  book, paragraph, original Bangla, current English,
  reader's suggestion, direct link to paragraph
          ↓
Is the feedback valid?
  No  → Close with label "invalid" + comment explaining
  Yes → Edit the book's JSON file:
        src/content/books/gitanjali.json
        Find paragraph id: 42
        Update the "en" field with corrected translation
          ↓
Commit: "fix: Gitanjali §42 translation (reported via feedback)"
          ↓
Close the GitHub issue with link to the fixing commit
          ↓
Issue is permanently recorded as fixed
```

Every fix is traceable — the GitHub issue links to the commit, the commit message references the paragraph. Over time this builds a transparent quality history for the entire library.

---

#### FeedbackPopover.jsx — Component Spec

```typescript
// src/components/FeedbackPopover.jsx
// Used inside BilingualReader.jsx — one instance shared,
// repositions to the active paragraph

interface FeedbackPopoverProps {
  bookSlug: string
  bookTitle: string
  authorEn: string
  workerUrl: string          // Cloudflare Worker base URL
}

// Internal state per paragraph click:
interface PopoverState {
  isOpen: boolean
  paragraphId: number | null
  paragraphBn: string
  paragraphEn: string
  feedbackType: FeedbackType | null
  suggestion: string
  name: string
  status: 'idle' | 'submitting' | 'success' | 'error' | 'rate_limited'
  honeypot: string           // hidden, must stay empty
}

// Key behaviours:
// - Only one popover open at a time (singleton pattern)
// - Closes on: Escape key, outside click, Cancel button
// - Repositions on window resize
// - On mobile: switches to bottom sheet layout
// - Focus moves into popover on open (accessibility)
// - Focus returns to feedback icon on close (accessibility)
// - Success state auto-closes after 3 seconds
```

---

#### BilingualReader.jsx Integration

Each paragraph row gets a feedback icon:

```jsx
// Inside the paragraph map in BilingualReader.jsx
{book.paragraphs.map((p) => (
  <div
    key={p.id}
    id={`p${p.id}`}                    // ← URL anchor
    className="paragraph-row"
    onMouseEnter={() => setHoveredId(p.id)}
    onMouseLeave={() => setHoveredId(null)}
  >
    {/* Bangla text */}
    <div className="bn-text">{p.bn}</div>

    {/* English text */}
    <div className="en-text">{p.en}</div>

    {/* Feedback icon — visible on hover */}
    <button
      className="feedback-icon"
      style={{ opacity: hoveredId === p.id ? 0.6 : 0 }}
      onClick={() => openFeedback(p)}
      aria-label={`Report issue with paragraph ${p.id}`}
      title="Report translation issue"
    >
      ⚑
    </button>
  </div>
))}
```

---

#### File Locations

```
src/components/
  ├── BilingualReader.jsx       ← updated: adds feedback icon per paragraph
  └── FeedbackPopover.jsx       ← new: inline popover + form + submission
```

---

#### Rate Limits Summary (all endpoints)

| Endpoint | Limit | Window | KV key pattern |
|---|---|---|---|
| `/read` | unlimited | — | increments only |
| `/like` | 1 per slug | session | client-side only |
| `/comment` | 3 per hour | 1 hour | `rate:comment:{ip}` |
| `/request` | 3 per hour | 1 hour | `rate:request:{ip}` |
| `/feedback` | 10 per hour | 1 hour | `rate:feedback:{ip}` |

Feedback gets the most generous limit (10/hour) because it is the highest-value contribution — a reader carefully reporting 10 paragraph issues in an hour is exactly the behaviour you want to encourage.

**Purpose:** Discover authors, contextualise their work

**Sections:**

1. **Author Header**
   - Portrait image (Wikimedia Commons, public domain)
   - Name in Bangla + English
   - Born / Died / Nationality
   - Genres, Awards badges

2. **Biography** (bilingual)
   - English bio paragraph
   - Bangla bio paragraph

3. **Did You Know**
   - 3 interesting facts about the author

4. **All Works in Library**
   - Grid of all books by this author currently in library

5. **Timeline Context**
   - Where this author fits in Bengali literary history

---

### 3.5 Authors Index (`/authors`)

**Purpose:** Browse all authors

**Features:**
- Author cards with portrait, name (both scripts), dates, book count
- Interactive chronological timeline (React Island)
- Filter by era (19th century / early 20th / mid 20th)

---

### 3.6 About (`/about`)

**Purpose:** Trust, mission, contribution guide

**Sections:**
- Mission statement
- What we offer
- Copyright policy
- How to contribute a book or translation
- Tech stack credits

---

### 3.7 Search

**Technology:** Pagefind — generated at build time, runs entirely in browser

**Indexes:**
- Book titles (Bangla + English)
- Author names (Bangla + English)
- All paragraph text (both languages)
- Descriptions

**Result shows:** Book title, author, matched passage snippet, link

**Language detection in results:**
Pagefind returns the matched text. The result snippet must show the language the query matched — with its translation alongside it. This prevents diaspora readers who search in English from seeing an incomprehensible Bangla snippet in the result.

```
Query: "Gitanjali English translation"

Result:
  গীতাঞ্জলি · Gitanjali — Rabindranath Tagore
  Matched passage (English):
  "...Let me bow my head at the dust of thy feet..."
  বাংলা: "আমার মাথা নত করে দাও হে..."
  → Read this book

Query: "আমার মাথা নত"

Result:
  গীতাঞ্জলি · Gitanjali — Rabindranath Tagore
  Matched passage (Bangla):
  "...আমার মাথা নত করে দাও হে তোমার চরণ-ধূলার তলে..."
  English: "Let me bow my head at the dust of thy feet..."
  → Read this book
```

Implementation: Pagefind stores both `bn` and `en` fields per paragraph. The search UI detects which field matched using the snippet language, then fetches and shows the corresponding translation from the paired field.

---

### 3.8 Interaction System — Dual-Channel Comments + Likes

**Architecture decision:** Two parallel comment channels in a single unified UI:

| Channel | Who uses it | How |
|---|---|---|
| **Anonymous comments** | Any visitor, no login | Form → Cloudflare Worker → posts as bot to GitHub Discussions |
| **GitHub comments** | GitHub users | Giscus widget directly |
| **Likes** | Any visitor, no login | Cloudflare Worker → KV counter, batched to GitHub every 10min |

Both comment channels write to the **same GitHub Discussion thread** per book — creating one unified conversation visible to everyone.

---

#### UI Layout

```
┌──────────────────────────────────────────────────────┐
│  [♥ 47]  [👁 847 readers]                           │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  💬 Comments                                         │
│                                                      │
│  ┌─────────────────────────┬──────────────────────┐ │
│  │  Leave a comment        │  Join the discussion  │ │
│  │  (no login needed)      │  (GitHub)             │ │
│  │─────────────────────────│                       │ │
│  │  banglalib-bot          │  [Giscus widget       │ │
│  │  Rahel Ahmed wrote:     │   custom gold theme]  │ │
│  │  "Beautiful..."         │                       │ │
│  │  2 days ago             │  Requires GitHub      │ │
│  │                         │  account for          │ │
│  │  banglalib-bot          │  threaded replies     │ │
│  │  Anonymous wrote:       │  and reactions        │ │
│  │  "Paragraph 42..."      │                       │ │
│  │                         │                       │ │
│  │  ─────────────────────  │                       │ │
│  │  Your name (optional)   │                       │ │
│  │  [                 ]    │                       │ │
│  │  Comment *              │                       │ │
│  │  [                 ]    │                       │ │
│  │  [                 ]    │                       │ │
│  │  [Post Comment →  ]     │                       │ │
│  └─────────────────────────┴──────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

On mobile: stacked vertically — anonymous form first, Giscus below.

---

#### Bot Account Setup

Create a dedicated free GitHub account: **`banglalib-bot`**

This keeps anonymous comments visually distinct from your personal account. Each anonymous comment appears as:

```
banglalib-bot  ·  just now
──────────────────────────────────────────
**Rahel Ahmed** wrote:

This translation captures the soul of the original
perfectly. The parallel format makes appreciation
of the Bengali so much easier.

---
*Posted anonymously via [বাংলা পাঠাগার](https://banglalib.org)*
```

**Token setup:**
```
1. Create GitHub account: banglalib-bot
2. Settings → Developer settings → Personal access tokens
3. Generate token with scope: public_repo (discussions write)
4. wrangler secret put BOT_GITHUB_TOKEN
```

---

#### GitHub Discussion Pre-Creation

**Confirmed strategy: Option A.** Every book gets a GitHub Discussion pre-created at publish time by the scheduled-publish script. The full implementation is in **section 6.4** — `scripts/scheduled-publish.mjs`.

Key points:
- Discussion title = `/books/[slug]` — exactly matches Giscus `data-mapping="pathname"`
- Uses GitHub GraphQL API (Discussion creation not available in REST)
- Runs using `BOT_GITHUB_TOKEN` (banglalib-bot account)
- Idempotent — checks for existing discussion before creating
- Non-fatal — if Discussion creation fails, book still publishes; discussion can be created manually

This means every published book has a Discussion thread waiting from minute one. Anonymous comments via the Worker work immediately without any GitHub user needing to start the thread.

---

#### Cloudflare Worker — `/comment` Endpoint

```js
// POST /comment — post anonymous comment as bot to GitHub Discussions
if (path === '/comment' && request.method === 'POST') {

  const body = await request.json();

  // Honeypot check
  if (body.honeypot) {
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  // Rate limit: 3 comments per IP per hour
  const ip = request.headers.get('CF-Connecting-IP');
  const rateKey = `rate:comment:${ip}`;
  const count = parseInt(await env.READS_KV.get(rateKey) || '0');
  if (count >= 3) {
    return new Response(
      JSON.stringify({ error: 'rate_limited' }),
      { status: 429, headers }
    );
  }
  await env.READS_KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });

  // Validate + sanitise
  const s = (v, max = 1000) =>
    String(v || '').slice(0, max).replace(/<[^>]*>/g, '').trim();

  const slug       = s(body.slug, 100);
  const cleanName  = s(body.name, 100) || 'Anonymous reader';
  const cleanMsg   = s(body.message, 1000);

  if (!slug || !cleanMsg) {
    return new Response(
      JSON.stringify({ error: 'missing_fields' }),
      { status: 400, headers }
    );
  }

  // Build comment body in Markdown
  const commentBody = [
    `**${cleanName}** wrote:`,
    '',
    cleanMsg,
    '',
    '---',
    '*Posted anonymously via [বাংলা পাঠাগার](https://banglalib.org)*',
  ].join('\n');

  // Find the discussion for this book slug
  // Giscus sets title = pathname = "/books/[slug]"
  const searchRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/discussions?per_page=100`,
    {
      headers: {
        'Authorization': `token ${env.BOT_GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'bangla-library-bot',
      }
    }
  );

  if (!searchRes.ok) {
    return new Response(
      JSON.stringify({ error: 'github_error' }),
      { status: 500, headers }
    );
  }

  const discussions = await searchRes.json();
  const discussion = discussions.find(d =>
    d.title === `/books/${slug}`
  );

  if (!discussion) {
    return new Response(
      JSON.stringify({ error: 'no_discussion' }),
      { status: 404, headers }
    );
  }

  // Post comment to the discussion as the bot account
  const replyRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/discussions/${discussion.number}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${env.BOT_GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'bangla-library-bot',
      },
      body: JSON.stringify({ body: commentBody }),
    }
  );

  if (!replyRes.ok) {
    return new Response(
      JSON.stringify({ error: 'post_failed' }),
      { status: 500, headers }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers });
}
```

---

#### Cloudflare Worker — `/like` Endpoint

Likes use KV only — no GitHub Discussions involved. Batched to `data/analytics/reads.json` every 10 minutes by the cron trigger (already spec'd in section 7).

```js
// POST /like — increment like counter in KV
if (path === '/like' && request.method === 'POST') {

  const { slug } = await request.json();

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400, headers });
  }

  // Rate limit: 1 like per slug per IP per day
  const ip = request.headers.get('CF-Connecting-IP');
  const likeKey = `liked:${ip}:${slug}`;
  const alreadyLiked = await env.READS_KV.get(likeKey);

  if (alreadyLiked) {
    return new Response(
      JSON.stringify({ error: 'already_liked', liked: true }),
      { status: 200, headers }
    );
  }

  // Mark this IP as having liked this book (expires 24h)
  await env.READS_KV.put(likeKey, '1', { expirationTtl: 86400 });

  // Increment like counter in KV
  const countKey = `likes:${slug}`;
  const current = parseInt(await env.READS_KV.get(countKey) || '0');
  const newCount = current + 1;
  await env.READS_KV.put(countKey, String(newCount));

  return new Response(JSON.stringify({ ok: true, count: newCount }), { headers });
}
```

Like counts are batched into `data/analytics/reads.json` by the same cron worker that handles read counts — one commit every 10 minutes covering both metrics.

---

#### `InteractionIsland.jsx` — Full Component Spec

```typescript
interface InteractionIslandProps {
  slug: string
  bookTitle: string
  initialLikes: number        // from data/analytics/reads.json at build time
  workerUrl: string           // Cloudflare Worker base URL
  giscusRepoId: string        // from giscus.app config
  giscusCategoryId: string    // from giscus.app config
}

// Internal state:
interface IslandState {
  likes: number
  liked: boolean              // from localStorage bl_liked_[slug]
  likeLoading: boolean

  // Anonymous comment form
  commentName: string
  commentMessage: string
  commentHoneypot: string     // hidden, must stay empty
  commentStatus: 'idle' | 'submitting' | 'success' | 'error'
               | 'rate_limited' | 'no_discussion'
  charCount: number           // for 1000 char counter display

  // Previous anonymous comments
  // Loaded from GitHub Discussions API at mount time
  anonComments: AnonComment[]
  commentsLoading: boolean
}

interface AnonComment {
  id: number
  body: string                // raw markdown from GitHub
  created_at: string
  // Parsed from body:
  displayName: string         // extracted from "**Name** wrote:"
  displayMessage: string      // extracted from body
}
```

**Loading anonymous comments on mount:**

```js
// Fetch comments from GitHub Discussions API — public, no auth needed
useEffect(() => {
  async function loadComments() {
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/shahriarspace/bangla-library/discussions?per_page=100`
      );
      const discussions = await res.json();
      const disc = discussions.find(d => d.title === `/books/${slug}`);
      if (!disc) { setCommentsLoading(false); return; }

      const commentsRes = await fetch(
        `https://api.github.com/repos/shahriarspace/bangla-library/discussions/${disc.number}/comments`
      );
      const comments = await commentsRes.json();

      // Filter to only banglalib-bot comments (anonymous submissions)
      const anonOnly = comments
        .filter(c => c.user.login === 'banglalib-bot')
        .map(c => ({
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          displayName: c.body.match(/\*\*(.+?)\*\* wrote:/)?.[1] || 'Anonymous',
          displayMessage: c.body
            .replace(/\*\*.*?\*\* wrote:\n\n/, '')
            .replace(/\n\n---\n.*$/s, '')
            .trim(),
        }));

      setAnonComments(anonOnly);
    } catch { /* fail silently */ }
    setCommentsLoading(false);
  }
  loadComments();
}, [slug]);
```

---

#### Success Message After Comment

```
✓  Comment posted!

Your comment has been submitted and will appear
in the discussion once reviewed — usually within
24 hours. Thank you for contributing to the library.

[ Post another comment ]
```

Note: the comment is posted immediately to GitHub Discussions via the bot account — it is already visible there. The "review" framing sets expectations for the Giscus display on the site, where the banglalib-bot comment appears instantly since there is no approval queue for bot posts. The 24-hour framing is conservative and manages expectations correctly even if there is a delay.

---

#### Moderation

Anonymous comments (posted by `banglalib-bot`) are visible in GitHub Discussions. To moderate:

```
Spam or inappropriate comment spotted
           ↓
Go to GitHub repo → Discussions → find the book
           ↓
Delete the banglalib-bot comment directly
           ↓
Gone from site immediately (loaded live from GitHub API)
```

No approval queue needed — GitHub Discussions is the moderation interface. You get email notifications for all new Discussion activity including bot posts.

---

#### wrangler.toml Addition

```toml
# Add to existing wrangler.toml
# BOT_GITHUB_TOKEN = set via: wrangler secret put BOT_GITHUB_TOKEN
# This is the banglalib-bot account token, separate from GITHUB_TOKEN
```

Two separate tokens in the Worker:
- `GITHUB_TOKEN` — your main account, for committing book files, interactions JSON
- `BOT_GITHUB_TOKEN` — banglalib-bot account, for posting Discussion comments only

---

#### Rate Limits Summary (updated)

| Endpoint | Limit | Window | Storage |
|---|---|---|---|
| `/read` | unlimited | — | KV increment |
| `/like` | 1 per book | 24 hours per IP | KV `liked:{ip}:{slug}` |
| `/comment` | 3 per hour | 1 hour per IP | KV `rate:comment:{ip}` |
| `/request` | 3 per hour | 1 hour per IP | KV `rate:request:{ip}` |
| `/feedback` | 10 per hour | 1 hour per IP | KV `rate:feedback:{ip}` |

---

### 3.9 Book Cover System

**Priority order for cover images:**
1. Original historical scan from Wikimedia Commons
2. Internet Archive scan
3. CSS-generated typographic fallback (gold + dark theme, Bangla title)

**Fallback cover** renders as a styled card with:
- Bangla title (large, Noto Serif Bengali)
- English title (smaller, italic)
- Author name
- Year
- Decorative border in site gold theme

---

### 3.10 Cookie & Privacy Consent (GDPR / TTDSG Compliance)

**Legal context:** The site is operated from Germany (NRW). Under GDPR and the German TTDSG, any storage of data in a visitor's browser requires either explicit consent or a "strictly necessary" exemption. A full consent manager with Accept All / Reject All / Manage Preferences is implemented — both for current compliance and to future-proof the site if additional analytics tools are added later.

**Analytics choice:** Cloudflare Web Analytics — cookieless, no personal data, no consent required. However the full consent manager is still implemented for `localStorage` usage and future-proofing.

---

#### Consent Categories

Three categories of data processing, each independently togglable:

| Category | ID | Default | What it covers | Legal basis |
|---|---|---|---|---|
| Strictly Necessary | `necessary` | Always ON, cannot disable | Consent preferences storage, session state | Legitimate interest |
| Functional | `functional` | OFF until accepted | Reading preferences (font size, view mode), reading progress per book | Consent required |
| Analytics | `analytics` | OFF until accepted | Cloudflare Web Analytics (cookieless page views, traffic sources, country) | Consent required |

> **Note:** Even though Cloudflare Web Analytics is cookieless, placing it in the `analytics` category is best practice under strict GDPR interpretation — it still processes derived data about the visit.

---

#### Consent State Schema

Stored in `localStorage` under key `bl_consent_v1`:

```typescript
interface ConsentState {
  version: 1                    // bump when categories change
  timestamp: string             // ISO date of last decision
  decided: boolean              // false = banner not yet actioned
  categories: {
    necessary: true             // always true, never changeable
    functional: boolean         // reading prefs + progress
    analytics: boolean          // Cloudflare Web Analytics
  }
}

// Example — user accepted all:
{
  "version": 1,
  "timestamp": "2026-03-15T10:30:00Z",
  "decided": true,
  "categories": {
    "necessary": true,
    "functional": true,
    "analytics": true
  }
}

// Example — user rejected non-essential:
{
  "version": 1,
  "timestamp": "2026-03-15T10:30:00Z",
  "decided": true,
  "categories": {
    "necessary": true,
    "functional": false,
    "analytics": false
  }
}
```

---

#### Consent Banner — First Visit

Slides up from bottom on first visit. Does not block content. Full width, site-themed.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  আমরা আপনার গোপনীয়তাকে সম্মান করি                                  │
│  We respect your privacy                                            │
│                                                                      │
│  We use your browser's local storage to remember your reading        │
│  preferences (font size, view mode, reading progress). We also       │
│  use Cloudflare Web Analytics — cookieless, anonymous traffic        │
│  statistics with no personal data collected.                         │
│                                                                      │
│  [  Manage Preferences  ]   [ Reject Non-Essential ]  [ Accept All ]│
│                                                                      │
│  Privacy Policy · Cookie Policy                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Button behaviour:**

| Button | Action |
|---|---|
| `Accept All` | Sets all categories `true`, saves consent, dismisses banner, enables all features immediately |
| `Reject Non-Essential` | Sets `functional: false, analytics: false`, saves consent, dismisses banner, reading prefs not saved |
| `Manage Preferences` | Opens the Preferences Modal (see below) |

**Visual spec:**
- Fixed bottom, full width, `z-index: 9999`
- Background: `#1c1812` matching site theme
- Top border: `2px solid rgba(200,160,80,0.4)` — gold accent
- Bilingual heading: Bangla first, English second
- Three buttons right-aligned on desktop, stacked on mobile
- `Accept All` — solid gold background, dark text (primary CTA)
- `Reject Non-Essential` — outlined, gold border
- `Manage Preferences` — text link style, muted
- Slide-up animation: `translateY(100%) → translateY(0)`, 350ms ease-out
- Slide-down on dismiss: 250ms ease-in

---

#### Preferences Modal

Opens when "Manage Preferences" is clicked. Overlays the page.

```
┌────────────────────────────────────────────────────────┐
│  Privacy Preferences                              [✕]  │
│  ──────────────────────────────────────────────────── │
│                                                        │
│  ◉ Strictly Necessary                    Always active │
│  ─────────────────────────────────────────────────    │
│  Required for the site to function. Stores your        │
│  consent decision. Cannot be disabled.                 │
│                                                        │
│  ◉ Functional                            [ ON  / off ] │
│  ─────────────────────────────────────────────────    │
│  Remembers your reading preferences: font size,        │
│  view mode (side-by-side / Bangla only / English       │
│  only), and reading position per book.                 │
│  Stored only in your browser. Never sent to a server.  │
│                                                        │
│  ◉ Analytics                             [ ON  / off ] │
│  ─────────────────────────────────────────────────    │
│  Cloudflare Web Analytics — anonymised, cookieless     │
│  page view statistics. No personal data collected.     │
│  Helps us understand which books are most read and     │
│  where our readers come from.                          │
│  → Cloudflare Privacy Policy                           │
│                                                        │
│  ──────────────────────────────────────────────────── │
│  [ Reject All ]              [ Save My Preferences ]   │
└────────────────────────────────────────────────────────┘
```

**Toggle switches:**
- Custom CSS toggle (not a checkbox) — gold when ON, grey when OFF
- Strictly Necessary toggle is disabled/locked — always ON
- Toggles are keyboard accessible (`role="switch"`, `aria-checked`)

**Modal behaviour:**
- Overlay: `rgba(0,0,0,0.7)` backdrop
- Modal centred, max-width 520px, site-themed card
- Close button [✕] top right
- Escape key closes modal
- Focus trapped inside modal while open
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="prefs-title"`

---

#### Consent-Gated Behaviour

Features only activate after the relevant consent category is granted:

```
functional: true
  → localStorage.setItem('bl_readPrefs', ...) — save font size, view mode
  → localStorage.setItem('bl_progress_[slug]', ...) — save reading position
  → On load: restore preferences automatically

functional: false
  → Preferences not saved between sessions
  → Reading always starts at top, default font size
  → No error shown — silently degrades

analytics: true
  → Cloudflare Web Analytics script tag injected into <head>
  → Page views tracked from this point forward

analytics: false
  → Cloudflare script never loaded
  → Zero data sent to Cloudflare
  → This is the correct GDPR-compliant behaviour
```

**Cloudflare Analytics script injection** (only after consent):

```jsx
// In Base.astro or a ConsentManager component
// Script only added to DOM after analytics consent granted

useEffect(() => {
  const consent = JSON.parse(
    localStorage.getItem('bl_consent_v1') || '{}'
  );
  if (consent?.categories?.analytics) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({ token: 'YOUR_TOKEN' });
    document.head.appendChild(script);
  }
}, []);
```

---

#### Consent Lifecycle

```
First visit
    ↓
bl_consent_v1 not in localStorage
    ↓
Page loads — content immediately visible and readable
    ↓
4-second delay (let reader see the book first)
    ↓
Banner slides up from bottom
    ↓
[If user triggers a consent-gated feature before 4s
 e.g. adjusts font size → banner appears immediately]
    ↓
User makes a choice (Accept All / Reject / Manage)
    ↓
ConsentState saved to localStorage
    ↓
Banner dismissed permanently
    ↓
Consent-gated features activate or stay inactive
    ↓
─────────────────────────────────────────────────
Returning visit
    ↓
bl_consent_v1 found in localStorage
    ↓
decided: true → banner never shown again
    ↓
Features activate immediately based on saved categories
    ↓
─────────────────────────────────────────────────
User wants to change preferences
    ↓
"Privacy Preferences" link in footer (always visible)
    ↓
Opens Preferences Modal directly (no banner)
    ↓
User adjusts toggles, clicks "Save My Preferences"
    ↓
New ConsentState saved, page reloads to apply changes
    ↓
─────────────────────────────────────────────────
Version bump (new category added in future)
    ↓
bl_consent_v1 version !== current version
    ↓
Banner shown again for re-consent (with 4s delay)
    ↓
Previous decisions preserved as toggle defaults
```

**No cookie wall.** The site works fully without ever dismissing the banner. The 4-second delay is a UX choice — legally the banner could appear immediately, but showing it before the user sees any content creates a hostile first impression for a cultural library.

---

#### Footer Update

```astro
<!-- Base.astro footer -->
<footer>
  <div>বাংলা পাঠাগার · Bangla Library</div>
  <div style="margin-top: 8px; font-size: 0.75rem; opacity: 0.6;">
    <a href={`${base}/privacy`}>Privacy Policy</a>
    <span style="margin: 0 8px;">·</span>
    <a href={`${base}/privacy#cookies`}>Cookie Policy</a>
    <span style="margin: 0 8px;">·</span>
    <button id="open-prefs" style="background:none;border:none;
      color:var(--gold-dim);cursor:pointer;font-size:0.75rem;
      text-decoration:underline;">
      Privacy Preferences
    </button>
    <span style="margin: 0 8px;">·</span>
    <a href={`${base}/about`}>About</a>
  </div>
</footer>
```

The **"Privacy Preferences"** footer link opens the modal directly — required under GDPR so users can withdraw consent at any time.

---

#### ConsentManager.jsx — Full Component Spec

```typescript
// src/components/ConsentManager.jsx
// Single component handling: banner + modal + consent state + script injection
// Mount in Base.astro as: <ConsentManager client:load privacyUrl="/privacy" />

interface ConsentManagerProps {
  privacyUrl: string
  cfBeaconToken: string       // Cloudflare Analytics token
}

// Internal state:
interface ComponentState {
  showBanner: boolean         // show bottom banner
  showModal: boolean          // show preferences modal
  consent: ConsentState       // current consent object
  draft: ConsentState         // in-modal draft (not yet saved)
}

// Key functions:
// acceptAll()      → set all true, save, dismiss banner
// rejectAll()      → set non-essential false, save, dismiss banner
// savePreferences()→ save draft state, dismiss modal, reload page
// openModal()      → show modal (from banner "Manage" or footer link)
// closeModal()     → close modal, revert draft to saved state

// Global event:
// document.dispatchEvent(new Event('bl:open-prefs'))
// → footer button listens for this to open modal from outside React
```

---

#### Privacy Policy Page (`/privacy`)

Required under GDPR Article 13. Bilingual English + Bangla.

**Sections:**

1. **Data Controller** — your name + contact email
2. **What we store locally** — functional localStorage items, listed explicitly
3. **Cloudflare Web Analytics** — what it collects, link to Cloudflare privacy policy, how to opt out
4. **Cloudflare Workers** — IP rate limiting, temporary, not stored
5. **GitHub Issues** — book request submissions, public by nature
6. **Your Rights** — access, rectification, erasure, objection, portability, lodge complaint with BfDI (Germany's data protection authority)
7. **No cookies** — explicit statement
8. **No data sales** — explicit statement
9. **No profiling** — explicit statement
10. **Contact** — email address for GDPR requests
11. **Last updated** — date

**Link to BfDI:** `https://www.bfdi.bund.de` — Germany's federal data protection authority. Including this link is best practice and shows good faith compliance.

---

#### Legal Summary

| Requirement | How met |
|---|---|
| GDPR Art. 13 — inform users at collection | Privacy Policy page + consent banner |
| GDPR Art. 7 — freely given, specific, informed consent | Three categories, granular control, no pre-ticked boxes |
| GDPR Art. 7(3) — right to withdraw consent | Privacy Preferences link in footer, always accessible |
| GDPR — no consent for strictly necessary | `necessary` category exempt, clearly labelled |
| GDPR — no cookie wall | Full site works with all non-essential rejected |
| GDPR — data minimisation | Only functional data stored, nothing else |
| GDPR — right to erasure | Clear browser storage = all local data gone |
| GDPR — right to object | Privacy preferences + contact email |
| TTDSG §25 — localStorage consent | Full consent manager covers this |
| German TMG §5 — Impressum | Add name + email to About page |
| BfDI complaint right | Linked in privacy policy |

---

#### File Locations

```
src/components/
  └── ConsentManager.jsx      ← Single component: banner + modal + injection
src/pages/
  └── privacy/
      └── index.astro         ← Privacy & Cookie Policy (bilingual)
```

---

### 3.11 Request a Book (`/request`)

**Purpose:** Let readers suggest books they want to see in the library. No login required. Submissions create a GitHub Issue automatically via the Cloudflare Worker.

**Nav placement:** Top navigation bar — `Books · Authors · Request a Book · About`

---

#### Page Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  বই অনুরোধ করুন                                    │
│  Request a Book                                     │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Don't see a book you love? Request it here.        │
│  We'll review it and add it to the library          │
│  if it's in the public domain.                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Book Title (Bangla)  *required             │   │
│  │  [ বইয়ের নাম লিখুন...                    ]  │   │
│  │                                             │   │
│  │  Book Title (English)                       │   │
│  │  [ Book title in English...               ]  │   │
│  │                                             │   │
│  │  Author Name  *required                     │   │
│  │  [ লেখকের নাম...                           ]  │   │
│  │                                             │   │
│  │  Publication Year (approx)                  │   │
│  │  [ e.g. 1905                              ]  │   │
│  │                                             │   │
│  │  Why do you want this book?  (optional)     │   │
│  │  [ Tell us why this book matters to you   ]  │   │
│  │  [                                        ]  │   │
│  │                                             │   │
│  │  Your name  (optional)                      │   │
│  │  [ Anonymous if left blank               ]  │   │
│  │                                             │   │
│  │            [ Submit Request →  ]            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📋 Open Requests  (pulled live from GitHub Issues) │
│                                                     │
│  [👁 Gora by Tagore]              12 👍  OPEN      │
│  [👁 Devdas by Sarat Chandra]      8 👍  OPEN      │
│  [👁 Sultana's Dream]              5 👍  IN PROGRESS│
│  [👁 Nil Darpan by Dinabandhu]     3 👍  OPEN      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

#### Architecture

Same pattern as Weddly contact form — static page, Cloudflare Worker proxies to GitHub Issues API.

```
Visitor fills form + clicks Submit
          ↓
RequestForm.jsx (React Island)
  - client-side validation
  - honeypot spam field (hidden, bots fill it)
          ↓
POST /request to Cloudflare Worker
          ↓
┌─────────────────────────────────┐
│  Cloudflare Worker              │
│                                 │
│  1. Validate fields             │
│  2. Check honeypot              │
│  3. Rate limit by IP            │
│     (max 3 requests/hour)       │
│  4. Call GitHub Issues API      │
│     POST /repos/.../issues      │
│  5. Return success/error        │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  GitHub Issues                  │
│  bangla-library repo            │
│                                 │
│  Title: "Book Request: Gora"    │
│  Label: "book-request"          │
│  Body: structured template      │
└─────────────────────────────────┘
               ↓
  You see it in GitHub Issues tab
  Triage, label, add to schedule
```

---

#### GitHub Issue Template

Each submission creates an issue with this body format:

```markdown
## Book Request

**Title (Bangla):** গোরা
**Title (English):** Gora
**Author:** Rabindranath Tagore
**Year:** 1910

**Why this book:**
This is Tagore's most ambitious novel exploring
identity and nationalism. I've been searching for
a bilingual version for years.

**Requested by:** Karim Ahmed (anonymous if blank)
**Date:** 2026-03-15

---
*Submitted via bangla-library request form*
*Copyright status: verify before adding*
```

**Issue labels applied automatically:**
- `book-request` — all submissions
- `public-domain-check` — reminder to verify copyright

**Issue title format:**
```
Book Request: [Title in English] — [Author]
```

---

#### Open Requests Panel

Below the form, show all open GitHub Issues with label `book-request` — pulled at build time via GitHub API. Readers can see what others have requested and feel part of the community.

```typescript
// Fetched at build time in request/index.astro
// GitHub Issues API — public repo, no auth needed for reads
const issues = await fetch(
  'https://api.github.com/repos/shahriarspace/bangla-library/issues?labels=book-request&state=open'
).then(r => r.json());
```

Each issue row shows:
- Book title (from issue title)
- Number of 👍 reactions (community votes)
- Status label: OPEN / IN PROGRESS / COMPLETED
- Link to the GitHub issue for full context

Sorted by 👍 reactions descending — most wanted books float to the top naturally.

**Important — Optimistic UI after submission:**
After a successful submission the Open Requests list is stale (fetched at last build time). The visitor's new request won't appear until the next deploy. Without intervention they may submit duplicates thinking the first one failed.

Solution: after successful submission, prepend the new request to the visible list immediately in React state — before the next build refreshes it:

```jsx
// In RequestForm.jsx — after successful POST
setRequests(prev => [{
  id: 'pending-' + Date.now(),
  title: `Book Request: ${formData.title_en} — ${formData.author}`,
  reactions: { '+1': 0 },
  labels: [{ name: 'book-request' }],
  html_url: '#',
  isPending: true,   // flag to show "Pending review" badge instead of 👍
}, ...prev]);
```

The pending item shows a "Just submitted" badge instead of a 👍 count. On next page load it's replaced by the real GitHub Issue data.

---

#### RequestForm.jsx (React Island)

```typescript
// Form state
interface FormState {
  title_bn: string        // required
  title_en: string        // optional
  author: string          // required
  year: string            // optional
  reason: string          // optional, max 500 chars
  name: string            // optional, "Anonymous" if blank
  honeypot: string        // hidden, must be empty
}

// Submission states
type Status = 'idle' | 'submitting' | 'success' | 'error' | 'rate_limited'
```

**Validation rules:**
- `title_bn` or `title_en` — at least one required
- `author` — required, min 2 chars
- `reason` — max 500 characters, counter shown
- `honeypot` — hidden field, if filled → silent reject (bot)
- All fields stripped of HTML before sending

**Success state:**
```
┌─────────────────────────────────────┐
│                                     │
│  ✓  Request submitted!              │
│                                     │
│  Your request has been added to     │
│  the list below. We review all      │
│  requests and aim to respond        │
│  within a few days.                 │
│                                     │
│  [ Submit another request ]         │
│                                     │
└─────────────────────────────────────┘
```

**Rate limit state:**
```
You've submitted 3 requests recently.
Please wait an hour before submitting more.
```

---

#### Cloudflare Worker — `/request` endpoint

Add to existing unified worker (`cloudflare-worker/index.js`):

```js
// POST /request — create GitHub issue
if (path === '/request' && request.method === 'POST') {
  const body = await request.json();

  // Honeypot check
  if (body.honeypot) {
    return new Response(JSON.stringify({ ok: true }), { headers });
    // Silently succeed — don't tell bots they were caught
  }

  // Rate limit: 3 requests per IP per hour
  const ip = request.headers.get('CF-Connecting-IP');
  const rateKey = `rate:request:${ip}`;
  const count = parseInt(await env.READS_KV.get(rateKey) || '0');
  if (count >= 3) {
    return new Response(
      JSON.stringify({ error: 'rate_limited' }),
      { status: 429, headers }
    );
  }
  await env.READS_KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });

  // Validate required fields
  if (!body.author || (!body.title_bn && !body.title_en)) {
    return new Response(
      JSON.stringify({ error: 'missing_fields' }),
      { status: 400, headers }
    );
  }

  // Sanitise inputs
  const sanitise = (s) => String(s || '').slice(0, 500)
    .replace(/<[^>]*>/g, '');

  const titleEn = sanitise(body.title_en) || sanitise(body.title_bn);
  const titleBn = sanitise(body.title_bn);
  const author  = sanitise(body.author);
  const year    = sanitise(body.year);
  const reason  = sanitise(body.reason);
  const name    = sanitise(body.name) || 'Anonymous';

  // Build issue body
  const issueBody = [
    '## Book Request',
    '',
    `**Title (Bangla):** ${titleBn || '—'}`,
    `**Title (English):** ${titleEn || '—'}`,
    `**Author:** ${author}`,
    `**Year:** ${year || 'Unknown'}`,
    '',
    `**Why this book:**`,
    reason || '*(No reason given)*',
    '',
    `**Requested by:** ${name}`,
    `**Date:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '*Submitted via bangla-library request form*',
    '*Copyright status: verify before adding*',
  ].join('\n');

  // Create GitHub Issue
  const issueRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'bangla-library-worker',
      },
      body: JSON.stringify({
        title: `Book Request: ${titleEn} — ${author}`,
        body: issueBody,
        labels: ['book-request', 'public-domain-check'],
      }),
    }
  );

  if (!issueRes.ok) {
    return new Response(
      JSON.stringify({ error: 'github_error' }),
      { status: 500, headers }
    );
  }

  const issue = await issueRes.json();
  return new Response(
    JSON.stringify({ ok: true, issue_url: issue.html_url }),
    { headers }
  );
}
```

---

#### Your Triage Workflow

When a request comes in you get a GitHub notification email. Your workflow:

```
New issue arrives in GitHub
          ↓
Is it public domain?    No  → Close with label "copyright-protected"
          ↓ Yes                Comment explaining why
Is it already planned?  Yes → Close with label "already-planned"
          ↓ No                 Comment with expected date
Add to publish schedule
  → Update data/coming-soon.json
  → Label issue "in-progress"
          ↓
Book published
  → Close issue with label "completed"
  → Comment with link to the book page
```

This creates a transparent, community-facing pipeline. Readers see their requests actioned and feel invested in the library.

---

#### Nav Update

Add "Request a Book" to `Base.astro` navigation:

```astro
<!-- Base.astro nav links -->
<a href={`${base}/books`}>Books</a>
<a href={`${base}/authors`}>Authors</a>
<a href={`${base}/request`} style="color: var(--gold);">
  + Request a Book
</a>
<a href={`${base}/about`}>About</a>
```

Subtle gold colour distinguishes it as a call-to-action without being aggressive.

---

#### File Locations

```
src/pages/request/
  └── index.astro           ← page shell, fetches open issues at build time
src/components/
  └── RequestForm.jsx       ← React island (form + submission logic)
```

## 4. Content Strategy & SEO

### 4.1 SEO Foundation

| Element | Implementation |
|---|---|
| Sitemap | `@astrojs/sitemap` — auto-generates on build |
| Robots.txt | `public/robots.txt` with sitemap URL |
| Meta tags | Title, description, OG tags on every page |
| Structured data | JSON-LD Book schema on book pages |
| Language tags | `lang="bn"` on Bangla text, `lang="en"` on English |
| Canonical URLs | Set via Astro `site` config |
| Google Search Console | Verified, sitemap submitted |

### 4.2 Target Keywords

**High volume (establish authority):**
- "Gitanjali English translation"
- "Rabindranath Tagore poems"
- "Devdas Bengali novel"
- "Sarat Chandra books"
- "Kazi Nazrul Islam poems"

**Medium volume (steady traffic):**
- "Begum Rokeya Sultana's Dream"
- "Bankimchandra Anandamath"
- "Ghare Baire English"
- "Bengali literature English translation"

**Long tail (easy page 1, zero competition):**
- "Meghnad Badh Kavya English translation"
- "Bishad Sindhu English full text"
- "Nil Darpan English translation"
- "Shesher Kobita translation"
- "[any obscure classic] English translation"

### 4.3 Author List — 100 Public Domain Books

#### Rabindranath Tagore (died 1941) — ~32 books
**Novels:** Nastanirh, Chokher Bali, Noukadubi, Gora, Chaturanga, Ghare Baire, Shesher Kobita, Jogajog, Char Adhyay

**Poetry:** Gitanjali, The Gardener, Stray Birds, Fruit-Gathering, The Crescent Moon, Sonar Tari, Manasi, Kalpana

**Short Stories:** Stories from Tagore, The Hungry Stones, Mashi and Other Stories, Broken Ties, Glimpses of Bengal

**Plays:** Raja, Dakghar, Achalayatan, Muktadhara, Raktakaravi, Chitra

**Essays:** Sadhana, Creative Unity, Nationalism, Thought Relics

#### Sarat Chandra Chattopadhyay (died 1938) — ~30 books
Devdas, Srikanta (4 parts), Parineeta, Choritrohin, Palli Samaj, Grihodaho, Nishkriti, Datta, Shesh Proshno, Pather Dabi, Biraj Bou, Boro Didi, Chandranath, Biprodas, Bindur Chele, Shoroshi, Bamuner Meye, Shesher Porichoy, Agamikal, Anuradha, Mahesh (short stories), Bilashi, Abhagir Swarga

#### Begum Rokeya (died 1932) — 5 books
Sultana's Dream, Padmarag, Matichur Vol 1, Matichur Vol 2, Abarodhbasini

#### Bankimchandra Chattopadhyay (died 1894) — ~14 books
Anandamath, Durgesh Nandini, Kapalkondala, Devi Chaudhurani, Rajmohan's Wife, Bishabriksha, Krishnakanter Will, Rajani, Mrinalini, Indira, Sitaram, Chandrasekhar

#### Kazi Nazrul Islam (died 1976) — ~12 books
**Poetry:** Bidrohi, Agniveena, Sanchita, Dolon Champa, Chokher Chata
**Novels:** Bandhan Hara, Mrityukshuda, Kuhelika
**Short Stories:** Byathar Daan, Rikter Bedon, Shiulimala

#### Michael Madhusudan Dutt (died 1873) — 4 books
Meghnad Badh Kavya, Tilottama Sambhav, Birangana, Chaturdashpadi Kavitabali

#### Mir Mosharraf Hossain (died 1912) — 4 books
Bishad Sindhu ✅, Jamidar Darpan, Ratnavati, Basantkumari

**Total: ~100 books — all public domain**

### 4.4 52-Week Publish Schedule

#### Phase 1 — Authority Building (Weeks 1–13)
High-demand authors and titles to establish domain authority fast.

| Week | Book | Author | SEO Priority |
|---|---|---|---|
| 1 | Gitanjali ✅ | Tagore | Nobel Prize — global searches |
| 2 | Bishad Sindhu ✅ | Mir Mosharraf | Already live |
| 3 | Devdas | Sarat Chandra | Most filmed Bengali novel |
| 4 | Ghare Baire | Tagore | Satyajit Ray film |
| 5 | Sultana's Dream | Begum Rokeya | Global feminist academic interest |
| 6 | Chokher Bali | Tagore | Satyajit Ray film |
| 7 | Bidrohi + Agniveena | Nazrul | Bangladesh national poet |
| 8 | Srikanta Part 1 | Sarat Chandra | Most epic Bengali novel |
| 9 | Gora | Tagore | Major identity-theme novel |
| 10 | Parineeta | Sarat Chandra | Bollywood film |
| 11 | Anandamath | Bankimchandra | Vande Mataram origin |
| 12 | Nastanirh (Charulata) | Tagore | Satyajit Ray's Charulata |
| 13 | Stories from Tagore | Tagore | Multiple individual search queries |

#### Phase 2 — Long Tail Expansion (Weeks 14–26)
Mix of popular and obscure — easy page 1 rankings.

| Week | Book | Author |
|---|---|---|
| 14 | Padmarag | Begum Rokeya |
| 15 | Choritrohin | Sarat Chandra |
| 16 | Meghnad Badh Kavya | Madhusudan Dutt |
| 17 | Stray Birds | Tagore |
| 18 | Palli Samaj | Sarat Chandra |
| 19 | The Gardener | Tagore |
| 20 | Nishkriti | Sarat Chandra |
| 21 | Durgesh Nandini | Bankimchandra |
| 22 | Shesher Kobita | Tagore |
| 23 | Kuhelika | Nazrul |
| 24 | Pather Dabi | Sarat Chandra |
| 25 | Noukadubi | Tagore |
| 26 | Grihodaho | Sarat Chandra |

#### Phase 3 — Complete the Library (Weeks 27–52)
One book per week from remaining titles. Prioritise by search volume.

Remaining titles include: Biraj Bou, Datta, Shesh Proshno, Chandranath, Biprodas, Kapalkondala, Devi Chaudhurani, Rajmohan's Wife, Matichur (Vol 1 & 2), Abarodhbasini, Sanchita, Bandhan Hara, Mrityukshuda, Byathar Daan, Shiulimala, Krishnakanter Will, Rajani, Mrinalini, Tilottama Sambhav, Birangana, Jamidar Darpan, remaining Tagore novels, plays, and essay collections.

---

## 5. Publishing Workflow

### 5.1 Translation Process

**Tool:** Claude.ai (free tier) using structured JSON prompt

**Prompt template:**
```
Translate the following Bangla text to English.
Output ONLY valid JSON in this exact format, no other text,
no markdown code blocks:

[
  {"id": 1, "bn": "original paragraph", "en": "translation"},
  {"id": 2, "bn": "original paragraph", "en": "translation"}
]

IMPORTANT — paragraph grouping rules:
- Group 3 to 5 sentences into each single paragraph entry
- Never create a paragraph entry with only 1 sentence
- Short dialogue lines (single sentences) should be grouped
  with the surrounding narrative — do not split them out alone
- Target: each paragraph entry should be 40-120 words in Bangla
- Exception: if a single sentence is genuinely a standalone
  paragraph in the original (e.g. a dramatic one-liner),
  keep it separate

Preserve the author's literary voice, tone, and style.
This is classical Bengali literature — translate idiomatically,
not literally. Maintain the rhythm and register of the original.

Here is the text:
[PASTE CHAPTER HERE]
```

**Why paragraph grouping matters:** Single-sentence paragraphs (like the Moyurakkhi entries) cause choppy sync scroll with 1,000+ entries, slow DOM rendering on mobile, and a poor reading rhythm. Grouping into 3-5 sentences creates a natural reading pace and smooth scroll behaviour.

**Existing books with single-sentence entries** (e.g. Moyurakkhi) should be re-chunked — merge consecutive single-sentence entries into groups of 3-5 before the next site update.

**Per session capacity:**
- Free tier: ~30 messages/day
- One message = one chapter (~15–20 pages)
- Realistic output: 1–2 books per week on free tier

**Quality control:**
- Spot-check first and last paragraphs of every chapter
- Verify paragraph grouping — no single-sentence entries
- Flag idiomatic phrases for manual review
- Set `translation_reviewed: false` until human-checked
- Show "AI translated" badge on site until reviewed

### 5.2 Cover Image Sourcing

**Priority order:**

1. **Wikimedia Commons** — search `"[book title] [author]"` on commons.wikimedia.org
   - Download highest resolution available
   - Note attribution in JSON `image_credit` field
   - Save as `public/images/covers/[slug].jpg`

2. **Internet Archive** — archive.org
   - Search for original published editions
   - Download cover scan from book viewer
   - Public domain, no attribution required for pre-1926

3. **CSS fallback** — auto-generated if no image found
   - Gold on dark theme matching site aesthetic
   - Bangla title large, English subtitle, author, year
   - Consistent branding across all books

### 5.3 Adding a New Book — Step by Step

```bash
# 1. Create the JSON file
touch src/content/books/[slug].json

# 2. Fill in metadata (title, author, year, category, description)

# 3. Source Bangla text from Wikisource or Internet Archive

# 4. Translate using Claude.ai JSON prompt
#    Paste chapter by chapter, collect JSON arrays
#    Merge all chapters into single paragraphs array

# 5. Source cover image from Wikimedia Commons
#    Save to public/images/covers/[slug].jpg

# 6. Test locally
npm run dev
# Visit localhost:4321/books/[slug]
# Check bilingual reader works
# Check cover displays correctly

# 7. Commit and push
git add src/content/books/[slug].json
git add public/images/covers/[slug].jpg
git commit -m "add [Book Title] by [Author]"
git push
# GitHub Actions deploys automatically (~2 min)
```

### 5.4 Adding a New Author — Step by Step

```bash
# 1. Create the JSON file
touch src/content/authors/[slug].json

# 2. Fill in: names, dates, bio_en, bio_bn, facts, awards

# 3. Source portrait from Wikimedia Commons
#    Must be public domain (author died 70+ years ago)
#    Save to public/images/authors/[slug].jpg

# 4. Commit alongside first book by this author
git add src/content/authors/[slug].json
git add public/images/authors/[slug].jpg
git commit -m "add author profile: [Author Name]"
git push
```

### 5.5 Weekly Publishing Rhythm

```
Monday:    Prepare book JSON + translation
Tuesday:   Quality check translation, source cover
Wednesday: Write author profile (if new author)
Thursday:  Test locally, git push → auto deploys
Friday:    Submit new URLs to Google Search Console
           Share on social (WhatsApp groups, Facebook, Twitter)
```

### 5.6 Moderation Workflow

Comments arrive as GitHub commits via Cloudflare Worker with `approved: false`.

```
New comment notification (GitHub email)
         ↓
Open data/interactions/[slug].json on GitHub
         ↓
Read the comment
         ↓
If OK:   change "approved": false → true, commit
If spam: delete the comment object, commit
         ↓
Change live on site within 1 minute
```

---

---

## 6. Scheduled Publishing Pipeline

### 6.1 Overview

Books are prepared in advance with a future publish date and an `unpublished` status flag. A GitHub Action runs daily at 6am UTC, finds all books whose `publish_date` has arrived, flips their status to `published`, commits the change, and triggers an automatic Astro rebuild. The book appears on the site within 3 minutes — zero manual intervention required.

```
You prepare books in advance          GitHub Action runs 6am UTC daily
with status: "unpublished"      →     Finds due books
and publish_date: "2026-04-01"        Flips to status: "published"
Push to GitHub and forget             Commits change → triggers deploy
                                      Site rebuilds → book live ~3 min
```

---

### 6.2 Strategy: Date-Based with Priority

Each book JSON has three publish-control fields:

```json
{
  "title_en": "Devdas",
  "status": "unpublished",
  "publish_date": "2026-03-20",
  "priority": 1
}
```

| Field | Type | Purpose |
|---|---|---|
| `status` | `'published' \| 'unpublished'` | Controls visibility — unpublished books never appear on the site at all |
| `publish_date` | ISO date `"YYYY-MM-DD"` | The date the Action should publish this book |
| `priority` | `1 \| 2` | Tie-breaker: 1 = publish on this specific date, 2 = flexible fill |

**Priority 1** — You want this book on exactly this date (e.g. Tagore's birthday, Eid, a cultural anniversary).

**Priority 2** — Any date works. The Action publishes all overdue books when their date arrives regardless of priority.

---

### 6.3 Astro Content Collection Update

Update `src/content/config.ts` to require the new fields:

```typescript
const books = defineCollection({
  type: 'data',
  schema: z.object({
    title_bn: z.string(),
    title_en: z.string(),
    status: z.enum(['published', 'unpublished']).default('unpublished'),
    publish_date: z.string(),          // "YYYY-MM-DD"
    priority: z.number().default(2),   // 1 or 2
    published_date: z.string().optional(), // set by Action when it goes live
    // ... all existing fields unchanged
  }),
});
```

**Every Astro page that lists books filters by status:**

```astro
---
// Applied in: index.astro, books/index.astro, authors/[slug].astro
// FeaturedSection props, stats page, sitemap
const books = await getCollection('books',
  ({ data }) => data.status === 'published'
);
---
```

Unpublished books are fully in the repo but produce zero pages, zero sitemap entries, and zero search index entries until the Action flips them.

---

### 6.4 Publish Script (`scripts/scheduled-publish.mjs`)

**Confirmed strategy: Option A — Pre-create GitHub Discussions.** Every book gets a GitHub Discussion created the moment it publishes. Anonymous comments work from minute one — no GitHub user needs to "start" the thread first. The script uses the GitHub GraphQL API (required for Discussions — REST does not support Discussion creation).

**Environment variables required:**
```
GITHUB_REPO      = shahriarspace/bangla-library
BOT_GITHUB_TOKEN = banglalib-bot personal access token
                   Scopes needed: public_repo, write:discussion
```

```js
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const BOOKS_DIR        = 'src/content/books';
const COMING_SOON_PATH = 'data/coming-soon.json';
const GITHUB_OWNER     = 'shahriarspace';
const GITHUB_REPO_NAME = 'bangla-library';
const BOT_TOKEN        = process.env.BOT_GITHUB_TOKEN;
const today            = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD" UTC

// ─── GraphQL helper ───────────────────────────────────────────────────────────

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'bangla-library-bot',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ─── Get repo node ID (needed for createDiscussion mutation) ──────────────────

async function getRepoAndCategoryIds() {
  const data = await graphql(`
    query GetIds($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 20) {
          nodes { id name }
        }
      }
    }
  `, { owner: GITHUB_OWNER, name: GITHUB_REPO_NAME });

  const repo = data.repository;
  const category = repo.discussionCategories.nodes
    .find(c => c.name === 'Book Comments');

  if (!category) {
    throw new Error(
      'GitHub Discussion category "Book Comments" not found. ' +
      'Create it in repo Settings → Discussions before running this script.'
    );
  }

  return { repoId: repo.id, categoryId: category.id };
}

// ─── Check if discussion already exists for this slug ────────────────────────

async function discussionExists(slug) {
  // Search discussions by title to avoid duplicates
  const data = await graphql(`
    query CheckDiscussion($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100) {
          nodes { title }
        }
      }
    }
  `, { owner: GITHUB_OWNER, name: GITHUB_REPO_NAME });

  const discussions = data.repository.discussions.nodes;
  return discussions.some(d => d.title === `/books/${slug}`);
}

// ─── Create GitHub Discussion for a book ─────────────────────────────────────

async function createDiscussion(slug, titleEn, titleBn, authorEn, repoId, categoryId) {
  // Title must match Giscus pathname mapping exactly
  // Giscus config: data-mapping="pathname"
  // So title = "/books/[slug]" = the page URL path

  const body = [
    `## ${titleBn} · ${titleEn}`,
    `**Author:** ${authorEn}`,
    '',
    'Share your thoughts on the translation, the original text, or anything else about this book.',
    '',
    'You can comment here with your GitHub account, or use the **anonymous comment form** on the book page — no login needed.',
    '',
    '---',
    `*[Read this book on বাংলা পাঠাগার](https://banglalib.org/books/${slug})*`,
  ].join('\n');

  const data = await graphql(`
    mutation CreateDiscussion($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion {
          id
          number
          url
        }
      }
    }
  `, {
    input: {
      repositoryId: repoId,
      categoryId:   categoryId,
      title:        `/books/${slug}`,
      body,
    }
  });

  return data.createDiscussion.discussion;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const files    = await readdir(BOOKS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  const published = [];

  // ── Prefetch IDs once (not per-book) ────────────────────────────────────
  let repoId = null;
  let categoryId = null;

  if (BOT_TOKEN) {
    try {
      console.log('Fetching GitHub repo and discussion category IDs...');
      ({ repoId, categoryId } = await getRepoAndCategoryIds());
      console.log(`  Repo ID:     ${repoId}`);
      console.log(`  Category ID: ${categoryId}`);
    } catch (err) {
      console.warn(`⚠️  Could not fetch GitHub IDs: ${err.message}`);
      console.warn('   Books will publish but discussions will NOT be pre-created.');
      console.warn('   Fix the error and re-run manually, or create discussions manually.');
    }
  } else {
    console.warn('⚠️  BOT_GITHUB_TOKEN not set — discussions will not be pre-created.');
  }

  // ── Process each book file ───────────────────────────────────────────────
  for (const file of jsonFiles) {
    const filePath = join(BOOKS_DIR, file);
    const book = JSON.parse(await readFile(filePath, 'utf-8'));

    // Skip already published
    if (book.status === 'published') continue;

    // Skip books not yet due
    if (!book.publish_date || book.publish_date > today) continue;

    const slug = file.replace('.json', '');

    // ── Step 1: Flip status to published ──────────────────────────────────
    book.status         = 'published';
    book.published_date = today;
    await writeFile(filePath, JSON.stringify(book, null, 2));
    console.log(`\n✅ Published: ${book.title_en} (${slug})`);

    // ── Step 2: Pre-create GitHub Discussion ──────────────────────────────
    if (repoId && categoryId) {
      try {
        const exists = await discussionExists(slug);
        if (exists) {
          console.log(`   💬 Discussion already exists for /books/${slug}`);
        } else {
          const disc = await createDiscussion(
            slug, book.title_en, book.title_bn, book.author_en,
            repoId, categoryId
          );
          console.log(`   💬 Discussion created: ${disc.url}`);
        }
      } catch (err) {
        // Non-fatal — book still publishes, discussion can be created manually
        console.warn(`   ⚠️  Discussion creation failed for ${slug}: ${err.message}`);
      }
    }

    published.push({ slug, title: book.title_en });
  }

  // ── Nothing to publish today ─────────────────────────────────────────────
  if (published.length === 0) {
    console.log('\nℹ️  No books due today — nothing to publish.');
    process.exit(0); // Exit 0 = no file changes = no commit
  }

  // ── Remove published books from coming-soon.json ─────────────────────────
  try {
    const raw        = await readFile(COMING_SOON_PATH, 'utf-8');
    const comingSoon = JSON.parse(raw);
    const pubSlugs   = new Set(published.map(b => b.slug));
    const updated    = comingSoon.filter(item => !pubSlugs.has(item.slug));

    if (updated.length !== comingSoon.length) {
      await writeFile(COMING_SOON_PATH, JSON.stringify(updated, null, 2));
      const removed = comingSoon.length - updated.length;
      console.log(`\n📋 Removed ${removed} book(s) from coming-soon.json`);
    }
  } catch {
    console.log('\nℹ️  coming-soon.json not found — skipping.');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n📚 Published ${published.length} book(s) on ${today}:`);
  published.forEach(b => console.log(`   - ${b.title} (${b.slug})`));

  process.exit(1); // Exit 1 = files changed = Action must commit
}

run().catch(err => {
  console.error('\n❌ Fatal error in publish script:', err.message);
  process.exit(2); // Exit 2 = error = Action fails with GitHub notification
});
```


**Exit codes:**

| Code | Meaning | Action behaviour |
|---|---|---|
| `0` | Nothing to publish | Skips commit cleanly |
| `1` | Books published | Commits + pushes → triggers deploy |
| `2` | Script error | Action fails → you get GitHub notification |

---

### 6.5 GitHub Action (`.github/workflows/scheduled-publish.yml`)

```yaml
name: Scheduled Book Publishing

on:
  schedule:
    - cron: '0 6 * * *'    # 6:00am UTC daily
                            # = 7:00am CET (winter)
                            # = 8:00am CEST (summer)
  workflow_dispatch:         # Manual trigger for testing

permissions:
  contents: write            # Needed to commit status changes

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run publish script
        id: publish
        env:
          BOT_GITHUB_TOKEN: ${{ secrets.BOT_GITHUB_TOKEN }}
          GITHUB_REPO: shahriarspace/bangla-library
        run: |
          node scripts/scheduled-publish.mjs
          echo "exit_code=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Commit published books
        if: steps.publish.outputs.exit_code == '1'
        run: |
          git config user.name "Bangla Library Bot"
          git config user.email "bot@banglalib.org"
          git add src/content/books/*.json
          git add data/coming-soon.json || true
          git commit -m "publish: scheduled release $(date -u +%Y-%m-%d)"
          git push

      - name: Nothing to publish
        if: steps.publish.outputs.exit_code == '0'
        run: echo "No books due today — nothing to do."

      - name: Script error
        if: steps.publish.outputs.exit_code == '2'
        run: |
          echo "Publish script encountered an error!"
          exit 1
```

The commit in step 4 automatically triggers `deploy.yml` via the push-to-main event. No manual deploy trigger needed — the chain is fully automatic.

**One-time setup — add `BOT_GITHUB_TOKEN` as a GitHub Actions secret:**
```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret
Name:  BOT_GITHUB_TOKEN
Value: [banglalib-bot personal access token]
       Scopes: public_repo + write:discussion
```

**One-time setup — create "Book Comments" Discussion category:**
```
GitHub repo → Discussions tab → Categories (gear icon) → New Category
Name:        Book Comments
Format:      Open-ended discussion
Description: Reader discussions for each book in the library
```
This category must exist before the publish script runs for the first time.

---

### 6.6 Full Trigger Chain

```
6:00am UTC
      ↓
scheduled-publish.yml starts
      ↓
scripts/scheduled-publish.mjs runs
Finds: status="unpublished" AND publish_date <= today
      ↓
Flips each due book:
  status: "unpublished" → "published"
  published_date: "2026-03-20"      ← records actual live date
      ↓
Removes from data/coming-soon.json
      ↓
Exits code 1 (files changed)
      ↓
Action commits:
  "publish: scheduled release 2026-03-20"
      ↓
Commit to main triggers deploy.yml
      ↓
Astro build runs:
  New book page generated (/books/devdas)
  Sitemap updated
  Pagefind search index updated
  coming-soon panel updated on homepage
      ↓
GitHub Pages deploys
      ↓
Book live ≈ 3 minutes after 6:00am
```

---

### 6.7 Your Batch Preparation Workflow

```
Sunday evening (one preparation session):
──────────────────────────────────────────
1. Translate 5–7 books via Claude.ai JSON prompt
2. Source cover images from Wikimedia Commons
3. Create JSON files with:
     status: "unpublished"
     publish_date: spread across next 2 weeks
4. Push everything to GitHub in ONE commit
5. Done — forget about it

Automatic daily publishing:
────────────────────────────
Tue 6am → devdas.json goes live
Fri 6am → ghare-baire.json goes live
Mon 6am → sultanas-dream.json goes live
Thu 6am → chokher-bali.json goes live
Sun 6am → srikanta-part1.json goes live
```

Example batch commit with spread dates:

```json
devdas.json          → publish_date: "2026-03-18", priority: 1
ghare-baire.json     → publish_date: "2026-03-21", priority: 2
sultanas-dream.json  → publish_date: "2026-03-24", priority: 1
chokher-bali.json    → publish_date: "2026-03-27", priority: 2
srikanta-part1.json  → publish_date: "2026-03-30", priority: 2
```

One push on Sunday. Five books publish automatically over 12 days.

---

### 6.8 Edge Cases

| Situation | Behaviour |
|---|---|
| No books due today | Script exits 0 — no commit, no build, no cost |
| Action misses a day (GitHub outage) | Next run catches all overdue books — nothing lost |
| Multiple books same date | All publish in one commit, one build |
| You want instant publish | Set `status: "published"` directly — bypasses pipeline |
| Delay a book | Edit `publish_date` before 6am that day |
| Cancel a book | Set `publish_date: "2099-01-01"` or delete file |
| Book missing `publish_date` | Script skips it safely |
| `coming-soon.json` missing | Script logs notice and continues |

---

### 6.9 SEO Benefit of Drip Publishing

Daily commits signal to Google that the site is actively maintained:

```
Each daily commit: "publish: scheduled release 2026-03-20"

→ Googlebot detects frequent site changes
→ Crawl rate increases automatically
→ Each book gets its own crawl + index cycle
→ Not treated as a bulk content dump
→ Each new book gets a freshness boost in rankings
→ Consistent content velocity = strong quality signal
```

Publishing 3–4 books per week via daily automated commits is one of the most effective passive SEO strategies available for a content site.

---

### 6.10 Manual Override

```bash
# Immediate publish — bypasses the pipeline entirely
# Edit the JSON directly:
"status": "published",
"published_date": "2026-03-15",

# Commit and push — deploys via deploy.yml in ~3 min
git add src/content/books/special-book.json
git commit -m "publish: immediate release - Tagore birthday"
git push

# Test the pipeline without waiting for 6am:
# GitHub → Actions → Scheduled Book Publishing → Run workflow
```


## 7. Analytics & Read Counter

### 6.1 Overview

Two complementary analytics layers — one for traffic overview, one for per-book read depth:

| Layer | Tool | What it measures |
|---|---|---|
| Traffic analytics | Cloudflare Web Analytics | Page views, visitors, countries, sources |
| Read counter | Custom (KV + Worker + GitHub) | Genuine reads per book (30s minimum) |

### 6.2 Cloudflare Web Analytics

**Setup:** One script tag in `Base.astro` `<head>`. Enable in Cloudflare Dashboard → Web Analytics.

```html
<!-- Base.astro -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

**GDPR compliance:** No cookies set, no personal data collected, no consent banner required. Fully compliant for Germany/EU by design.

**Dashboard provides:**
- Top pages (which books are most visited)
- Traffic sources (Google, direct, social)
- Country breakdown (confirm diaspora audience)
- Device types (mobile vs desktop)
- Core Web Vitals (site performance)
- Real-time visitor count

**Cost:** Free forever on Cloudflare.

---

### 6.3 Read Counter System

#### Philosophy

A page view is not a read. The read counter only fires after a visitor has been on the page for **30 seconds AND has scrolled into the reader** — confirming genuine reading engagement. This produces meaningful data, not inflated vanity metrics.

#### Full Architecture

```
User opens book page
        │
        ▼
React island (ReadCounter.jsx) mounts
        │
        ▼
IntersectionObserver watches reader div
        │
        ▼ (reader scrolls into view)
30-second countdown begins
        │
        ▼ (user stays 30+ seconds)
POST /read {slug: "gitanjali"}
        │
        ▼
┌─────────────────────────────────┐
│  Cloudflare Worker              │
│                                 │
│  1. Validate slug               │
│     (alphanumeric + hyphens)    │
│                                 │
│  2. Check bot signals           │
│     (User-Agent filter)         │
│                                 │
│  3. Increment KV counter        │
│     reads:gitanjali + 1         │
│                                 │
│  4. Return new count → UI       │
└──────────────┬──────────────────┘
               │
               │ Cron: every 10 minutes
               ▼
┌─────────────────────────────────┐
│  Cloudflare Cron Trigger        │
│                                 │
│  1. Read all KV counters        │
│  2. Fetch current               │
│     data/analytics/reads.json   │
│     from GitHub                 │
│  3. Merge + commit once         │
│  4. Reset KV to zero            │
└─────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  GitHub Repo                    │
│  data/analytics/reads.json      │
│                                 │
│  {                              │
│    "gitanjali": 847,            │
│    "devdas": 1923,              │
│    "bishad-sindhu": 634         │
│  }                              │
└─────────────────────────────────┘
```

#### Why Cloudflare KV as Buffer

Direct GitHub commits per read would hit GitHub's API rate limit (5,000 requests/hour) under normal traffic. KV buffers all reads in memory and batches them into a single GitHub commit every 10 minutes — regardless of how many readers visited in that window.

```
1,000 readers in 10 minutes
= 1,000 KV writes (fast, cheap)
= 1 GitHub commit (every 10 min)
= Never hits rate limits
```

#### Component: `ReadCounter.jsx`

```jsx
export default function ReadCounter({ slug, initialCount }) {
  const [count, setCount] = useState(initialCount);
  const [counted, setCounted] = useState(false);
  const readerRef = useRef(null);

  useEffect(() => {
    let timer = null;

    // Only start counting when reader is visible
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !counted) {
        timer = setTimeout(async () => {
          try {
            const res = await fetch(
              'https://your-worker.workers.dev/read',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug })
              }
            );
            const data = await res.json();
            setCount(data.count);
            setCounted(true);
          } catch (e) {
            // Fail silently — never break reading experience
          }
        }, 30000); // 30 seconds
      } else {
        clearTimeout(timer);
      }
    });

    if (readerRef.current) observer.observe(readerRef.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [slug, counted]);

  return (
    <div ref={readerRef}>
      <span style={{ fontSize: '0.8rem', color: 'var(--gold-dim)' }}>
        👁 {count.toLocaleString()} readers
      </span>
    </div>
  );
}
```

#### Cloudflare Worker (`cloudflare-worker/index.js`)

Unified worker handling interactions (likes/comments) AND read counter AND cron batch commit:

```js
export default {
  // Handle HTTP requests
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for GitHub Pages origin
    const headers = {
      'Access-Control-Allow-Origin': 'https://shahriarspace.github.io',
      'Content-Type': 'application/json',
    };

    // POST /read — increment read counter
    if (path === '/read' && request.method === 'POST') {
      // Bot protection
      const ua = request.headers.get('User-Agent') || '';
      if (['bot','crawler','spider'].some(b => ua.toLowerCase().includes(b))) {
        return new Response('Forbidden', { status: 403 });
      }

      const { slug } = await request.json();

      // Validate slug
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return new Response(JSON.stringify({ error: 'Invalid slug' }), { status: 400, headers });
      }

      // Increment in KV
      const current = parseInt(await env.READS_KV.get(`reads:${slug}`) || '0');
      const newCount = current + 1;
      await env.READS_KV.put(`reads:${slug}`, String(newCount));

      return new Response(JSON.stringify({ count: newCount }), { headers });
    }

    // POST /like — increment like counter
    if (path === '/like' && request.method === 'POST') {
      // ... like handler (existing interaction system)
    }

    // POST /comment — add comment
    if (path === '/comment' && request.method === 'POST') {
      // ... comment handler (existing interaction system)
    }

    return new Response('Not found', { status: 404 });
  },

  // Cron: commit KV read counts to GitHub every 10 minutes
  async scheduled(event, env) {
    const list = await env.READS_KV.list({ prefix: 'reads:' });
    if (list.keys.length === 0) return;

    // Build delta object from KV
    const delta = {};
    for (const key of list.keys) {
      const slug = key.name.replace('reads:', '');
      const count = parseInt(await env.READS_KV.get(key.name) || '0');
      if (count > 0) delta[slug] = count;
    }

    // Fetch current reads.json from GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/analytics/reads.json`,
      { headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'User-Agent': 'bangla-library-worker'
      }}
    );
    const existing = await getRes.json();
    const current = JSON.parse(atob(existing.content.replace(/\n/g, '')));

    // Merge delta into cumulative counts
    const merged = { ...current };
    for (const [slug, count] of Object.entries(delta)) {
      merged[slug] = (merged[slug] || 0) + count;
    }

    // Sort by count descending for readable JSON
    const sorted = Object.fromEntries(
      Object.entries(merged).sort(([,a],[,b]) => b - a)
    );

    // Commit back to GitHub
    await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/analytics/reads.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'bangla-library-worker'
        },
        body: JSON.stringify({
          message: `analytics: update read counts ${new Date().toISOString()}`,
          content: btoa(JSON.stringify(sorted, null, 2)),
          sha: existing.sha
        })
      }
    );

    // Reset KV counters to zero after committing
    for (const key of list.keys) {
      await env.READS_KV.put(key.name, '0');
    }
  }
}
```

#### Worker Config (`cloudflare-worker/wrangler.toml`)

```toml
name = "bangla-library-worker"
main = "index.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "READS_KV"
id = "your-kv-namespace-id"       # from Cloudflare dashboard

[triggers]
crons = ["*/10 * * * *"]          # every 10 minutes

[vars]
GITHUB_REPO = "shahriarspace/bangla-library"

# Secrets (set via: wrangler secret put GITHUB_TOKEN)
# GITHUB_TOKEN = set as secret, never in toml
```

#### Setup Steps

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create KV namespace
wrangler kv:namespace create READS_KV
# → Copy the ID into wrangler.toml

# 4. Set GitHub token secret
wrangler secret put GITHUB_TOKEN
# → Paste your GitHub personal access token (repo scope only)

# 5. Create initial reads.json in repo
echo "{}" > data/analytics/reads.json
git add data/analytics/reads.json
git commit -m "init analytics reads counter"
git push

# 6. Deploy worker
cd cloudflare-worker
wrangler deploy

# 7. Test it
curl -X POST https://your-worker.workers.dev/read \
  -H "Content-Type: application/json" \
  -d '{"slug":"gitanjali"}'
# → {"count": 1}
```

---

### 6.4 Stats Page (`/stats`)

A public page showing reading statistics — builds at deploy time from `data/analytics/reads.json`, with a React island for live updates.

**URL:** `/stats`

**Content:**

```
বাংলা পাঠাগার · Reading Statistics

Most Read Books — All Time
──────────────────────────────────────
1. ময়ূরাক্ষী     ████████████████  2,156 readers
2. গীতাঞ্জলি     ████████████      1,923 readers
3. দেবদাস        ████████          1,847 readers
4. বিষাদ সিন্ধু  ██████            1,204 readers
5. ঘরে বাইরে     █████               987 readers

Most Read Authors
─────────────────────────────────────
1. Rabindranath Tagore    6,234 total readers
2. Sarat Chandra          4,891 total readers
3. Begum Rokeya           1,204 total readers

Library at a Glance
────────────────────
Total reads:    14,847
Books:          52
Authors:        7
Languages:      2
```

**SEO value:** People search "best Bengali novels" or "most popular Bangla books" — this page answers with real data and links to every book.

**Implementation:** Static Astro page reads `data/analytics/reads.json` at build time for the initial render. A React island fetches live counts from the Worker for real-time updates between deploys.

---

### 6.5 On-Page Read Counter Display

Each book page shows the live reader count in the book header alongside likes and comments:

```
গীতাঞ্জলি · Gitanjali
Rabindranath Tagore · 1910

👁 847 readers    ❤️ 124 likes    💬 12 comments

[Start Reading →]
```

- Count is loaded from `data/analytics/reads.json` at build time (static, fast)
- `ReadCounter.jsx` island updates it live after the user's own read is counted
- Provides social proof — readers see they are not alone

---

### 6.6 Bot Protection Summary

| Signal | Action |
|---|---|
| Known bot User-Agent strings | Return 403, do not count |
| Read fired before 30 seconds | Client-side timer prevents this |
| Reader not scrolled into view | IntersectionObserver prevents this |
| Same session counted twice | `counted` state flag prevents double-counting |
| Slug not matching `[a-z0-9-]+` | Worker rejects with 400 |

---

## 8. User Authentication & Personalisation

### 7.1 Core Principle

**Everything is visible and usable without any login.**

```
No login required for:          Login adds:
────────────────────────        ─────────────────────────────
✅ Read all books               → Bookmarks synced across devices
✅ Use bilingual reader         → Reading history
✅ Search all content           → Continue reading from any device
✅ Like books                   → Comments attributed to profile
✅ Post comments                → Notification when request fulfilled
✅ Submit paragraph feedback    → Contributor profile (fixes submitted)
✅ Request books                → Reading preferences synced
✅ Browse authors               
✅ View stats                   
✅ Use all site features        
```

Login is an **enhancement layer**, never a gate. A first-time visitor from a Google search lands on a book page and reads the entire thing without ever seeing a login prompt.

---

### 7.2 Authentication Strategy

Three-tier progressive auth — users naturally move between tiers as their engagement deepens:

```
Tier 0: No auth (default)
  → Everything works via localStorage
  → Preferences and progress saved to this device only
  → Anonymous, zero friction

Tier 1: Firebase Anonymous Auth (silent, automatic)
  → Firebase silently assigns a UID on first meaningful action
    (e.g. adding a bookmark)
  → No prompt shown to user
  → Bookmarks and progress saved to Firestore
  → Persist across browser sessions on same device
  → UID stored in browser by Firebase SDK

Tier 2: Google Login (optional, user-initiated)
  → User clicks "Save your account" or "Sign in"
  → Anonymous UID linked to Google account
  → All previous bookmarks + progress migrate automatically
  → Synced across ALL devices
  → Display name + avatar shown in nav

Tier 3: GitHub Login (optional, for contributors)
  → Phase 4 — Year 2
  → Links contributions (feedback fixes) to GitHub profile
  → Contributor badge on user profile
```

---

### 7.3 Firebase Project Setup

**Project:** `bangla-library` on Firebase Spark (free) plan

**Services used:**
- Firebase Authentication (Anonymous + Google provider)
- Cloud Firestore (user data only — books stored in GitHub repo)

**Spark tier limits (free forever):**
```
Authentication:  10,000 sign-ins/month     → plenty
Firestore reads: 50,000/day                → plenty
Firestore writes: 20,000/day              → plenty
Firestore storage: 1GB                    → plenty for user data
```

**Firebase config (`src/lib/firebase.js`):**

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Environment variables** (in `.env` and GitHub Actions secrets):
```
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_STORAGE_BUCKET=
PUBLIC_FIREBASE_APP_ID=
```

> Firebase API keys for web apps are **safe to expose publicly** — they identify the project, not grant admin access. Security is enforced via Firestore Security Rules.

---

### 7.4 Firestore Data Schema

```
Firestore root
└── users/
    └── {uid}/                         ← document per user
        ├── profile/                   ← subcollection
        │   └── data                   ← single document
        │       ├── displayName: string | null
        │       ├── email: string | null
        │       ├── photoURL: string | null
        │       ├── isAnonymous: boolean
        │       ├── provider: 'anonymous' | 'google'
        │       ├── createdAt: timestamp
        │       └── lastSeen: timestamp
        │
        ├── bookmarks/                 ← subcollection
        │   └── {bookSlug}             ← one document per bookmarked book
        │       ├── bookSlug: string
        │       ├── title_en: string   ← denormalised for display
        │       ├── title_bn: string
        │       ├── author_en: string
        │       ├── cover_image: string | null
        │       ├── addedAt: timestamp
        │       └── lastReadAt: timestamp | null
        │
        ├── progress/                  ← subcollection
        │   └── {bookSlug}             ← one document per book started
        │       ├── bookSlug: string
        │       ├── paragraphId: number   ← last paragraph reached
        │       ├── percentage: number    ← 0-100
        │       └── updatedAt: timestamp
        │
        └── history/                   ← subcollection
            └── {bookSlug}             ← one document per book read
                ├── bookSlug: string
                ├── title_en: string
                ├── completedAt: timestamp | null   ← null if not finished
                ├── firstReadAt: timestamp
                └── readCount: number              ← times started
```

---

### 7.5 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read and write their own data
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == uid;
    }

    // No other collections exist — deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Simple and secure. Each user can only access their own UID path. Anonymous users get a UID too — so their rules work identically.

---

### 7.6 React Auth Context

Since Astro renders React islands independently, auth state needs to be shared via a context that each island can access:

```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // null = not signed in
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Convenience helpers
export const isSignedIn = (user) => user !== null && user !== undefined;
export const isAnonymous = (user) => user?.isAnonymous === true;
export const isGoogle = (user) =>
  user?.providerData?.[0]?.providerId === 'google.com';
```

**Astro island pattern** — each island that needs auth wraps itself in `AuthProvider`:

```jsx
// Any component needing auth
import { AuthProvider } from '../context/AuthContext';

export default function BookmarkButton({ bookSlug }) {
  return (
    <AuthProvider>
      <BookmarkButtonInner bookSlug={bookSlug} />
    </AuthProvider>
  );
}
```

---

### 7.7 Auth Helpers (`src/lib/auth.js`)

```js
import { auth } from './firebase';
import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

// Silent anonymous sign-in — called before any Firestore write
// If already signed in, does nothing
export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

// User-initiated Google sign-in
// If currently anonymous, links the anonymous account to Google
// All existing data (bookmarks, progress) is preserved
export async function signInWithGoogle() {
  if (auth.currentUser?.isAnonymous) {
    // Link anonymous → Google (preserves all data)
    const result = await linkWithPopup(auth.currentUser, googleProvider);
    return result.user;
  }
  // Fresh sign-in
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
```

---

### 7.8 Firestore Helpers (`src/lib/firestore.js`)

```js
import { db } from './firebase';
import {
  doc, setDoc, deleteDoc, getDoc,
  collection, getDocs, serverTimestamp,
  query, orderBy, limit,
} from 'firebase/firestore';

// ── Bookmarks ──────────────────────────────────────────────

export async function addBookmark(uid, book) {
  await setDoc(doc(db, 'users', uid, 'bookmarks', book.slug), {
    bookSlug: book.slug,
    title_en: book.title_en,
    title_bn: book.title_bn,
    author_en: book.author_en,
    cover_image: book.cover_image || null,
    addedAt: serverTimestamp(),
    lastReadAt: null,
  });
}

export async function removeBookmark(uid, bookSlug) {
  await deleteDoc(doc(db, 'users', uid, 'bookmarks', bookSlug));
}

export async function isBookmarked(uid, bookSlug) {
  const snap = await getDoc(doc(db, 'users', uid, 'bookmarks', bookSlug));
  return snap.exists();
}

export async function getAllBookmarks(uid) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'bookmarks'),
    orderBy('addedAt', 'desc'))
  );
  return snap.docs.map(d => d.data());
}

// ── Reading Progress ────────────────────────────────────────

export async function saveProgress(uid, bookSlug, paragraphId, total) {
  await setDoc(doc(db, 'users', uid, 'progress', bookSlug), {
    bookSlug,
    paragraphId,
    percentage: Math.round((paragraphId / total) * 100),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getProgress(uid, bookSlug) {
  const snap = await getDoc(doc(db, 'users', uid, 'progress', bookSlug));
  return snap.exists() ? snap.data() : null;
}

// ── Reading History ─────────────────────────────────────────

export async function recordBookOpen(uid, bookSlug, title_en) {
  const ref = doc(db, 'users', uid, 'history', bookSlug);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, {
      readCount: (snap.data().readCount || 0) + 1,
      lastReadAt: serverTimestamp(),
    }, { merge: true });
  } else {
    await setDoc(ref, {
      bookSlug,
      title_en,
      firstReadAt: serverTimestamp(),
      lastReadAt: serverTimestamp(),
      completedAt: null,
      readCount: 1,
    });
  }
}

export async function getHistory(uid) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'history'),
    orderBy('lastReadAt', 'desc'),
    limit(50))
  );
  return snap.docs.map(d => d.data());
}
```

---

### 7.9 AuthIsland.jsx — Nav Login Button

Mounted in `Base.astro` nav. Shows different states based on auth:

```
Not signed in:                    Anonymous:                    Google signed in:
─────────────────                 ───────────────────           ──────────────────────
[ Sign in ]                       [ Save your account ]         [Avatar] Shahriar ▾
                                                                  ├── My Bookmarks
                                                                  ├── Reading History
                                                                  ├── Reading Progress
                                                                  └── Sign out
```

```jsx
// Behaviour:

// Not signed in:
// → Shows "Sign in" text button
// → On click: signInWithGoogle()

// Anonymous (has UID, no Google):
// → Shows "Save your account" subtle link
// → Tooltip: "Sign in with Google to sync across devices"
// → On click: linkWithPopup() — preserves all data

// Google signed in:
// → Shows avatar (20px circle) + first name + dropdown arrow
// → Dropdown: My Bookmarks / Reading History / Sign out
// → Avatar loads from Google photoURL

// Loading state (auth initialising):
// → Shows nothing (no flash of wrong state)
```

---

### 7.10 BookmarkButton.jsx

Per-book bookmark toggle. Appears on every book page in the book header next to the read counter.

```
Not bookmarked:    [🔖 Bookmark]          → light border, muted
Bookmarked:        [🔖 Saved]             → gold fill, solid
Loading:           [⋯]                    → spinner while Firestore writes
```

```jsx
// Flow:
// 1. On mount: check if book is bookmarked (getDoc from Firestore)
//    If no user yet: check localStorage fallback
// 2. On click:
//    a. Call ensureAuth() — creates anonymous UID if needed
//    b. Toggle bookmark in Firestore
//    c. Update localStorage as fallback too
// 3. If anonymous: show subtle nudge below button:
//    "Sign in to sync bookmarks across devices"
//    (dismissible, shown once per session)
```

**localStorage fallback** — bookmarks stored in `localStorage: bl_bookmarks` as array of slugs. If user signs in later, these are migrated to Firestore on first Google sign-in.

---

### 7.11 Reading Progress — Continue Reading

The BilingualReader tracks which paragraph is visible in the viewport and saves progress to Firestore (or localStorage if no auth):

```jsx
// In BilingualReader.jsx
// IntersectionObserver watches paragraphs
// When paragraph > 50% visible → that's the current position
// Debounced save: every 10 seconds to avoid excessive writes

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
      const id = parseInt(entry.target.dataset.paragraphId);
      setCurrentParagraph(id);
      debouncedSave(id);  // saves to Firestore or localStorage
    }
  });
}, { threshold: 0.5 });
```

**"Continue reading" button** appears on book cards for books with saved progress:

```
[Book card]
গীতাঞ্জলি · Gitanjali
Rabindranath Tagore

██████░░░░ 62% read

[ Continue reading from §42 → ]
```

---

### 7.12 My Bookmarks Page (`/my/bookmarks`)

Accessible only to signed-in users (redirect to homepage if not). Shows all bookmarked books as a reading list.

```
আমার বুকমার্ক · My Bookmarks

Signed in as Shahriar · [ Sign out ]

┌──────────────────────────────────────────────────────┐
│ [Cover] গীতাঞ্জলি                                   │
│         Gitanjali · Tagore                           │
│         Added 3 days ago · ██████░░ 62% read         │
│         [ Continue reading → ]  [ Remove bookmark ] │
├──────────────────────────────────────────────────────┤
│ [Cover] বিষাদ সিন্ধু                                │
│         Bishad Sindhu · Mir Mosharraf Hossain        │
│         Added 1 week ago · Not started               │
│         [ Start reading → ]     [ Remove bookmark ] │
└──────────────────────────────────────────────────────┘
```

**If not signed in — redirect to homepage with toast:**
```
"Sign in to view your bookmarks"
```

---

### 7.13 Reading History Page (`/my/history`)

Shows books the user has opened, ordered by most recent. Only available to signed-in users.

```
পড়ার ইতিহাস · Reading History

┌──────────────────────────────────────────────┐
│ গীতাঞ্জলি · Gitanjali                       │
│ Last read: 2 hours ago · Read 3 times        │
│ ██████░░░░ 62% · [ Continue → ]              │
├──────────────────────────────────────────────┤
│ বিষাদ সিন্ধু · Bishad Sindhu               │
│ Last read: Yesterday · Read 1 time           │
│ ██░░░░░░░░ 18% · [ Continue → ]              │
└──────────────────────────────────────────────┘
```

---

### 7.14 Feature Availability by Auth State

**The golden rule: everything readable without login.**

| Feature | No auth | Anonymous | Google login |
|---|---|---|---|
| Read all books | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ |
| Like books | ✅ | ✅ | ✅ |
| Post comments | ✅ | ✅ | ✅ named |
| Paragraph feedback | ✅ | ✅ | ✅ named |
| Request a book | ✅ | ✅ | ✅ named |
| Bookmarks (this device) | localStorage | Firestore | Firestore |
| Bookmarks (all devices) | ❌ | ❌ | ✅ |
| Reading progress | localStorage | Firestore | Firestore synced |
| Continue reading | this device | this device | all devices |
| Reading history | ❌ | ✅ Firestore | ✅ synced |
| Comments with profile | ❌ | ❌ | ✅ |
| My Bookmarks page | ❌ | ❌ | ✅ |
| My History page | ❌ | ❌ | ✅ |

---

### 7.15 GDPR Considerations for Firebase Auth

Add to Privacy Policy (`/privacy`):

```
Firebase Authentication (Google LLC, USA)
─────────────────────────────────────────
If you sign in with Google, Firebase Authentication
processes your Google account name, email address,
and profile picture to create your account.

Anonymous sessions: Firebase assigns a random UID
to your browser session. No personal data collected.

Data transfer: Firebase is operated by Google LLC
in the USA. Google is certified under the EU-US
Data Privacy Framework.

Legal basis: Consent (GDPR Art. 6(1)(a))
You can delete your account and all associated data
by contacting: [your email]

→ Firebase Privacy Policy: firebase.google.com/support/privacy
→ Google Privacy Policy: policies.google.com/privacy
```

Add Firebase to the **Analytics consent category** in `ConsentManager.jsx` — Firebase Auth should only initialise after the user has accepted functional or analytics cookies:

```
Functional consent: true
  → Firebase Anonymous Auth initialises
  → Bookmarks + progress available

Analytics consent: true  
  → Cloudflare Web Analytics loads

No consent:
  → No Firebase initialisation
  → localStorage only (this device)
  → Full reading experience still works
```

---

### 7.16 File Locations (Auth)

```
src/
├── lib/
│   ├── firebase.js          ← Firebase app init
│   ├── auth.js              ← signIn, signOut, ensureAuth, linkGoogle
│   └── firestore.js         ← bookmarks, progress, history helpers
├── context/
│   └── AuthContext.jsx      ← React context + AuthProvider + useAuth hook
├── components/
│   ├── AuthIsland.jsx       ← Nav login button + dropdown
│   ├── BookmarkButton.jsx   ← Per-book bookmark toggle
│   └── ReadingHistory.jsx   ← History page React island
└── pages/
    └── my/
        ├── bookmarks/
        │   └── index.astro  ← My Bookmarks page (redirects if not logged in)
        └── history/
            └── index.astro  ← Reading History page
```

---

## 9. Giscus Comments & Custom Theme

### 9.1 Overview

Giscus is a comment system powered by GitHub Discussions. Comments are stored directly in your GitHub repo's Discussions tab — you own all data permanently, no third-party service involved. Visitors sign in with GitHub to comment.

The default Giscus UI does not match the site's dark gold aesthetic. This section specifies a custom theme via a hosted CSS file.

---

### 9.2 Setup

**Step 1:** Enable GitHub Discussions on your repo:
```
GitHub repo → Settings → Features → Discussions ✅
```

**Step 2:** Go to giscus.app and configure:
```
Repository:    shahriarspace/bangla-library
Page ↔ Discussion mapping: pathname
Discussion category: Book Comments (create this category)
Features: Reactions ✅, Emit metadata ✅
Theme: Custom → https://banglalib.org/giscus-theme.css
```

**Step 3:** Copy the generated `<script>` tag into `InteractionIsland.jsx`

---

### 9.3 Component Integration

```jsx
// Inside InteractionIsland.jsx — below likes, above comment form

function GiscusComments({ slug }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'shahriarspace/bangla-library');
    script.setAttribute('data-repo-id', 'YOUR_REPO_ID');
    script.setAttribute('data-category', 'Book Comments');
    script.setAttribute('data-category-id', 'YOUR_CATEGORY_ID');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', slug);   // one discussion per book
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-theme',
      'https://banglalib.org/giscus-theme.css');
    script.setAttribute('data-lang', 'en');
    script.crossOrigin = 'anonymous';
    script.async = true;

    const container = document.getElementById('giscus-container');
    if (container) container.appendChild(script);

    return () => container?.replaceChildren(); // cleanup on unmount
  }, [slug]);

  return <div id="giscus-container" />;
}
```

---

### 9.4 Custom Theme File (`public/giscus-theme.css`)

This file is served statically from your site. Giscus loads it via the `data-theme` URL. Override Giscus CSS variables to match the site's dark gold aesthetic:

```css
/* public/giscus-theme.css */
/* Bangla Library — custom Giscus theme */
/* Matches site: dark parchment background, gold accents */

:root {
  /* Background colours */
  --color-canvas-default:        #1c1812;
  --color-canvas-subtle:         #12100e;
  --color-canvas-inset:          #0e0c0a;

  /* Border colours */
  --color-border-default:        rgba(200, 160, 80, 0.2);
  --color-border-muted:          rgba(200, 160, 80, 0.1);

  /* Text colours */
  --color-fg-default:            #d4b87a;
  --color-fg-muted:              #a08050;
  --color-fg-subtle:             #6a5030;
  --color-fg-on-emphasis:        #12100e;

  /* Accent (links, buttons) */
  --color-accent-fg:             #c8a050;
  --color-accent-emphasis:       #c8a050;
  --color-accent-subtle:         rgba(200, 160, 80, 0.1);
  --color-accent-muted:          rgba(200, 160, 80, 0.2);

  /* Buttons */
  --color-btn-bg:                transparent;
  --color-btn-border:            rgba(200, 160, 80, 0.3);
  --color-btn-hover-bg:          rgba(200, 160, 80, 0.1);
  --color-btn-hover-border:      rgba(200, 160, 80, 0.5);
  --color-btn-text:              #c8a050;
  --color-btn-primary-bg:        #c8a050;
  --color-btn-primary-text:      #12100e;
  --color-btn-primary-border:    #c8a050;
  --color-btn-primary-hover-bg:  #f0dfa0;

  /* Input fields */
  --color-input-bg:              #12100e;
  --color-input-border:          rgba(200, 160, 80, 0.2);
  --color-input-focus-border:    rgba(200, 160, 80, 0.5);
  --color-input-disabled-bg:     #0e0c0a;

  /* Comment header */
  --color-timeline-badge-bg:     #1c1812;
  --color-reactions-btn-hover-bg: rgba(200, 160, 80, 0.1);

  /* Neutral */
  --color-neutral-emphasis-plus: rgba(200, 160, 80, 0.15);
  --color-neutral-emphasis:      rgba(200, 160, 80, 0.1);
  --color-neutral-muted:         rgba(200, 160, 80, 0.05);
  --color-neutral-subtle:        rgba(200, 160, 80, 0.03);

  /* Typography */
  --font-family:                 'Lora', Georgia, serif;
  --font-size-small:             0.8rem;
  --font-size-body:              0.9rem;
  --font-weight-normal:          400;
  --font-weight-semibold:        600;

  /* Misc */
  --border-radius:               2px;   /* matches site's sharp corners */
  --box-shadow-small:            0 2px 8px rgba(0,0,0,0.4);
  --box-shadow-medium:           0 4px 16px rgba(0,0,0,0.6);
}

/* Remove Giscus branding link (optional) */
.giscus-frame {
  border: 1px solid rgba(200, 160, 80, 0.15);
  border-radius: 2px;
}

/* Style the sign-in prompt */
.giscus .sign-in {
  color: var(--color-fg-muted);
  font-style: italic;
  font-size: 0.85rem;
}

/* Reactions bar */
.giscus .reaction-button {
  border-color: rgba(200, 160, 80, 0.2) !important;
}
.giscus .reaction-button:hover {
  background: rgba(200, 160, 80, 0.1) !important;
}
```

---

### 9.5 GDPR Note

Giscus loads from `giscus.app` which is hosted by the Giscus maintainer. This constitutes a third-party service loading. Add to Privacy Policy:

```
Giscus Comments (giscus.app)
─────────────────────────────
If you choose to post a comment, you sign in via
GitHub. Your GitHub username and comment are stored
in our public GitHub Discussions — visible to anyone.

The Giscus script loads from giscus.app. No tracking
cookies are set by Giscus.

Legal basis: Consent — comments are entirely optional.
→ Giscus privacy: github.com/giscus/giscus
```

Add Giscus to the **Functional** consent category in `ConsentManager.jsx` — load the Giscus script only after functional consent is granted:

```jsx
// In ConsentManager.jsx — only inject Giscus after functional: true
if (consent.categories.functional) {
  // Giscus script loads within GiscusComments component
  // Pass a `enabled` prop: <GiscusComments enabled={functionalConsent} />
}
```

---

### 9.6 File Location

```
public/
  └── giscus-theme.css        ← Custom Giscus theme (served statically)
src/components/
  └── InteractionIsland.jsx   ← Updated: includes GiscusComments component
```

---

---

## 10. Bot Account & Token Setup

### 10.1 Overview

The `banglalib-bot` GitHub account and its Personal Access Token (PAT) are used in **two separate places** with two separate secret stores. This section documents both clearly so nothing is missed during implementation.

```
banglalib-bot PAT
        │
        ├── GitHub Actions Secret
        │   Used by: scripts/scheduled-publish.mjs
        │   Purpose: Create GitHub Discussions when books publish
        │
        └── Cloudflare Worker Secret
            Used by: cloudflare-worker/index.js (/comment endpoint)
            Purpose: Post anonymous comments to GitHub Discussions
```

**Same token. Two stores. Both required.**

---

### 10.2 Create the Bot Account

```
1. Open a private browser window (so you stay logged into your main account)
2. Go to github.com → Sign up
3. Username:  banglalib-bot
4. Email:     a dedicated email (e.g. banglalib.bot@proton.me)
5. Complete signup
```

The bot account is public and free. GitHub allows multiple accounts as long as
they serve distinct purposes — a bot account for automated posting is explicitly
permitted under GitHub's Terms of Service.

---

### 10.3 Generate the Personal Access Token

```
Log into GitHub as banglalib-bot
→ Settings (top right avatar)
→ Developer settings (bottom of left sidebar)
→ Personal access tokens
→ Tokens (classic)
→ Generate new token (classic)

Token name:    bangla-library-bot
Expiration:    No expiration  (or 1 year — set a calendar reminder to renew)

Scopes to check:
  ✅ public_repo        (read repo, find discussions by title)
  ✅ write:discussion   (create discussions + post comments)

→ Generate token
→ COPY THE TOKEN NOW — it is only shown once
```

Store it somewhere safe (e.g. your password manager) before closing the page.

---

### 10.4 Store #1 — GitHub Actions Secret

Used by `scripts/scheduled-publish.mjs` when the scheduled workflow runs.

```
Your repo on GitHub (logged in as shahriarspace, not the bot)
→ Settings
→ Secrets and variables
→ Actions
→ New repository secret

Name:   BOT_GITHUB_TOKEN
Value:  [paste the token from step 10.3]
→ Add secret
```

**Verification:** Go to Actions → Scheduled Book Publishing → Run workflow.
Check the logs — you should see:
```
Fetching GitHub repo and discussion category IDs...
  Repo ID:     R_xxxxxxxxxxxx
  Category ID: DIC_xxxxxxxxxxxx
```

If you see `⚠️ Could not fetch GitHub IDs` — the token is wrong or scopes are missing.

---

### 10.5 Store #2 — Cloudflare Worker Secret

Used by `cloudflare-worker/index.js` on every anonymous comment submission.

```bash
# In your project directory with wrangler configured
wrangler secret put BOT_GITHUB_TOKEN
# Paste the same token when prompted
# Press Enter
```

Output should be:
```
✅ Success! Uploaded secret BOT_GITHUB_TOKEN
```

**Verification:** Submit a test anonymous comment on a published book.
Check GitHub → Discussions → the book's discussion thread.
You should see a comment from `banglalib-bot` formatted as:

```
**Test User** wrote:

This is a test comment.

---
*Posted anonymously via বাংলা পাঠাগার*
```

---

### 10.6 One-Time GitHub Setup

Before either store will work, two things must exist in the repo:

**A) Enable GitHub Discussions:**
```
Your repo → Settings → Features section
✅ Discussions  (check this box if not already checked)
```

**B) Create "Book Comments" Discussion category:**
```
Your repo → Discussions tab
→ Click the pencil/edit icon next to "Categories"
→ New category

Name:        Book Comments
Description: Reader discussions for each book in the library
Format:      Open-ended discussion  ← important, not Q&A
→ Create
```

The publish script looks for a category named **exactly** `Book Comments` (case-sensitive). If it doesn't exist, the script logs a warning and skips Discussion creation — books still publish but anonymous comments won't work until the category exists.

---

### 10.7 What Each Place Does With the Token

| | GitHub Actions | Cloudflare Worker |
|---|---|---|
| **File** | `scripts/scheduled-publish.mjs` | `cloudflare-worker/index.js` |
| **Trigger** | Daily 6am UTC cron | Every anonymous comment POST |
| **API type** | GitHub GraphQL | GitHub REST |
| **Operations** | Query repo ID, query category ID, check discussion exists, createDiscussion mutation | GET discussions list, POST comment to discussion |
| **Frequency** | Once per published book per day at most | Every time a visitor comments |
| **Secret store** | GitHub Actions secrets | Cloudflare Worker secrets (wrangler) |
| **Secret name** | `BOT_GITHUB_TOKEN` | `BOT_GITHUB_TOKEN` |

---

### 10.8 Token Rotation

When the token expires (if you set an expiration date):

```
1. Log into GitHub as banglalib-bot
2. Generate a new token (same scopes)
3. Update GitHub Actions secret:
   Repo → Settings → Secrets → BOT_GITHUB_TOKEN → Update
4. Update Cloudflare Worker secret:
   wrangler secret put BOT_GITHUB_TOKEN
5. Test both (trigger workflow + test anonymous comment)
```

Set a calendar reminder 1 week before expiry.

---

### 10.9 Security Notes

- The `banglalib-bot` token has **minimal scopes** — `public_repo` and `write:discussion` only. No admin access, no private repo access, no delete permissions.
- The token is never exposed in frontend code. The Cloudflare Worker holds it server-side — visitors only POST to `your-worker.workers.dev`, never to GitHub directly.
- Rate limiting in the Worker (3 comments/hour per IP) prevents the bot account from being used to spam GitHub Discussions.
- If the token is ever compromised: revoke it on GitHub immediately, generate a new one, update both secret stores.

---

### 10.10 Summary — Complete Setup Checklist

```
□ 1. Create GitHub account: banglalib-bot
□ 2. Generate PAT: public_repo + write:discussion scopes, no expiry
□ 3. Copy token to password manager
□ 4. Enable Discussions on repo (Settings → Features)
□ 5. Create "Book Comments" Discussion category (exact name, case-sensitive)
□ 6. Add to GitHub Actions secrets: BOT_GITHUB_TOKEN
□ 7. Add to Cloudflare Worker secrets: wrangler secret put BOT_GITHUB_TOKEN
□ 8. Test GitHub Actions: manually trigger scheduled-publish workflow
     → Verify Discussion created in repo Discussions tab
□ 9. Test Cloudflare Worker: submit anonymous comment on a published book
     → Verify comment appears as banglalib-bot in Discussion thread
□ 10. Done — pipeline fully operational
```


## 11. Roadmap

### Phase 1 — Launch (Now)
- [x] Bilingual reader with sync scroll
- [x] 3 books live
- [x] GitHub Pages deployment
- [ ] Sitemap + Google Search Console
- [ ] Author profiles (7 authors)
- [ ] Book covers + back page
- [ ] Interaction system (likes + comments)
- [ ] Read counter (Cloudflare KV + Worker cron)
- [ ] Cloudflare Web Analytics (1-click enable)
- [ ] Public `/stats` page
- [ ] Featured homepage section (slideshow + tabs)
- [ ] `data/coming-soon.json` with first 6 upcoming books
- [ ] Request a Book page + GitHub Issues integration
- [ ] Paragraph feedback system (FeedbackPopover + /feedback Worker endpoint)
- [ ] ConsentManager (GDPR: banner + modal + Accept All / Reject All / Manage Preferences)
- [ ] Privacy & Cookie Policy page (`/privacy`) — bilingual EN + BN
- [ ] Impressum added to About page (German TMG §5)
- [ ] BfDI complaint right linked in privacy policy
- [ ] Custom domain (banglalib.org or banglapathagar.org)

### Phase 2 — Growth (Month 2–6)
- [ ] 26 books published (Phase 1 + 2 of schedule)
- [ ] Scheduled publishing pipeline live (GitHub Action)
- [ ] Firebase Anonymous Auth — silent bookmarks + reading progress
- [ ] BookmarkButton on all book pages
- [ ] Reading progress saved + "Continue reading" on book cards
- [ ] Giscus comments with custom gold/dark theme
- [ ] Mobile reading experience optimised
- [ ] Author timeline interactive component
- [ ] Social share buttons (WhatsApp priority)
- [ ] Donation button (Ko-fi or similar)

### Phase 3 — Scale (Month 6–12)
- [ ] 52+ books published
- [ ] All 7 author profiles complete
- [ ] Google login — cross-device sync + My Bookmarks + Reading History
- [ ] Anonymous → Google account upgrade flow
- [ ] Comment attribution to Google profile
- [ ] Notification when book request fulfilled
- [ ] Audio narration per passage (text-to-speech)
- [ ] Printable PDF export per book
- [ ] Community translation contributions (GitHub PR workflow)
- [ ] Institutional outreach (Bangla Academy, universities)

### Phase 4 — Infrastructure (Year 2)
- [ ] Migrate content to MongoDB Atlas (when >2000 books)
- [ ] Migrate hosting to Cloudflare Pages (hybrid SSR)
- [ ] Full-text search upgrade to Typesense
- [ ] GitHub login for contributors + contributor profiles
- [ ] API for researchers and developers
- [ ] Grant funding applications (EU cultural funds, NRW cultural grants)

---

## Appendix A — Copyright Verification

| Author | Died | Public Domain (EU/Germany 70yr rule) | Safe to publish |
|---|---|---|---|
| Rabindranath Tagore | 1941 | ✅ Since 2012 | Yes |
| Sarat Chandra | 1938 | ✅ Since 2009 | Yes |
| Begum Rokeya | 1932 | ✅ Since 2003 | Yes |
| Bankimchandra | 1894 | ✅ Since 1965 | Yes |
| Kazi Nazrul Islam | 1976 | ✅ Since 2047 — wait | Check jurisdiction |
| Michael Madhusudan Dutt | 1873 | ✅ Since 1944 | Yes |
| Mir Mosharraf Hossain | 1912 | ✅ Since 1983 | Yes |
| Humayun Ahmed | 2012 | ❌ Until 2083 | Do NOT publish |

> **Note on Nazrul:** Under Bangladesh law the rule may differ. Verify before publishing. Under EU law (70 years after death) he enters public domain in 2047.

---

## Appendix B — Useful Resources

| Resource | URL | Use |
|---|---|---|
| Bangla Wikisource | bn.wikisource.org | Clean Bangla text source |
| Internet Archive | archive.org | Scanned books + covers |
| Wikimedia Commons | commons.wikimedia.org | Public domain images |
| Project Gutenberg | gutenberg.org | Some Tagore English translations |
| Google Search Console | search.google.com/search-console | Indexing + performance |
| Cloudflare Dashboard | dash.cloudflare.com | DNS + Worker management |
| Pagefind Docs | pagefind.app | Search configuration |
| Astro Docs | docs.astro.build | Framework reference |
| Firebase Console | console.firebase.google.com | Auth + Firestore management |
| Firebase Auth Docs | firebase.google.com/docs/auth | Authentication reference |
| Firestore Docs | firebase.google.com/docs/firestore | Database reference |
| BfDI (German DPA) | bfdi.bund.de | GDPR complaints authority |

---

## Appendix C — UX Issues Addressed (v1.8)

The following issues were identified through a user-perspective review and resolved in this version. Copilot should treat these as firm requirements — not suggestions.

| # | Issue | Severity | Resolution | Section |
|---|---|---|---|---|
| 1 | Consent banner fires before user sees content | 🔴 Critical | 4-second delay before banner appears | 3.10 |
| 2 | Mobile side-by-side columns too narrow to read | 🔴 Critical | Single column default on mobile, explicit breakpoint spec | 3.3 |
| 3 | AI translation badge hidden or absent | 🔴 Critical | Prominent colour-coded badge in book header | 3.3 |
| 4 | Single-sentence paragraphs cause choppy scroll | 🔴 Critical | 3-5 sentence grouping enforced in translation prompt | 5.1 |
| 5 | Feedback icon invisible on touch devices | 🟡 Significant | Persistent "⚑ Report" button on mobile, hover-only on desktop | 3.3 |
| 6 | Comment approval creates dead silence | 🟡 Significant | "Reviewed within 24 hours" expectation in success message | 3.8 |
| 7 | Request form shows stale list after submission | 🟡 Significant | Optimistic UI — prepend pending item immediately | 3.11 |
| 8 | Zero counts look abandoned on new books | 🟡 Significant | Hide counts below threshold, show warm empty state | 3.3 |
| 9 | Continue reading auto-jumps without warning | 🟡 Significant | Toast prompt only, never auto-jump | 3.3 |
| 10 | Book header too heavy before reader | 🟢 Minor | Collapsible "About this book" toggle | 3.3 |
| 11 | Search snippets show wrong language | 🟢 Minor | Detect matched language, show translation alongside | 3.7 |
| 12 | Large books freeze on low-end Android | 🟢 Minor | Virtual scrolling for books > 300 paragraphs | 3.3 |
| 13 | Coming Soon reveals publishing schedule | 🟢 Minor | Vague teasers only — no specific titles or dates | 3.1.1 |
| 14 | Duplicate section 3.3 in spec | 🟢 Minor | First occurrence removed | 3.3 |

---  
*বাংলা পাঠাগার — Preserving Bengali literary heritage for the world*
