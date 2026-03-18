import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import FeedbackPopover from './FeedbackPopover.jsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'bl-reader';
const PARAS_PER_PAGE = 12;
const CONSENT_KEY = 'bl_consent_v1';
const PROGRESS_PREFIX = 'bl_progress_';
const TOAST_DISMISS_MS = 8000;
const PROGRESS_DEBOUNCE_MS = 10000;
const MIN_PARAGRAPH_FOR_TOAST = 5;
const VIRTUAL_THRESHOLD = 300;

const FONT_SIZES = {
  sm: { en: '0.92rem', bn: '1.05rem' },
  md: { en: '1.08rem', bn: '1.25rem' },
  lg: { en: '1.28rem', bn: '1.5rem' },
};

const MODES = [
  { id: 'book',       label: 'Book',         icon: '\u{1F4D6}', desc: 'Interleaved bilingual' },
  { id: 'paginated',  label: 'Pages',        icon: '\u{1F4C4}', desc: 'Page-by-page' },
  { id: 'side',       label: 'Side by Side', icon: '\u{2194}',  desc: 'Two columns' },
  { id: 'bn',         label: 'Bangla',  icon: '\u{0995}',  desc: 'Bengali text only' },
  { id: 'en',         label: 'English', icon: 'A',          desc: 'English translation only' },
];

// Mobile-specific toggle options (shown below 640px)
const MOBILE_TOGGLES = [
  { id: 'bn', label: 'বাংলা' },
  { id: 'en', label: 'English' },
  { id: 'both', label: 'Both' },
  { id: 'side', label: 'Side ↔' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function savePrefs(patch) {
  const prev = loadPrefs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...patch }));
}

/** Check if user has granted "functional" consent */
function hasFunctionalConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const consent = JSON.parse(raw);
    return consent?.decided && consent?.categories?.functional === true;
  } catch { return false; }
}

/** Get saved reading progress for a book slug */
function getSavedProgress(slug) {
  if (!hasFunctionalConsent()) return null;
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + slug);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Save reading progress for a book slug */
function saveProgress(slug, paragraphId) {
  if (!hasFunctionalConsent()) return;
  try {
    localStorage.setItem(PROGRESS_PREFIX + slug, JSON.stringify({
      paragraph: paragraphId,
      timestamp: Date.now(),
    }));
  } catch { /* ignore quota errors */ }
}

/** Detect preferred language from navigator */
function detectBanglaLocale() {
  if (typeof navigator === 'undefined') return false;
  const lang = (navigator.language || '').toLowerCase();
  return lang.startsWith('bn');
}

// Hook: detect viewport width
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  });
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ---------------------------------------------------------------------------
// Scroll-to-hash helper
// ---------------------------------------------------------------------------
function scrollToHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#p')) return;
  // Small delay to let DOM render
  setTimeout(() => {
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Briefly highlight
      el.style.outline = '2px solid var(--gold)';
      el.style.outlineOffset = '4px';
      setTimeout(() => {
        el.style.outline = 'none';
        el.style.outlineOffset = '';
      }, 2000);
    }
  }, 300);
}

// ---------------------------------------------------------------------------
// Progress Bar (thin fixed bar at top of reader)
// ---------------------------------------------------------------------------
function ProgressBar({ progress }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      height: '3px',
      background: 'var(--bg2)',
      marginBottom: '2px',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'var(--gold)',
        transition: 'width 0.3s ease',
        borderRadius: '0 2px 2px 0',
        opacity: 0.7,
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Translation Quality Badge
// ---------------------------------------------------------------------------
function TranslationBadge({ reviewed }) {
  const color = reviewed ? '#4ade80' : '#fbbf24';
  const icon = reviewed ? '\uD83D\uDFE2' : '\uD83D\uDFE1';
  const text = reviewed
    ? 'Translation reviewed'
    : 'AI-assisted translation \u2014 not yet reviewed';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 12px',
      borderRadius: '12px',
      border: `1px solid ${color}33`,
      background: `${color}0D`,
      fontSize: '0.72rem',
      color: color,
      letterSpacing: '0.02em',
      marginBottom: '16px',
    }}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Book Introduction
