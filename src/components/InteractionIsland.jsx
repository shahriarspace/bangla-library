import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_COMMENT_CHARS = 1000;
const LIKE_KEY_PREFIX = 'bl_liked_';
const MIN_LIKES_TO_SHOW = 3;
const MIN_READS_TO_SHOW = 10;

// Giscus config
const GISCUS_REPO = 'shahriarspace/bangla-library';
const GISCUS_REPO_ID = 'R_kgDORm10gg';
const GISCUS_CATEGORY = 'General';
const GISCUS_CATEGORY_ID = 'DIC_kwDORm10gs4C4YRq';

// Custom Giscus theme CSS URL (served from public/)
const GISCUS_CUSTOM_THEME_URL = 'https://shahriarspace.github.io/bangla-library/giscus-theme.css';

// Map site themes to Giscus themes
const GISCUS_THEME_MAP = {
  'antique-gold': GISCUS_CUSTOM_THEME_URL,
  'classic-white': 'light',
  'sepia': 'light',
  'dark': 'dark_dimmed',
  'true-black': 'dark_high_contrast',
  'forest': 'dark_dimmed',
  'sunset-rose': 'dark',
};

// ---------------------------------------------------------------------------
// InteractionIsland — unified likes + comments + Giscus
// ---------------------------------------------------------------------------
export default function InteractionIsland({
  slug,
  bookTitle,
  initialLikes = 0,
  initialReads = 0,
  workerUrl = '',
  isMobile = false,
}) {
  // --- Like state ---
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeAnimate, setLikeAnimate] = useState(false);

  // --- Read counter ---
  const [reads, setReads] = useState(initialReads);

  // --- Anonymous comment form ---
  const [commentName, setCommentName] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [commentHoneypot, setCommentHoneypot] = useState('');
  const [commentStatus, setCommentStatus] = useState('idle');

  // --- Giscus ---
  const giscusRef = useRef(null);
  const giscusLoaded = useRef(false);
  const pendingGiscusTheme = useRef(null);

  // Check localStorage for liked state
  useEffect(() => {
    try {
      const val = localStorage.getItem(`${LIKE_KEY_PREFIX}${slug}`);
      if (val === 'true') setLiked(true);
    } catch {}
  }, [slug]);

  // Helper: get the Giscus theme for the current site theme
  function getGiscusTheme() {
    const siteTheme = document.documentElement.getAttribute('data-theme') || 'antique-gold';
    return GISCUS_THEME_MAP[siteTheme] || 'dark';
  }

  // Helper: send theme to Giscus iframe (returns true if sent)
  function sendGiscusTheme(theme) {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme } } },
        'https://giscus.app'
      );
      return true;
    }
    return false;
  }

  // Listen for Giscus messages (metadata / reaction counts + theme sync)
  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== 'https://giscus.app') return;
      const data = event.data;
      if (!data?.giscus) return;

      // When Giscus iframe signals it's ready, apply any pending theme
      if (pendingGiscusTheme.current) {
        const theme = pendingGiscusTheme.current;
        pendingGiscusTheme.current = null;
        sendGiscusTheme(theme);
      }

      // Handle reaction count metadata
      if (data.giscus.discussion) {
        const total = data.giscus.discussion.totalReactionCount;
        if (typeof total === 'number') {
          setLikes(prev => {
            if (prev !== null && total > prev) {
              setLikeAnimate(true);
              setTimeout(() => setLikeAnimate(false), 600);
            }
            return total;
          });
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load Giscus script
  useEffect(() => {
    if (giscusLoaded.current || !giscusRef.current) return;
    giscusLoaded.current = true;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', GISCUS_REPO);
    script.setAttribute('data-repo-id', GISCUS_REPO_ID);
    script.setAttribute('data-category', GISCUS_CATEGORY);
    script.setAttribute('data-category-id', GISCUS_CATEGORY_ID);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', `book/${slug}`);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '1');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', getGiscusTheme());
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;
    giscusRef.current.appendChild(script);

    // Sync theme when site theme changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          const theme = getGiscusTheme();
          if (!sendGiscusTheme(theme)) {
            // Iframe not yet loaded (lazy loading) — save for when it appears
            pendingGiscusTheme.current = theme;
          }
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [slug]);

  // --- Like handler ---
  const handleLike = useCallback(async () => {
    if (liked || likeLoading) return;

    setLikeAnimate(true);
    setTimeout(() => setLikeAnimate(false), 600);

    if (workerUrl) {
      // Worker-backed like
      setLikeLoading(true);
      try {
        const res = await fetch(`${workerUrl}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        if (res.ok) {
          const data = await res.json();
          setLikes(data.likes || likes + 1);
          setLiked(true);
          try { localStorage.setItem(`${LIKE_KEY_PREFIX}${slug}`, 'true'); } catch {}
        } else if (res.status === 429) {
          // Rate limited — mark as liked anyway (they already liked)
          setLiked(true);
          try { localStorage.setItem(`${LIKE_KEY_PREFIX}${slug}`, 'true'); } catch {}
        }
      } catch {
        // Fallback: just mark as liked locally
        setLikes(l => l + 1);
        setLiked(true);
        try { localStorage.setItem(`${LIKE_KEY_PREFIX}${slug}`, 'true'); } catch {}
      }
      setLikeLoading(false);
    } else {
      // No worker: just scroll to Giscus (existing behavior)
      const section = document.getElementById('interaction-giscus');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setLikes(l => l + 1);
      setLiked(true);
      try { localStorage.setItem(`${LIKE_KEY_PREFIX}${slug}`, 'true'); } catch {}
    }
  }, [liked, likeLoading, likes, slug, workerUrl]);

  // --- Comment submit handler ---
  const handleCommentSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!commentMessage.trim() || commentHoneypot) return;
    if (!workerUrl) {
      setCommentStatus('error');
      return;
    }

    setCommentStatus('submitting');
    try {
      const res = await fetch(`${workerUrl}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: commentName.trim() || 'Anonymous',
          message: commentMessage.trim(),
          honeypot: commentHoneypot,
        }),
      });
      if (res.ok) {
        setCommentStatus('success');
        setCommentMessage('');
        setCommentName('');
      } else if (res.status === 429) {
        setCommentStatus('rate_limited');
      } else {
        setCommentStatus('error');
      }
    } catch {
      setCommentStatus('error');
    }
  }, [commentMessage, commentName, commentHoneypot, slug, workerUrl]);

  const resetCommentForm = () => {
    setCommentStatus('idle');
    setCommentMessage('');
    setCommentName('');
  };

  // --- Like button text ---
  const likeText = liked
    ? 'Liked'
    : likes >= MIN_LIKES_TO_SHOW
      ? `${likes}`
      : 'Like this book';

  const hasWorker = !!workerUrl;

  return (
    <section style={{
      padding: '0 24px 60px',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>
      {/* Divider */}
      <div style={{
        width: '60px', height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
        margin: '0 auto 24px',
      }} />

      {/* Like + Read counters */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '16px', marginBottom: '32px', flexWrap: 'wrap',
      }}>
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={likeLoading}
          title={liked ? 'You liked this book' : 'Like this book'}
          aria-label={liked ? 'You liked this book' : `Like this book${likes >= MIN_LIKES_TO_SHOW ? `, ${likes} likes` : ''}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '24px',
            border: '1px solid var(--border)',
            background: liked ? 'rgba(226, 85, 85, 0.08)' : 'var(--bg-panel)',
            color: liked ? '#e25555' : 'var(--gold-dim)',
            fontFamily: 'var(--font-en)', fontSize: '0.85rem',
            cursor: liked ? 'default' : 'pointer',
            transition: 'all 0.25s ease',
            letterSpacing: '0.03em',
            minHeight: '44px',
            transform: likeAnimate ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <svg
            viewBox="0 0 24 24" width="20" height="20"
            fill={liked ? 'rgba(226, 85, 85, 0.25)' : 'none'}
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{
              transition: 'transform 0.25s ease, color 0.25s ease',
              transform: likeAnimate ? 'scale(1.35)' : 'scale(1)',
            }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {likeText}
          </span>
        </button>

        {/* Read counter */}
        {reads >= MIN_READS_TO_SHOW && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '0.78rem', color: 'var(--text-dim)',
            letterSpacing: '0.06em',
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {reads.toLocaleString()} readers
          </span>
        )}
      </div>

      {/* Comments header */}
      <h2 style={{
        fontSize: '0.85rem', letterSpacing: '0.15em',
        color: 'var(--gold)', textTransform: 'uppercase',
        fontWeight: 400, textAlign: 'center', marginBottom: '24px',
      }}>
        Comments & Reactions
      </h2>

      {/* Two-column layout: anonymous comments + Giscus */}
      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '24px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Left: Anonymous comment form */}
        <div style={{
          border: '1px solid var(--border)',
          padding: '20px',
          marginBottom: isMobile ? '24px' : 0,
        }}>
          <h3 style={{
            fontSize: '0.78rem', letterSpacing: '0.1em',
            color: 'var(--gold)', textTransform: 'uppercase',
            fontWeight: 400, marginBottom: '4px',
          }}>
            Leave a comment
          </h3>
          <p style={{
            fontSize: '0.72rem', color: 'var(--text-dim)',
            marginBottom: '16px',
          }}>
            No login needed
          </p>

          {!hasWorker ? (
            /* No worker configured — coming soon */
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              color: 'var(--text-dim)', fontSize: '0.82rem',
              lineHeight: '1.8',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.4 }}>
                💬
              </div>
              <p style={{ marginBottom: '8px' }}>
                Anonymous comments coming soon.
              </p>
              <p style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                Use the GitHub discussion on the right to leave a comment now.
              </p>
            </div>
          ) : commentStatus === 'success' ? (
            /* Success state */
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              color: 'var(--text)', fontSize: '0.85rem',
              lineHeight: '1.8',
            }}>
              <div style={{ fontSize: '1.2rem', color: '#4ade80', marginBottom: '8px' }}>
                &#10003; Comment posted!
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                Your comment has been submitted and will appear in the discussion
                once reviewed — usually within 24 hours.
              </p>
              <button
                onClick={resetCommentForm}
                style={{
                  padding: '8px 16px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--gold)',
                  cursor: 'pointer', fontSize: '0.78rem',
                  borderRadius: '3px', minHeight: '36px',
                }}
              >
                Post another comment
              </button>
            </div>
          ) : (
            /* Comment form */
            <form onSubmit={handleCommentSubmit}>
              {/* Honeypot */}
              <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={commentHoneypot}
                  onChange={(e) => setCommentHoneypot(e.target.value)}
                />
              </div>

              {/* Name */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block', fontSize: '0.72rem',
                  color: 'var(--text-dim)', marginBottom: '4px',
                  letterSpacing: '0.06em',
                }}>
                  Your name (optional)
                </label>
                <input
                  type="text"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  maxLength={100}
                  placeholder="Anonymous"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-en)',
                    borderRadius: '3px',
                    minHeight: '40px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Comment */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block', fontSize: '0.72rem',
                  color: 'var(--text-dim)', marginBottom: '4px',
                  letterSpacing: '0.06em',
                }}>
                  Comment <span style={{ color: 'var(--gold)' }}>*</span>
                </label>
                <textarea
                  value={commentMessage}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_COMMENT_CHARS) {
                      setCommentMessage(e.target.value);
                    }
                  }}
                  required
                  rows={4}
                  placeholder="Share your thoughts about this book..."
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-en)',
                    borderRadius: '3px',
                    resize: 'vertical',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{
                  textAlign: 'right', fontSize: '0.65rem',
                  color: commentMessage.length > MAX_COMMENT_CHARS * 0.9 ? '#e25555' : 'var(--text-dim)',
                  marginTop: '2px',
                }}>
                  {commentMessage.length}/{MAX_COMMENT_CHARS}
                </div>
              </div>

              {/* Status messages */}
              {commentStatus === 'error' && (
                <p style={{ fontSize: '0.78rem', color: '#e25555', marginBottom: '8px' }}>
                  Failed to post comment. Please try again.
                </p>
              )}
              {commentStatus === 'rate_limited' && (
                <p style={{ fontSize: '0.78rem', color: '#c87a3a', marginBottom: '8px' }}>
                  Too many comments recently. Please try again later.
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={commentStatus === 'submitting' || !commentMessage.trim()}
                style={{
                  width: '100%', padding: '10px 16px',
                  border: '1px solid var(--border)',
                  background: commentMessage.trim() ? 'var(--btn-active-bg)' : 'transparent',
                  color: commentMessage.trim() ? 'var(--text-active)' : 'var(--btn-inactive-color)',
                  cursor: commentMessage.trim() ? 'pointer' : 'default',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-en)',
                  letterSpacing: '0.08em',
                  borderRadius: '3px',
                  minHeight: '44px',
                  opacity: commentStatus === 'submitting' ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {commentStatus === 'submitting' ? 'Posting...' : 'Post Comment →'}
              </button>
            </form>
          )}
        </div>

        {/* Right: Giscus (GitHub Discussions) */}
        <div style={{
          border: '1px solid var(--border)',
          padding: '20px',
        }}>
          <h3 style={{
            fontSize: '0.78rem', letterSpacing: '0.1em',
            color: 'var(--gold)', textTransform: 'uppercase',
            fontWeight: 400, marginBottom: '4px',
          }}>
            Join the discussion
          </h3>
          <p style={{
            fontSize: '0.72rem', color: 'var(--text-dim)',
            marginBottom: '16px',
          }}>
            Sign in with GitHub for threaded replies and reactions
          </p>
          <div id="interaction-giscus" ref={giscusRef} className="giscus" style={{ minHeight: '200px' }} />
        </div>
      </div>

      {/* Footer note */}
      <p style={{
        textAlign: 'center', marginTop: '24px',
        fontSize: '0.68rem', color: 'var(--text-dim)',
        opacity: 0.6, letterSpacing: '0.06em',
      }}>
        Both comment channels contribute to the same discussion thread
      </p>
    </section>
  );
}
