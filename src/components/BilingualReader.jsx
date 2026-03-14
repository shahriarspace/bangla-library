import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'bl-reader';
const PARAS_PER_PAGE = 12;

const FONT_SIZES = {
  sm: { en: '0.92rem', bn: '1.05rem' },
  md: { en: '1.08rem', bn: '1.25rem' },
  lg: { en: '1.28rem', bn: '1.5rem' },
};

const MODES = [
  { id: 'book',       label: 'Book',       icon: '\u{1F4D6}', desc: 'Interleaved bilingual' },
  { id: 'paginated',  label: 'Pages',      icon: '\u{1F4C4}', desc: 'Page-by-page' },
  { id: 'side',       label: 'Side by Side', icon: '\u{2194}',  desc: 'Two columns' },
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
// Controls Toolbar
// ---------------------------------------------------------------------------
function Toolbar({ mode, setMode, fontSize, setFontSize, page, totalPages, setPage, showPageNav }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: '10px',
      padding: '12px 0',
      borderBottom: '1px solid var(--border)',
      marginBottom: '24px',
    }}>
      {/* Mode switcher */}
      <div style={{
        display: 'flex', gap: '2px',
        background: 'var(--controls-bg)', padding: '3px',
        border: '1px solid var(--btn-inactive-border)', borderRadius: '4px',
      }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.desc}
            style={{
              padding: '7px 14px',
              border: 'none', borderRadius: '3px', cursor: 'pointer',
              fontSize: '0.78rem', letterSpacing: '0.04em',
              background: mode === m.id ? 'var(--btn-active-bg)' : 'transparent',
              color: mode === m.id ? 'var(--text-active)' : 'var(--btn-inactive-color)',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-en)',
            }}
          >
            <span style={{ marginRight: '5px' }}>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Page navigation (paginated mode only) */}
        {showPageNav && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              style={navBtnStyle(page <= 1)}
              title="Previous page"
            >&lsaquo;</button>
            <span style={{
              fontSize: '0.75rem', color: 'var(--text-dim)',
              letterSpacing: '0.06em', minWidth: '60px', textAlign: 'center',
            }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              style={navBtnStyle(page >= totalPages)}
              title="Next page"
            >&rsaquo;</button>
          </div>
        )}

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {['sm', 'md', 'lg'].map(s => (
            <button key={s} onClick={() => setFontSize(s)} style={{
              width: '28px', height: '28px',
              border: `1px solid ${fontSize === s ? 'var(--btn-active-border)' : 'var(--btn-inactive-border)'}`,
              borderRadius: '3px', cursor: 'pointer',
              background: fontSize === s ? 'var(--btn-active-bg)' : 'transparent',
              color: fontSize === s ? 'var(--text-active)' : 'var(--btn-inactive-color)',
              fontSize: s === 'sm' ? '0.6rem' : s === 'md' ? '0.78rem' : '0.96rem',
              fontFamily: 'Georgia, serif',
              transition: 'all 0.2s',
            }}>A</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(disabled) {
  return {
    width: '30px', height: '30px',
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
function BookMode({ paragraphs, activeId, setActiveId, fontSize, containerRef }) {
  return (
    <div ref={containerRef} style={{
      maxWidth: '720px', margin: '0 auto',
      padding: '0 16px',
    }}>
      {paragraphs.map(p => (
        <div
          key={p.id}
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
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode 2: Paginated
// ---------------------------------------------------------------------------
function PaginatedMode({ paragraphs, page, totalPages, setPage, activeId, setActiveId, fontSize, containerRef }) {
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
          <div
            key={p.id}
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
        ))}
      </div>

      {/* Bottom page navigation */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: '16px', padding: '24px 0',
        borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{
            ...pageNavBtnStyle(page <= 1),
            padding: '10px 24px',
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
            padding: '10px 24px',
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
function SideMode({ paragraphs, activeId, setActiveId, fontSize, containerRef }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  const syncScroll = useCallback((source, target) => {
    if (isSyncing) return;
    setIsSyncing(true);
    const src = source.current;
    const tgt = target.current;
    if (!src || !tgt) { setIsSyncing(false); return; }
    const ratio = src.scrollTop / Math.max(1, src.scrollHeight - src.clientHeight);
    tgt.scrollTop = ratio * (tgt.scrollHeight - tgt.clientHeight);
    requestAnimationFrame(() => setIsSyncing(false));
  }, [isSyncing]);

  const handleClick = (id) => {
    setActiveId(activeId === id ? null : id);
  };

  const colStyle = {
    height: '70vh',
    overflowY: 'auto',
    padding: '28px 24px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--scrollbar-thumb) transparent',
  };

  return (
    <div ref={containerRef} style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1px',
      background: 'var(--border)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      {/* Bengali column */}
      <div
        ref={leftRef}
        style={{ ...colStyle, background: 'var(--bg)' }}
        onScroll={() => syncScroll(leftRef, rightRef)}
      >
        <div style={{
          fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)',
          textAlign: 'center', marginBottom: '20px', opacity: 0.6,
          textTransform: 'uppercase',
        }}>
          Bengali Original
        </div>
        {paragraphs.map(p => (
          <div
            key={p.id}
            onClick={() => handleClick(p.id)}
            style={{
              padding: '16px 14px',
              marginBottom: '4px',
              cursor: 'pointer',
              borderLeft: activeId === p.id ? '2px solid var(--border-active)' : '2px solid transparent',
              background: activeId === p.id ? 'var(--highlight)' : 'transparent',
              borderRadius: '2px',
              transition: 'all 0.15s',
              fontSize: FONT_SIZES[fontSize].bn,
              fontFamily: 'var(--font-bn)',
              lineHeight: '2.1',
              color: activeId === p.id ? 'var(--text-active)' : 'var(--text-bn)',
            }}
          >
            {p.bn}
          </div>
        ))}
      </div>

      {/* English column */}
      <div
        ref={rightRef}
        style={{ ...colStyle, background: 'var(--bg)' }}
        onScroll={() => syncScroll(rightRef, leftRef)}
      >
        <div style={{
          fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)',
          textAlign: 'center', marginBottom: '20px', opacity: 0.6,
          textTransform: 'uppercase',
        }}>
          English Translation
        </div>
        {paragraphs.map(p => (
          <div
            key={p.id}
            onClick={() => handleClick(p.id)}
            style={{
              padding: '16px 14px',
              marginBottom: '4px',
              cursor: 'pointer',
              borderLeft: activeId === p.id ? '2px solid var(--border-active)' : '2px solid transparent',
              background: activeId === p.id ? 'var(--highlight)' : 'transparent',
              borderRadius: '2px',
              transition: 'all 0.15s',
              fontSize: FONT_SIZES[fontSize].en,
              fontFamily: 'var(--font-en)',
              fontStyle: 'italic',
              lineHeight: '1.9',
              color: activeId === p.id ? 'var(--text-active)' : 'var(--text-en)',
            }}
          >
            {p.en}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BilingualReader({ book, base = '' }) {
  const prefs = useMemo(() => loadPrefs(), []);
  const [mode, setModeRaw] = useState(prefs.mode || 'book');
  const [fontSize, setFontSizeRaw] = useState(prefs.fontSize || 'md');
  const [page, setPageRaw] = useState(prefs.page || 1);
  const [activeId, setActiveId] = useState(null);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);

  const totalPages = Math.ceil(book.paragraphs.length / PARAS_PER_PAGE);

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

  return (
    <div style={{ fontFamily: 'var(--font-en)' }}>
      <ProgressBar progress={progress} />

      <Toolbar
        mode={mode} setMode={setMode}
        fontSize={fontSize} setFontSize={setFontSize}
        page={page} totalPages={totalPages} setPage={setPage}
        showPageNav={mode === 'paginated'}
      />

      {/* Reading modes */}
      {mode === 'book' && (
        <BookMode
          paragraphs={book.paragraphs}
          activeId={activeId} setActiveId={setActiveId}
          fontSize={fontSize}
          containerRef={containerRef}
        />
      )}

      {mode === 'paginated' && (
        <PaginatedMode
          paragraphs={book.paragraphs}
          page={page} totalPages={totalPages} setPage={setPage}
          activeId={activeId} setActiveId={setActiveId}
          fontSize={fontSize}
          containerRef={containerRef}
        />
      )}

      {mode === 'side' && (
        <SideMode
          paragraphs={book.paragraphs}
          activeId={activeId} setActiveId={setActiveId}
          fontSize={fontSize}
          containerRef={containerRef}
        />
      )}

      {/* Hints */}
      <div style={{
        marginTop: '24px', textAlign: 'center',
        fontSize: '0.72rem', color: 'var(--btn-inactive-color)',
        letterSpacing: '0.06em', opacity: 0.5,
        lineHeight: '1.8',
      }}>
        {mode === 'book' && 'Click any passage to highlight \u00B7 Scroll to read'}
        {mode === 'paginated' && 'Use arrow keys or buttons to turn pages \u00B7 Click to highlight'}
        {mode === 'side' && 'Scroll syncs both columns \u00B7 Click to highlight'}
      </div>
    </div>
  );
}
