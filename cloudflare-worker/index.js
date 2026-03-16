// ---------------------------------------------------------------------------
// Bangla Library — Unified Cloudflare Worker
//
// Endpoints:
//   POST /read      — Increment read counter in KV
//   POST /like      — Increment like counter (1 per slug per IP per 24h)
//   POST /comment   — Post anonymous comment to GitHub Discussions
//   POST /request   — Create GitHub Issue for book request
//   POST /feedback  — Create GitHub Issue for translation feedback
//
// Cron (every 10 min):
//   Batch-commits KV read/like deltas to data/analytics/reads.json on GitHub
//
// KV keys:
//   reads:{slug}          — buffered read increments
//   likes:{slug}          — buffered like increments
//   liked:{ip}:{slug}     — dedup likes per IP (TTL 24h)
//   rate:comment:{ip}     — rate limit comments (TTL 1h)
//   rate:request:{ip}     — rate limit requests (TTL 1h)
//   rate:feedback:{ip}    — rate limit feedback (TTL 1h)
//
// Environment / Secrets:
//   env.GITHUB_REPO       — "shahriarspace/bangla-library"   (wrangler.toml [vars])
//   env.GITHUB_TOKEN      — PAT for committing reads.json    (wrangler secret)
//   env.BOT_GITHUB_TOKEN  — PAT for posting Discussion comments (wrangler secret)
//   env.READS_KV          — KV namespace binding
// ---------------------------------------------------------------------------