// ---------------------------------------------------------------------------
function BookIntro({ book, base }) {
  const [open, setOpen] = useState(false);
  const hasContent = book.description_en || book.description_bn || book.edition_note || book.source || book.back_image;
  if (!hasContent) return null;

  return (
    <div style={{
      marginBottom: '20px',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          background: 'var(--controls-bg)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-en)',
          fontSize: '0.82rem',
          letterSpacing: '0.04em',
        }}
      >
        <span>About this book {open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open && (
        <div style={{
          padding: '20px 16px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
        }}>
          {/* Descriptions side by side on desktop, stacked on mobile */}
          {(book.description_en || book.description_bn) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: book.description_en && book.description_bn
                ? 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'
                : '1fr',
              gap: '20px',
              marginBottom: '16px',
            }}>
              {book.description_bn && (
                <div>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.6 }}>
                    Bengali
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-bn)', fontSize: '1rem',
                    lineHeight: '2', color: 'var(--text-bn)', margin: 0,
                  }} lang="bn">
                    {book.description_bn}
                  </p>
                </div>
              )}
              {book.description_en && (
                <div>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.6 }}>
                    English
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-en)', fontSize: '0.92rem',
                    lineHeight: '1.8', color: 'var(--text-en)', fontStyle: 'italic', margin: 0,
                  }}>
                    {book.description_en}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Edition note */}
          {book.edition_note && (
            <p style={{
              fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.7',
              marginBottom: '12px', fontStyle: 'italic',
            }}>
              {book.edition_note}
            </p>
          )}

          {/* Source */}
          {book.source && (
            <p style={{
              fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.6',
              marginBottom: '12px',
            }}>
              Source: {book.source}
            </p>
          )}

          {/* Back cover image */}
          {book.back_image && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <img
                src={book.back_image.startsWith('http') ? book.back_image : `${base}${book.back_image}`}
                alt={`Back cover of ${book.title_en}`}
                style={{
                  maxWidth: '300px', width: '100%',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                }}
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Continue Reading Toast
// ---------------------------------------------------------------------------
function ContinueReadingToast({ paragraphId, onContinue, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, TOAST_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 101,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '12px', flexWrap: 'wrap',
      fontSize: '0.82rem',
      color: 'var(--text)',
      animation: 'slideDown 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <span>You left off at paragraph {paragraphId}</span>
      <button
        onClick={() => { setVisible(false); onContinue(); }}
        style={{
          padding: '6px 14px', borderRadius: '3px',
          border: '1px solid var(--gold)', background: 'var(--btn-active-bg)',
          color: 'var(--gold)', cursor: 'pointer',
          fontSize: '0.78rem', fontFamily: 'var(--font-en)',
          minHeight: '36px',
        }}
      >
        Continue
      </button>
      <button
        onClick={() => { setVisible(false); onDismiss(); }}
        style={{
          padding: '6px 14px', borderRadius: '3px',
          border: '1px solid var(--btn-inactive-border)', background: 'transparent',
          color: 'var(--text-dim)', cursor: 'pointer',
          fontSize: '0.78rem', fontFamily: 'var(--font-en)',
          minHeight: '36px',
        }}
      >
        Start from beginning
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paragraph Feedback Icon
// ---------------------------------------------------------------------------
function FeedbackIcon({ paragraphId, isMobile, isHovered, onOpenFeedback, paragraphBn, paragraphEn }) {
  const [submitted, setSubmitted] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (submitted) return;
    if (onOpenFeedback) {
      onOpenFeedback({ paragraphId, paragraphBn, paragraphEn });
    } else {
      setSubmitted(true);
    }
  };

  // Desktop: only visible on hover. Mobile: always visible
  const opacity = submitted ? 0.6 : (isMobile ? 0.5 : (isHovered ? 0.4 : 0));

  return (
    <button
      onClick={handleClick}
      title={submitted ? 'Feedback submitted' : 'Report translation issue'}
      aria-label={submitted ? 'Feedback submitted' : `Report issue with paragraph ${paragraphId}`}
      style={{
        position: isMobile ? 'relative' : 'absolute',
        right: isMobile ? 'auto' : '-4px',
        top: isMobile ? 'auto' : '8px',
        background: 'none',
        border: 'none',
        cursor: submitted ? 'default' : 'pointer',
        fontSize: isMobile ? '0.65rem' : '0.8rem',
        color: submitted ? '#4ade80' : 'var(--text-dim)',
        opacity: opacity,
        transition: 'opacity 0.2s ease',
        padding: isMobile ? '4px 8px' : '4px',
        display: 'flex', alignItems: 'center', gap: '3px',
        minHeight: isMobile ? '32px' : 'auto',
        pointerEvents: opacity === 0 ? 'none' : 'auto',
      }}
    >
      {submitted ? '\u2713' : '\u2691'}
      {isMobile && <span style={{ fontSize: '0.6rem' }}>{submitted ? 'Sent' : 'Report'}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Paragraph Wrapper (adds anchor id, feedback icon, hover state)
// ---------------------------------------------------------------------------
function ParagraphWrapper({ paragraphId, isMobile, children, onOpenFeedback, paragraphBn, paragraphEn }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      id={`p${paragraphId}`}
      data-paragraph-id={paragraphId}
      style={{ position: 'relative' }}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
    >
      {children}
      <FeedbackIcon
        paragraphId={paragraphId}
        isMobile={isMobile}
        isHovered={hovered}
        onOpenFeedback={onOpenFeedback}
        paragraphBn={paragraphBn}
        paragraphEn={paragraphEn}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls Toolbar
// ---------------------------------------------------------------------------
function Toolbar({ mode, setMode, fontSize, setFontSize, page, totalPages, setPage, showPageNav, isMobile, isMobileReader }) {
  // On very small screens (<=640px), show simplified toggle bar
  if (isMobileReader) {
    // Map 'book'/'paginated' to 'both' for the mobile toggle; keep 'side' separate
    const mobileMode = (mode === 'book' || mode === 'paginated') ? 'both' : mode;

    return (
      <div style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
      }}>
        {/* Mobile toggle bar */}
        <div style={{
          display: 'flex', gap: '2px',
          background: 'var(--controls-bg)', padding: '3px',
          border: '1px solid var(--btn-inactive-border)', borderRadius: '4px',
          width: '100%',
          overflow: 'hidden',
          marginBottom: '10px',
        }}>
          {MOBILE_TOGGLES.map(t => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'both') setMode('book');
                else if (t.id === 'side') setMode('side');
                else setMode(t.id);
              }}
              style={{
                flex: '1 1 auto',
                padding: '10px 6px',
                border: 'none', borderRadius: '3px', cursor: 'pointer',
                fontSize: t.id === 'bn' ? '0.85rem' : '0.78rem',
                fontFamily: t.id === 'bn' ? 'var(--font-bn)' : 'var(--font-en)',
                background: mobileMode === t.id ? 'var(--btn-active-bg)' : 'transparent',
                color: mobileMode === t.id ? 'var(--text-active)' : 'var(--btn-inactive-color)',
                transition: 'all 0.2s',
                minHeight: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Page navigation (paginated modes) */}
          {showPageNav && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                style={navBtnStyle(page <= 1, true)}
                title="Previous page"
              >&lsaquo;</button>
              <span style={{
                fontSize: '0.75rem', color: 'var(--text-dim)',
                letterSpacing: '0.06em', minWidth: '60px', textAlign: 'center',
              }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                style={navBtnStyle(page >= totalPages, true)}
                title="Next page"
              >&rsaquo;</button>
            </div>
          )}

          {/* Font size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['sm', 'md', 'lg'].map(s => (
              <button key={s} onClick={() => setFontSize(s)} style={{
                width: '40px', height: '40px',
                minHeight: '44px', minWidth: '44px',
                border: `1px solid ${fontSize === s ? 'var(--btn-active-border)' : 'var(--btn-inactive-border)'}`,
                borderRadius: '3px', cursor: 'pointer',
                background: fontSize === s ? 'var(--btn-active-bg)' : 'transparent',
                color: fontSize === s ? 'var(--text-active)' : 'var(--btn-inactive-color)',
                fontSize: s === 'sm' ? '0.65rem' : s === 'md' ? '0.82rem' : '1rem',
                fontFamily: 'Georgia, serif',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>A</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop / tablet toolbar (original)
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: isMobile ? '12px' : '10px',
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
      marginBottom: '24px',
    }}>
      {/* Mode switcher */}
      <div style={{
        display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '2px',
        background: 'var(--controls-bg)', padding: '3px',
        border: '1px solid var(--btn-inactive-border)', borderRadius: '4px',
        width: isMobile ? '100%' : 'auto',
        overflow: 'hidden',
      }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.desc}
            style={{
              padding: isMobile ? '8px 6px' : '7px 14px',
              border: 'none', borderRadius: '3px', cursor: 'pointer',
              fontSize: isMobile ? '0.72rem' : '0.78rem',
              letterSpacing: '0.02em',
              background: mode === m.id ? 'var(--btn-active-bg)' : 'transparent',
              color: mode === m.id ? 'var(--text-active)' : 'var(--btn-inactive-color)',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-en)',
              flex: isMobile ? '1 1 auto' : 'none',
              minWidth: isMobile ? 'calc(33.33% - 2px)' : 'auto',
              minHeight: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{m.icon}</span>{isMobile ? m.label.replace('Side by Side', 'Side') : m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
        {/* Page navigation (paginated mode only) */}
        {showPageNav && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              style={navBtnStyle(page <= 1, isMobile)}
              title="Previous page"
            >&lsaquo;</button>
            <span style={{
              fontSize: '0.75rem', color: 'var(--text-dim)',
              letterSpacing: '0.06em', minWidth: '60px', textAlign: 'center',
            }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              style={navBtnStyle(page >= totalPages, isMobile)}
              title="Next page"
            >&rsaquo;</button>
          </div>
        )}

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '5px' }}>
          {['sm', 'md', 'lg'].map(s => (
            <button key={s} onClick={() => setFontSize(s)} style={{
              width: isMobile ? '40px' : '28px',
              height: isMobile ? '40px' : '28px',
              minHeight: '44px', minWidth: '44px',
              border: `1px solid ${fontSize === s ? 'var(--btn-active-border)' : 'var(--btn-inactive-border)'}`,
              borderRadius: '3px', cursor: 'pointer',
              background: fontSize === s ? 'var(--btn-active-bg)' : 'transparent',
              color: fontSize === s ? 'var(--text-active)' : 'var(--btn-inactive-color)',
              fontSize: s === 'sm' ? '0.65rem' : s === 'md' ? '0.82rem' : '1rem',
              fontFamily: 'Georgia, serif',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>A</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(disabled, isMobile) {
  return {
    width: isMobile ? '44px' : '30px',
    height: isMobile ? '44px' : '30px',
    minWidth: '44px', minHeight: '44px',
    border: '1px solid var(--btn-inactive-border)',
    borderRadius: '3px',
    cursor: disabled ? 'default' : 'pointer',
    background: 'transparent',
    color: disabled ? 'var(--btn-inactive-color)' : 'var(--text)',
    opacity: disabled ? 0.3 : 1,
    fontSize: '1.2rem',
    fontFamily: 'Georgia, serif',
    transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// ---------------------------------------------------------------------------
// Mode 1: Book (Interleaved)
// ---------------------------------------------------------------------------
function BookMode({ paragraphs, activeId, setActiveId, fontSize, containerRef, isMobile, onOpenFeedback }) {
  return (
    <div ref={containerRef} style={{
      maxWidth: '720px', margin: '0 auto',
      padding: '0 16px',
    }}>
      {paragraphs.map(p => (
        <ParagraphWrapper key={p.id} paragraphId={p.id} isMobile={isMobile} onOpenFeedback={onOpenFeedback} paragraphBn={p.bn} paragraphEn={p.en}>
          <div
            onClick={() => setActiveId(activeId === p.id ? null : p.id)}
            style={{
              marginBottom: '32px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {/* Bengali paragraph */}
            <p style={{
              fontSize: FONT_SIZES[fontSize].bn,
              fontFamily: 'var(--font-bn)',
              lineHeight: '2.1',
              color: activeId === p.id ? 'var(--text-active)' : 'var(--text-bn)',
              marginBottom: '8px',
              transition: 'color 0.2s',
            }}>
              {p.bn}
            </p>
            {/* English translation */}
            <p style={{
              fontSize: FONT_SIZES[fontSize].en,
              fontFamily: 'var(--font-en)',
              fontStyle: 'italic',
              lineHeight: '1.9',
              color: activeId === p.id ? 'var(--text-active)' : 'var(--text-en)',
              opacity: activeId === p.id ? 1 : 0.75,
              paddingLeft: '16px',
              borderLeft: activeId === p.id ? '2px solid var(--border-active)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {p.en}
            </p>
            {/* Subtle divider */}
            <div style={{
              width: '40px', height: '1px',
              background: 'var(--border)',
              margin: '24px auto 0',
              opacity: 0.5,
            }} />
          </div>
        </ParagraphWrapper>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode 1b: Book (stacked Both on mobile — bn then en per paragraph)
// ---------------------------------------------------------------------------
function MobileBothMode({ paragraphs, activeId, setActiveId, fontSize, containerRef, isMobile, onOpenFeedback }) {
  return (
    <div ref={containerRef} style={{
      maxWidth: '720px', margin: '0 auto',
      padding: '0 12px',
    }}>
      {paragraphs.map(p => (
        <ParagraphWrapper key={p.id} paragraphId={p.id} isMobile={isMobile} onOpenFeedback={onOpenFeedback} paragraphBn={p.bn} paragraphEn={p.en}>
          <div
            onClick={() => setActiveId(activeId === p.id ? null : p.id)}
            style={{
              marginBottom: '28px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {/* Bengali paragraph */}
            <p style={{
              fontSize: FONT_SIZES[fontSize].bn,
              fontFamily: 'var(--font-bn)',
              lineHeight: '2',
              color: activeId === p.id ? 'var(--text-active)' : 'var(--text-bn)',
              marginBottom: '6px',
            }}>
              {p.bn}
            </p>
            {/* English translation */}
            <p style={{
              fontSize: FONT_SIZES[fontSize].en,
              fontFamily: 'var(--font-en)',
              fontStyle: 'italic',
              lineHeight: '1.8',
              color: activeId === p.id ? 'var(--text-active)' : 'var(--text-en)',
              opacity: activeId === p.id ? 1 : 0.7,
              paddingLeft: '12px',
              borderLeft: activeId === p.id ? '2px solid var(--border-active)' : '2px solid transparent',
            }}>
              {p.en}
            </p>
            <div style={{
              width: '30px', height: '1px',
              background: 'var(--border)',
              margin: '20px auto 0',
              opacity: 0.4,
            }} />
          </div>
        </ParagraphWrapper>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode 2: Paginated
// ---------------------------------------------------------------------------
function PaginatedMode({ paragraphs, page, totalPages, setPage, activeId, setActiveId, fontSize, containerRef, isMobile, onOpenFeedback }) {
  const start = (page - 1) * PARAS_PER_PAGE;
  const pageParagraphs = paragraphs.slice(start, start + PARAS_PER_PAGE);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPage(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setPage(p => Math.min(totalPages, p + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalPages, setPage]);

  return (
    <div ref={containerRef}>
      {/* Page content */}
      <div style={{
        maxWidth: '720px', margin: '0 auto',
        minHeight: '60vh',
        padding: '8px 16px 40px',
      }}>
        {pageParagraphs.map(p => (
          <ParagraphWrapper key={p.id} paragraphId={p.id} isMobile={isMobile} onOpenFeedback={onOpenFeedback} paragraphBn={p.bn} paragraphEn={p.en}>
            <div
              onClick={() => setActiveId(activeId === p.id ? null : p.id)}
              style={{
                marginBottom: '28px',
                cursor: 'pointer',
              }}
            >
              <p style={{
                fontSize: FONT_SIZES[fontSize].bn,
                fontFamily: 'var(--font-bn)',
                lineHeight: '2.1',
                color: activeId === p.id ? 'var(--text-active)' : 'var(--text-bn)',
                marginBottom: '8px',
              }}>
                {p.bn}
              </p>
              <p style={{
                fontSize: FONT_SIZES[fontSize].en,
                fontFamily: 'var(--font-en)',
                fontStyle: 'italic',
                lineHeight: '1.9',
                color: activeId === p.id ? 'var(--text-active)' : 'var(--text-en)',
                opacity: activeId === p.id ? 1 : 0.75,
                paddingLeft: '16px',
                borderLeft: activeId === p.id ? '2px solid var(--border-active)' : '2px solid transparent',
              }}>
                {p.en}
              </p>
            </div>
          </ParagraphWrapper>
        ))}
      </div>

      {/* Bottom page navigation */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: isMobile ? '12px' : '16px', padding: '24px 0',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{
            ...pageNavBtnStyle(page <= 1),
            padding: isMobile ? '14px 20px' : '10px 24px',
            minHeight: '44px',
          }}
        >
          &larr; Previous
        </button>
        <span style={{
          fontSize: '0.82rem', color: 'var(--text-dim)',
          letterSpacing: '0.08em',
        }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={{
            ...pageNavBtnStyle(page >= totalPages),
            padding: isMobile ? '14px 20px' : '10px 24px',
            minHeight: '44px',
          }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}

function pageNavBtnStyle(disabled) {
  return {
    border: '1px solid var(--btn-inactive-border)',
    borderRadius: '4px',
    cursor: disabled ? 'default' : 'pointer',
    background: disabled ? 'transparent' : 'var(--controls-bg)',
    color: disabled ? 'var(--btn-inactive-color)' : 'var(--text)',
    opacity: disabled ? 0.35 : 1,
    fontSize: '0.8rem',
    fontFamily: 'var(--font-en)',
    letterSpacing: '0.04em',
    transition: 'all 0.2s',
  };
}

// ---------------------------------------------------------------------------
// Mode 3: Side by Side
// ---------------------------------------------------------------------------
function SideMode({ paragraphs, activeId, setActiveId, fontSize, containerRef, isMobile }) {
  const handleClick = (id) => {
    setActiveId(activeId === id ? null : id);
  };

  // Mobile: smaller font sizes for side-by-side to fit two columns
  const mobileBnSize = fontSize === 'sm' ? '0.78rem' : fontSize === 'md' ? '0.88rem' : '1.05rem';
  const mobileEnSize = fontSize === 'sm' ? '0.72rem' : fontSize === 'md' ? '0.82rem' : '0.95rem';

  return (
    <div ref={containerRef} style={{
      maxWidth: '100%',
      padding: isMobile ? '0' : '0 8px',
    }}>
      {/* Paragraph rows — each row is a 2-column layout with a subtle gutter */}
      {paragraphs.map((p, idx) => (
        <div
          key={p.id}
          id={`p${p.id}`}
          data-paragraph-id={p.id}
          onClick={() => handleClick(p.id)}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            cursor: 'pointer',
            padding: isMobile ? '12px 4px' : '18px 0',
            borderRadius: '4px',
            background: activeId === p.id ? 'var(--highlight)' : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          {/* Bengali cell */}
          <div style={{
            padding: isMobile ? '0 6px' : '0 20px 0 14px',
            fontSize: isMobile ? mobileBnSize : FONT_SIZES[fontSize].bn,
            fontFamily: 'var(--font-bn)',
            lineHeight: isMobile ? '1.8' : '2.1',
            color: activeId === p.id ? 'var(--text-active)' : 'var(--text-bn)',
            transition: 'color 0.2s',
            wordBreak: 'break-word',
          }}>
            {p.bn}
          </div>
          {/* Vertical gutter — book spine */}
          <div style={{
            width: '1px',
            background: 'var(--border)',
            opacity: 0.5,
            alignSelf: 'stretch',
          }} />
          {/* English cell */}
          <div style={{
            padding: isMobile ? '0 6px' : '0 14px 0 20px',
            fontSize: isMobile ? mobileEnSize : FONT_SIZES[fontSize].en,
            fontFamily: 'var(--font-en)',
            fontStyle: 'italic',
            lineHeight: isMobile ? '1.6' : '1.9',
            color: activeId === p.id ? 'var(--text-active)' : 'var(--text-en)',
            opacity: activeId === p.id ? 1 : 0.8,
            transition: 'all 0.2s',
            wordBreak: 'break-word',
          }}>
            {p.en}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode 4 & 5: Single Language (Bangla Only / English Only)
// ---------------------------------------------------------------------------
function SingleLanguageMode({ paragraphs, lang, page, totalPages, setPage, activeId, setActiveId, fontSize, containerRef, isMobile, onOpenFeedback }) {
  const start = (page - 1) * PARAS_PER_PAGE;
  const pageParagraphs = paragraphs.slice(start, start + PARAS_PER_PAGE);
  const isBn = lang === 'bn';

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPage(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setPage(p => Math.min(totalPages, p + 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalPages, setPage]);

  return (
    <div ref={containerRef}>
      {/* Column heading */}
      <div style={{
        fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)',
        textAlign: 'center', marginBottom: '16px', opacity: 0.6,
        textTransform: 'uppercase',
      }}>
        {isBn ? 'Bengali Original' : 'English Translation'}
      </div>

      {/* Page content */}
      <div style={{
        maxWidth: '720px', margin: '0 auto',
        minHeight: '60vh',
        padding: '8px 16px 40px',
      }}>
        {pageParagraphs.map(p => (
          <ParagraphWrapper key={p.id} paragraphId={p.id} isMobile={isMobile} onOpenFeedback={onOpenFeedback} paragraphBn={p.bn} paragraphEn={p.en}>
            <div
              onClick={() => setActiveId(activeId === p.id ? null : p.id)}
              style={{
                marginBottom: '28px',
                cursor: 'pointer',
                padding: '12px 14px',
                borderLeft: activeId === p.id ? '2px solid var(--border-active)' : '2px solid transparent',
                background: activeId === p.id ? 'var(--highlight)' : 'transparent',
                borderRadius: '2px',
                transition: 'all 0.15s',
              }}
            >
              <p style={{
                fontSize: isBn ? FONT_SIZES[fontSize].bn : FONT_SIZES[fontSize].en,
                fontFamily: isBn ? 'var(--font-bn)' : 'var(--font-en)',
                fontStyle: isBn ? 'normal' : 'italic',
                lineHeight: isBn ? '2.1' : '1.9',
                color: activeId === p.id ? 'var(--text-active)' : (isBn ? 'var(--text-bn)' : 'var(--text-en)'),
                margin: 0,
              }}>
                {isBn ? p.bn : p.en}
              </p>
            </div>
          </ParagraphWrapper>
        ))}
      </div>

      {/* Bottom page navigation */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: isMobile ? '12px' : '16px', padding: '24px 0',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{
            ...pageNavBtnStyle(page <= 1),
            padding: isMobile ? '14px 20px' : '10px 24px',
            minHeight: '44px',
          }}
        >
          &larr; Previous
        </button>
        <span style={{
          fontSize: '0.82rem', color: 'var(--text-dim)',
          letterSpacing: '0.08em',
        }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={{
            ...pageNavBtnStyle(page >= totalPages),
            padding: isMobile ? '14px 20px' : '10px 24px',
            minHeight: '44px',
          }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BilingualReader({ book, base = '', workerUrl = '' }) {
  const prefs = useMemo(() => loadPrefs(), []);

  // Mobile reader breakpoint at 640px (spec requirement)
  const isMobile = useIsMobile(768);
  const isMobileReader = useIsMobile(640);

  // Determine initial mode: on mobile <=640px, use navigator.language
  const initialMode = useMemo(() => {
    if (prefs.mode) return prefs.mode;
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      return detectBanglaLocale() ? 'bn' : 'en';
    }
    return 'book';
  }, []);

  const [mode, setModeRaw] = useState(initialMode);
  const [fontSize, setFontSizeRaw] = useState(prefs.fontSize || 'md');
  const [page, setPageRaw] = useState(prefs.page || 1);
  const [activeId, setActiveId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [toastData, setToastData] = useState(null);
  const [feedbackPopover, setFeedbackPopover] = useState({ isOpen: false, paragraphId: null, paragraphBn: '', paragraphEn: '' });
  const containerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const currentParaRef = useRef(null);

  const totalPages = Math.ceil(book.paragraphs.length / PARAS_PER_PAGE);

  // Derive the book slug from the URL
  const bookSlug = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }, []);

  // Feedback popover handlers
  const openFeedback = useCallback(({ paragraphId, paragraphBn, paragraphEn }) => {
    setFeedbackPopover({ isOpen: true, paragraphId, paragraphBn: paragraphBn || '', paragraphEn: paragraphEn || '' });
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedbackPopover({ isOpen: false, paragraphId: null, paragraphBn: '', paragraphEn: '' });
  }, []);

  // Wrapped setters that persist
  const setMode = (m) => { setModeRaw(m); savePrefs({ mode: m }); };
  const setFontSize = (s) => { setFontSizeRaw(s); savePrefs({ fontSize: s }); };
  const setPage = (pOrFn) => {
    setPageRaw(prev => {
      const next = typeof pOrFn === 'function' ? pOrFn(prev) : pOrFn;
      savePrefs({ page: next });
      // Scroll to top of reader on page change
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return next;
    });
  };

  // --- Continue Reading Toast ---
  useEffect(() => {
    if (!bookSlug) return;
    const saved = getSavedProgress(bookSlug);
    if (saved && saved.paragraph > MIN_PARAGRAPH_FOR_TOAST) {
      setToastData({ paragraph: saved.paragraph });
    }
  }, [bookSlug]);

  const handleContinueReading = useCallback(() => {
    if (!toastData) return;
    const el = document.getElementById(`p${toastData.paragraph}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--gold)';
      el.style.outlineOffset = '4px';
      setTimeout(() => {
        el.style.outline = 'none';
        el.style.outlineOffset = '';
      }, 2000);
    }
    setToastData(null);
  }, [toastData]);

  const handleDismissToast = useCallback(() => {
    setToastData(null);
  }, []);

  // --- IntersectionObserver for progress tracking ---
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (!bookSlug) return;

    const paragraphEls = document.querySelectorAll('[data-paragraph-id]');
    if (paragraphEls.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const pid = parseInt(entry.target.getAttribute('data-paragraph-id'), 10);
          if (!isNaN(pid)) {
            currentParaRef.current = pid;
          }
        }
      }
    }, { threshold: 0.5 });

    paragraphEls.forEach(el => observer.observe(el));

    // Debounced save every 10 seconds
    const interval = setInterval(() => {
      if (currentParaRef.current) {
        saveProgress(bookSlug, currentParaRef.current);
      }
    }, PROGRESS_DEBOUNCE_MS);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      // Save on unmount
      if (currentParaRef.current) {
        saveProgress(bookSlug, currentParaRef.current);
      }
    };
  }, [bookSlug, mode, page]); // re-observe when mode/page changes

  // --- Scroll to hash on mount ---
  useEffect(() => {
    scrollToHash();
  }, []);

  // Reading progress tracking
  useEffect(() => {
    if (mode === 'paginated') {
      setProgress(Math.round((page / totalPages) * 100));
      return;
    }

    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) { setProgress(100); return; }
      setProgress(Math.round((window.scrollY / docHeight) * 100));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [mode, page, totalPages]);

  // Determine if "Both" mode on mobile should show stacked vertically (not for 'side' — that uses SideMode grid)
  const showMobileBoth = isMobileReader && (mode === 'book' || mode === 'paginated');

  return (
    <div style={{ fontFamily: 'var(--font-en)', overflowX: 'hidden', maxWidth: '100%' }}>
      {/* Continue Reading Toast */}
      {toastData && (
        <ContinueReadingToast
          paragraphId={toastData.paragraph}
          onContinue={handleContinueReading}
          onDismiss={handleDismissToast}
        />
      )}

      <ProgressBar progress={progress} />

      {/* Translation Quality Badge */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <TranslationBadge reviewed={book.translation_reviewed || false} />
      </div>

      {/* Collapsible Book Introduction */}
      <BookIntro book={book} base={base} />

      <Toolbar
        mode={mode} setMode={setMode}
        fontSize={fontSize} setFontSize={setFontSize}
        page={page} totalPages={totalPages} setPage={setPage}
        showPageNav={mode === 'paginated' || mode === 'bn' || mode === 'en'}
        isMobile={isMobile}
        isMobileReader={isMobileReader}
      />

      {/* Reading modes */}
      {showMobileBoth ? (
        <MobileBothMode
          paragraphs={book.paragraphs}
          activeId={activeId} setActiveId={setActiveId}
          fontSize={fontSize}
          containerRef={containerRef}
          isMobile={isMobile}
          onOpenFeedback={openFeedback}
        />
      ) : (
        <>
          {mode === 'book' && (
            <BookMode
              paragraphs={book.paragraphs}
              activeId={activeId} setActiveId={setActiveId}
              fontSize={fontSize}
              containerRef={containerRef}
              isMobile={isMobile}
              onOpenFeedback={openFeedback}
            />
          )}

          {mode === 'paginated' && (
            <PaginatedMode
              paragraphs={book.paragraphs}
              page={page} totalPages={totalPages} setPage={setPage}
              activeId={activeId} setActiveId={setActiveId}
              fontSize={fontSize}
              containerRef={containerRef}
              isMobile={isMobile}
              onOpenFeedback={openFeedback}
            />
          )}

          {mode === 'side' && (
            <SideMode
              paragraphs={book.paragraphs}
              activeId={activeId} setActiveId={setActiveId}
              fontSize={fontSize}
              containerRef={containerRef}
              isMobile={isMobile}
            />
          )}

          {(mode === 'bn' || mode === 'en') && (
            <SingleLanguageMode
              paragraphs={book.paragraphs}
              lang={mode}
              page={page} totalPages={totalPages} setPage={setPage}
              activeId={activeId} setActiveId={setActiveId}
              fontSize={fontSize}
              containerRef={containerRef}
              isMobile={isMobile}
              onOpenFeedback={openFeedback}
            />
          )}
        </>
      )}

      {/* Hints */}
      <div style={{
        marginTop: '24px', textAlign: 'center',
        fontSize: '0.72rem', color: 'var(--btn-inactive-color)',
        letterSpacing: '0.06em', opacity: 0.5,
        lineHeight: '1.8',
      }}>
        {showMobileBoth && 'Scroll to read both languages \u00B7 Tap any passage to highlight'}
        {!showMobileBoth && mode === 'book' && 'Click any passage to highlight \u00B7 Scroll to read'}
        {!showMobileBoth && mode === 'paginated' && 'Use arrow keys or buttons to turn pages \u00B7 Click to highlight'}
        {!showMobileBoth && mode === 'side' && 'Paragraphs aligned side by side \u00B7 Click to highlight'}
        {!showMobileBoth && mode === 'bn' && 'Bengali text only \u00B7 Use arrow keys or buttons to turn pages'}
        {!showMobileBoth && mode === 'en' && 'English translation only \u00B7 Use arrow keys or buttons to turn pages'}
      </div>

      {/* Slide-down animation for toast */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Feedback Popover */}
      <FeedbackPopover
        isOpen={feedbackPopover.isOpen}
        onClose={closeFeedback}
        paragraphId={feedbackPopover.paragraphId}
        paragraphBn={feedbackPopover.paragraphBn}
        paragraphEn={feedbackPopover.paragraphEn}
        bookSlug={bookSlug}
        bookTitle={book.title_en || book.title_bn || ''}
        authorEn={book.author_en || ''}
        isMobile={isMobileReader}
        workerUrl={workerUrl}
      />
    </div>
  );
}
