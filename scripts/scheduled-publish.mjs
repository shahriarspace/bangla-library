#!/usr/bin/env node

/**
 * Scheduled Book Publishing Script
 *
 * Finds books with status "unpublished" and publish_date <= today,
 * flips them to "published", sets published_date, removes from coming-soon.json,
 * and pre-creates a GitHub Discussion for each newly published book.
 *
 * Exit codes:
 *   0 = Nothing to publish (no changes)
 *   1 = Books published (files changed — caller should commit)
 *   2 = Script error
 *
 * Environment variables:
 *   GITHUB_REPO       - e.g. "shahriarspace/bangla-library"
 *   BOT_GITHUB_TOKEN  - banglalib-bot personal access token (public_repo + write:discussion)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const BOOKS_DIR = join(process.cwd(), 'src', 'content', 'books');
const COMING_SOON_PATH = join(process.cwd(), 'data', 'coming-soon.json');
const GITHUB_REPO = process.env.GITHUB_REPO || 'shahriarspace/bangla-library';
const BOT_TOKEN = process.env.BOT_GITHUB_TOKEN || '';

// ---------------------------------------------------------------------------
// GitHub GraphQL helpers
// ---------------------------------------------------------------------------
async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'bangla-library-bot',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function getRepoAndCategoryIds() {
  const [owner, name] = GITHUB_REPO.split('/');
  const data = await graphql(`
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 25) {
          nodes {
            id
            name
          }
        }
      }
    }
  `, { owner, name });

  const repo = data.repository;
  const category = repo.discussionCategories.nodes.find(
    c => c.name === 'Book Comments'
  );

  return {
    repoId: repo.id,
    categoryId: category?.id || null,
  };
}

async function discussionExists(slug) {
  const [owner, name] = GITHUB_REPO.split('/');
  const searchTerm = `/books/${slug}`;
  const data = await graphql(`
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100) {
          nodes {
            title
          }
        }
      }
    }
  `, { owner, name });

  return data.repository.discussions.nodes.some(d => d.title === searchTerm);
}

async function createDiscussion(slug, titleEn, titleBn, authorEn, repoId, categoryId) {
  const siteUrl = `https://shahriarspace.github.io/bangla-library/books/${slug}/`;
  const body = [
    `## ${titleBn}`,
    `### ${titleEn}`,
    `by ${authorEn}`,
    '',
    `[Read this book on Bangla Library](${siteUrl})`,
    '',
    '---',
    '',
    'Share your thoughts, discuss passages, or report translation issues below.',
    'Both anonymous comments and GitHub replies appear in this thread.',
  ].join('\n');

  await graphql(`
    mutation($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion {
          id
          url
        }
      }
    }
  `, {
    input: {
      repositoryId: repoId,
      categoryId: categoryId,
      title: `/books/${slug}`,
      body,
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  console.log(`[scheduled-publish] Checking for books due on or before ${today}...`);

  // Read all book JSON files
  const files = readdirSync(BOOKS_DIR).filter(f => f.endsWith('.json'));
  const published = [];

  for (const file of files) {
    const filePath = join(BOOKS_DIR, file);
    const raw = readFileSync(filePath, 'utf-8');
    const book = JSON.parse(raw);
    const slug = basename(file, '.json');

    // Skip already-published books
    if (book.status === 'published') continue;

    // Skip books without a publish_date or with a future date
    if (!book.publish_date || book.publish_date > today) continue;

    console.log(`[scheduled-publish] Publishing: ${slug} (${book.title_en || slug})`);

    // Step 1: Flip status and set published_date
    book.status = 'published';
    book.published_date = today;
    writeFileSync(filePath, JSON.stringify(book, null, 2) + '\n', 'utf-8');

    // Step 2: Pre-create GitHub Discussion (non-fatal)
    if (BOT_TOKEN) {
      try {
        const exists = await discussionExists(slug);
        if (!exists) {
          const { repoId, categoryId } = await getRepoAndCategoryIds();
          if (categoryId) {
            await createDiscussion(
              slug,
              book.title_en || slug,
              book.title_bn || slug,
              book.author_en || 'Unknown',
              repoId,
              categoryId
            );
            console.log(`  -> GitHub Discussion created for ${slug}`);
          } else {
            console.warn(`  -> "Book Comments" category not found — skipping Discussion creation`);
          }
        } else {
          console.log(`  -> Discussion already exists for ${slug}`);
        }
      } catch (err) {
        console.warn(`  -> Failed to create Discussion for ${slug}: ${err.message}`);
        // Non-fatal: book still publishes
      }
    } else {
      console.log(`  -> BOT_GITHUB_TOKEN not set — skipping Discussion creation`);
    }

    published.push(slug);
  }

  // Nothing to publish
  if (published.length === 0) {
    console.log('[scheduled-publish] No books due today — nothing to do.');
    process.exit(0);
  }

  // Remove published books from coming-soon.json
  if (existsSync(COMING_SOON_PATH)) {
    try {
      const raw = readFileSync(COMING_SOON_PATH, 'utf-8');
      const comingSoon = JSON.parse(raw);
      if (Array.isArray(comingSoon)) {
        const filtered = comingSoon.filter(item => {
          // Remove by slug if present, otherwise by title match
          if (item.slug) return !published.includes(item.slug);
          return true;
        });
        writeFileSync(COMING_SOON_PATH, JSON.stringify(filtered, null, 2) + '\n', 'utf-8');
        console.log(`[scheduled-publish] Updated coming-soon.json (${comingSoon.length} -> ${filtered.length} entries)`);
      }
    } catch (err) {
      console.warn(`[scheduled-publish] Could not update coming-soon.json: ${err.message}`);
    }
  }

  // Summary
  console.log(`\n[scheduled-publish] Published ${published.length} book(s):`);
  for (const slug of published) {
    console.log(`  - ${slug}`);
  }

  // Exit code 1 = files changed
  process.exit(1);
}

try {
  await run();
} catch (err) {
  console.error(`[scheduled-publish] Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
}