export default {

  // =========================================================================
  // HTTP Request Handler
  // =========================================================================
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for GitHub Pages origin
    const headers = {
      'Access-Control-Allow-Origin': 'https://shahriarspace.github.io',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://shahriarspace.github.io',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Bot protection
    const ua = request.headers.get('User-Agent') || '';
    if (['bot', 'crawler', 'spider'].some(b => ua.toLowerCase().includes(b))) {
      return new Response('Forbidden', { status: 403 });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405, headers,
      });
    }

    // Sanitiser helper
    const sanitise = (v, max = 1000) =>
      String(v || '').slice(0, max).replace(/<[^>]*>/g, '').trim();

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
      // ===================================================================
      // POST /read — increment read counter
      // ===================================================================
      if (path === '/read') {
        const { slug } = await request.json();

        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          return new Response(JSON.stringify({ error: 'Invalid slug' }), {
            status: 400, headers,
          });
        }

        const current = parseInt(await env.READS_KV.get(`reads:${slug}`) || '0');
        const newCount = current + 1;
        await env.READS_KV.put(`reads:${slug}`, String(newCount));

        return new Response(JSON.stringify({ ok: true, count: newCount }), { headers });
      }

      // ===================================================================
      // POST /like — increment like counter (1 per slug per IP per 24h)
      // ===================================================================
      if (path === '/like') {
        const { slug } = await request.json();

        if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
          return new Response(JSON.stringify({ error: 'invalid' }), {
            status: 400, headers,
          });
        }

        // Dedup: 1 like per slug per IP per day
        const likeKey = `liked:${ip}:${slug}`;
        const alreadyLiked = await env.READS_KV.get(likeKey);

        if (alreadyLiked) {
          return new Response(
            JSON.stringify({ error: 'already_liked', liked: true }),
            { status: 200, headers }
          );
        }

        // Mark liked (expires 24h)
        await env.READS_KV.put(likeKey, '1', { expirationTtl: 86400 });

        // Increment counter
        const countKey = `likes:${slug}`;
        const current = parseInt(await env.READS_KV.get(countKey) || '0');
        const newCount = current + 1;
        await env.READS_KV.put(countKey, String(newCount));

        return new Response(JSON.stringify({ ok: true, count: newCount }), { headers });
      }

      // ===================================================================
      // POST /comment — post anonymous comment to GitHub Discussions
      // ===================================================================
      if (path === '/comment') {
        const body = await request.json();

        // Honeypot
        if (body.honeypot) {
          return new Response(JSON.stringify({ ok: true }), { headers });
        }

        // Rate limit: 3 comments per IP per hour
        const rateKey = `rate:comment:${ip}`;
        const count = parseInt(await env.READS_KV.get(rateKey) || '0');
        if (count >= 3) {
          return new Response(
            JSON.stringify({ error: 'rate_limited' }),
            { status: 429, headers }
          );
        }
        await env.READS_KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });

        // Validate & sanitise
        const slug = sanitise(body.slug, 100);
        const cleanName = sanitise(body.name, 100) || 'Anonymous reader';
        const cleanMsg = sanitise(body.message, 1000);

        if (!slug || !cleanMsg) {
          return new Response(
            JSON.stringify({ error: 'missing_fields' }),
            { status: 400, headers }
          );
        }

        // Build comment body
        const commentBody = [
          `**${cleanName}** wrote:`,
          '',
          cleanMsg,
          '',
          '---',
          `*Posted anonymously via [বাংলা পাঠাগার](https://shahriarspace.github.io/bangla-library/)*`,
        ].join('\n');

        // Find discussion for this book slug (title = "/books/{slug}")
        const searchRes = await fetch(
          `https://api.github.com/repos/${env.GITHUB_REPO}/discussions?per_page=100`,
          {
            headers: {
              'Authorization': `token ${env.BOT_GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'User-Agent': 'bangla-library-worker',
            },
          }
        );

        if (!searchRes.ok) {
          return new Response(
            JSON.stringify({ error: 'github_error' }),
            { status: 500, headers }
          );
        }

        const discussions = await searchRes.json();
        const discussion = discussions.find(d => d.title === `/books/${slug}`);

        if (!discussion) {
          return new Response(
            JSON.stringify({ error: 'no_discussion' }),
            { status: 404, headers }
          );
        }

        // Post comment as bot
        const replyRes = await fetch(
          `https://api.github.com/repos/${env.GITHUB_REPO}/discussions/${discussion.number}/comments`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${env.BOT_GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'User-Agent': 'bangla-library-worker',
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

      // ===================================================================
      // POST /request — create GitHub Issue for book request
      // ===================================================================
      if (path === '/request') {
        const body = await request.json();

        // Honeypot
        if (body.honeypot) {
          return new Response(JSON.stringify({ ok: true }), { headers });
        }

        // Rate limit: 3 requests per IP per hour
        const rateKey = `rate:request:${ip}`;
        const count = parseInt(await env.READS_KV.get(rateKey) || '0');
        if (count >= 3) {
          return new Response(
            JSON.stringify({ error: 'rate_limited' }),
            { status: 429, headers }
          );
        }
        await env.READS_KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });

        // Validate
        if (!body.author || (!body.title_bn && !body.title_en)) {
          return new Response(
            JSON.stringify({ error: 'missing_fields' }),
            { status: 400, headers }
          );
        }

        const titleEn = sanitise(body.title_en, 500) || sanitise(body.title_bn, 500);
        const titleBn = sanitise(body.title_bn, 500);
        const author = sanitise(body.author, 500);
        const year = sanitise(body.year, 500);
        const reason = sanitise(body.reason, 500);
        const name = sanitise(body.name, 500) || 'Anonymous';

        const issueBody = [
          '## Book Request',
          '',
          `**Title (Bangla):** ${titleBn || '\u2014'}`,
          `**Title (English):** ${titleEn || '\u2014'}`,
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
              title: `Book Request: ${titleEn} \u2014 ${author}`,
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

      // ===================================================================
      // POST /feedback — create GitHub Issue for translation feedback
      // ===================================================================
      if (path === '/feedback') {
        const body = await request.json();

        // Honeypot
        if (body.honeypot) {
          return new Response(JSON.stringify({ ok: true }), { headers });
        }

        // Rate limit: 10 per IP per hour
        const rateKey = `rate:feedback:${ip}`;
        const count = parseInt(await env.READS_KV.get(rateKey) || '0');
        if (count >= 10) {
          return new Response(
            JSON.stringify({ error: 'rate_limited' }),
            { status: 429, headers }
          );
        }
        await env.READS_KV.put(rateKey, String(count + 1), { expirationTtl: 3600 });

        const { bookSlug, bookTitle, authorEn, paragraphId,
                paragraphBn, paragraphEn, feedbackType,
                suggestion, name, pageUrl } = body;

        if (!bookSlug || !paragraphId || !feedbackType) {
          return new Response(
            JSON.stringify({ error: 'missing_fields' }),
            { status: 400, headers }
          );
        }

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
          `**Book:** ${sanitise(bookTitle)}`,
          `**Author:** ${sanitise(authorEn)}`,
          `**Paragraph:** #${sanitise(paragraphId)}`,
          `**Issue type:** ${ISSUE_TYPE_LABELS_DISPLAY[feedbackType] || sanitise(feedbackType)}`,
          '',
          '---',
          '',
          `### Original Bangla text (paragraph #${sanitise(paragraphId)})`,
          sanitise(paragraphBn, 5000),
          '',
          '### Current English translation',
          sanitise(paragraphEn, 5000),
          '',
          suggestion ? `### Reader's suggestion\n${sanitise(suggestion, 1000)}` : '',
          '',
          '---',
          '',
          `**Reported by:** ${sanitise(name) || 'Anonymous'}`,
          `**Date:** ${new Date().toISOString().split('T')[0]}`,
          `**Page:** ${sanitise(pageUrl)}`,
          '',
          '---',
          '*Submitted via paragraph feedback tool*',
          `*Book slug: ${sanitise(bookSlug)} \u00b7 Paragraph ID: ${sanitise(paragraphId)}*`,
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
              title: `Translation feedback: ${sanitise(bookTitle)} \u00a7${sanitise(paragraphId)} \u2014 ${feedbackType}`,
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

      // ===================================================================
      // 404 — unknown endpoint
      // ===================================================================
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers,
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        JSON.stringify({ error: 'internal_error', message: err.message }),
        { status: 500, headers }
      );
    }
  },

  // =========================================================================
  // Cron Trigger — batch-commit KV deltas to GitHub every 10 minutes
  // =========================================================================
  async scheduled(event, env) {
    try {
      // Collect read deltas
      const readsList = await env.READS_KV.list({ prefix: 'reads:' });
      const likesList = await env.READS_KV.list({ prefix: 'likes:' });

      if (readsList.keys.length === 0 && likesList.keys.length === 0) return;

      const readsDelta = {};
      for (const key of readsList.keys) {
        const slug = key.name.replace('reads:', '');
        const count = parseInt(await env.READS_KV.get(key.name) || '0');
        if (count > 0) readsDelta[slug] = count;
      }

      const likesDelta = {};
      for (const key of likesList.keys) {
        const slug = key.name.replace('likes:', '');
        const count = parseInt(await env.READS_KV.get(key.name) || '0');
        if (count > 0) likesDelta[slug] = count;
      }

      // Nothing to commit
      if (Object.keys(readsDelta).length === 0 && Object.keys(likesDelta).length === 0) return;

      // Fetch current reads.json from GitHub
      const getRes = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/analytics/reads.json`,
        {
          headers: {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'User-Agent': 'bangla-library-worker',
          },
        }
      );

      if (!getRes.ok) {
        console.error('Failed to fetch reads.json:', getRes.status);
        return;
      }

      const existing = await getRes.json();
      const current = JSON.parse(atob(existing.content.replace(/\n/g, '')));

      // Merge deltas
      const merged = {
        reads: { ...(current.reads || {}) },
        likes: { ...(current.likes || {}) },
      };

      for (const [slug, count] of Object.entries(readsDelta)) {
        merged.reads[slug] = (merged.reads[slug] || 0) + count;
      }
      for (const [slug, count] of Object.entries(likesDelta)) {
        merged.likes[slug] = (merged.likes[slug] || 0) + count;
      }

      // Sort by count descending for readability
      merged.reads = Object.fromEntries(
        Object.entries(merged.reads).sort(([, a], [, b]) => b - a)
      );
      merged.likes = Object.fromEntries(
        Object.entries(merged.likes).sort(([, a], [, b]) => b - a)
      );

      // Commit back to GitHub
      const putRes = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/analytics/reads.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'bangla-library-worker',
          },
          body: JSON.stringify({
            message: `analytics: update read/like counts ${new Date().toISOString()}`,
            content: btoa(JSON.stringify(merged, null, 2) + '\n'),
            sha: existing.sha,
          }),
        }
      );

      if (!putRes.ok) {
        console.error('Failed to commit reads.json:', putRes.status);
        return;
      }

      // Reset KV counters after successful commit
      for (const key of readsList.keys) {
        await env.READS_KV.delete(key.name);
      }
      for (const key of likesList.keys) {
        await env.READS_KV.delete(key.name);
      }

      console.log(`Committed deltas: ${Object.keys(readsDelta).length} reads, ${Object.keys(likesDelta).length} likes`);

    } catch (err) {
      console.error('Cron error:', err);
    }
  },
};
