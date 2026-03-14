# বাংলা পাঠাগার · Bangla Library

A free bilingual digital library of classical Bengali literature.  
Read Bangla originals alongside English translations — side by side, fully synchronized.

🌐 **Live site:** `https://yourusername.github.io/bangla-library`

---

## Features

- **Bilingual reader** — Bangla and English side by side with synchronized scrolling
- **Click to highlight** — click any passage to highlight the matching translation
- **Three view modes** — Side by Side / Bangla only / English only
- **Font size control** — three sizes for comfortable reading
- **Full-text search** — powered by Pagefind, runs entirely in the browser (no server)
- **Fully SEO indexed** — all text is crawlable by search engines via Astro SSG
- **Mobile friendly** — responsive layout
- **Zero running costs** — static files on GitHub Pages

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & run locally

```bash
git clone https://github.com/yourusername/bangla-library
cd bangla-library
npm install
npm run dev
```

Visit `http://localhost:4321`

### Build for production

```bash
npm run build
# This builds the Astro site AND generates the Pagefind search index
```

---

## Adding a Book

Create a new JSON file in `src/content/books/`:

```bash
# File name becomes the URL slug
# e.g. bishad-sindhu.json → /books/bishad-sindhu
touch src/content/books/my-book.json
```

Use this structure:

```json
{
  "title_bn": "বইয়ের নাম",
  "title_en": "Book Title in English",
  "author_bn": "লেখকের নাম",
  "author_en": "Author Name",
  "year": "1890",
  "category": "Novel",
  "description_en": "A short description of the book in English.",
  "paragraphs": [
    {
      "id": 1,
      "bn": "বাংলা অনুচ্ছেদ...",
      "en": "English translation of the paragraph..."
    },
    {
      "id": 2,
      "bn": "দ্বিতীয় অনুচ্ছেদ...",
      "en": "Second paragraph translation..."
    }
  ]
}
```

That's it. Commit and push — GitHub Actions will deploy automatically.

---

## Project Structure

```
bangla-library/
├── src/
│   ├── components/
│   │   └── BilingualReader.jsx    ← React island (interactive reader)
│   ├── content/
│   │   ├── config.ts              ← Content collection schema
│   │   └── books/
│   │       ├── gitanjali.json     ← One JSON file per book
│   │       └── bishad-sindhu.json
│   ├── layouts/
│   │   └── Base.astro             ← Shared nav, footer, fonts
│   └── pages/
│       ├── index.astro            ← Homepage
│       ├── about/index.astro      ← About page
│       ├── authors/index.astro    ← Authors index
│       └── books/
│           ├── index.astro        ← All books grid
│           └── [slug].astro       ← Individual book page (SSG)
├── public/                        ← Static assets
├── .github/workflows/deploy.yml  ← Auto-deploy to GitHub Pages
├── astro.config.mjs
└── package.json
```

---

## Deployment (GitHub Pages)

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **GitHub Actions**
4. Update `astro.config.mjs`:
   ```js
   site: 'https://yourusername.github.io',
   base: '/bangla-library',  // or '/' if using a custom domain
   ```
5. Push to `main` — GitHub Actions builds and deploys automatically

---

## Copyright Policy

All texts must be in the **public domain** before adding them. Generally this means works published before 1926 or works where the author died more than 70 years ago (varies by country).

Safe authors to start with:
- Rabindranath Tagore (1861–1941) ✅
- Mir Mosharraf Hossain (1847–1912) ✅
- Bankimchandra Chattopadhyay (1838–1894) ✅
- Michael Madhusudan Dutt (1824–1873) ✅
- Kazi Nazrul Islam (1899–1976) — check jurisdiction

---

## Tech Stack

- [Astro](https://astro.build) — Static site generation
- [React](https://react.dev) — Bilingual reader island
- [Pagefind](https://pagefind.app) — In-browser full-text search
- [GitHub Pages](https://pages.github.com) — Hosting
- [GitHub Actions](https://github.com/features/actions) — CI/CD

---

## Roadmap

- [ ] Audio narration per passage
- [ ] User annotations / bookmarks (localStorage)
- [ ] Printable PDF export per book
- [ ] Contributor guide for translations
- [ ] Migrate to MongoDB + Cloudflare Pages at scale

---

## License

Code: MIT  
Content: Public Domain
