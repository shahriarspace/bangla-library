import { useState, useRef, useCallback } from 'react';

export default function BilingualReader({ book, base = '' }) {
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('side-by-side');
  const [fontSize, setFontSize] = useState('md');
  const [isSyncing, setIsSyncing] = useState(false);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const paraRefsLeft = useRef({});
  const paraRefsRight = useRef({});

  const fontSizes = { sm: '0.9rem', md: '1.05rem', lg: '1.3rem' };
  const bnFontSizes = { sm: '1rem', md: '1.2rem', lg: '1.5rem' };

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

  const handleParaClick = (id) => {
    setActiveId(id);
    const leftEl = paraRefsLeft.current[id];
    const rightEl = paraRefsRight.current[id];
    if (leftEl && leftRef.current) {
      leftRef.current.scrollTo({ top: leftEl.offsetTop - 24, behavior: 'smooth' });
    }
    if (rightEl && rightRef.current) {
      rightRef.current.scrollTo({ top: rightEl.offsetTop - 24, behavior: 'smooth' });
    }
  };

  const panelStyle = {
    height: '60vh',
    overflowY: 'auto',
    padding: '24px 20px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '2px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--scrollbar-thumb) transparent',
    transition: 'background 0.3s ease, border-color 0.3s ease',
  };

  const paraStyle = (id, isBn) => ({
    padding: '14px 12px',
    marginBottom: '2px',
    cursor: 'pointer',
    borderLeft: activeId === id ? '2px solid var(--border-active)' : '2px solid transparent',
    background: activeId === id ? 'var(--highlight)' : 'transparent',
    transition: 'all 0.2s',
    lineHeight: '1.9',
    fontSize: isBn ? bnFontSizes[fontSize] : fontSizes[fontSize],
    fontFamily: isBn ? "var(--font-bn)" : "var(--font-en)",
    fontStyle: isBn ? 'normal' : 'italic',
    color: activeId === id ? 'var(--text-active)' : isBn ? 'var(--text-bn)' : 'var(--text-en)',
    borderRadius: '2px',
  });

  const btnStyle = (active) => ({
    padding: '6px 14px',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
    background: active ? 'var(--btn-active-bg)' : 'transparent',
    color: active ? 'var(--text-active)' : 'var(--btn-inactive-color)',
    transition: 'all 0.2s',
    fontFamily: "var(--font-en)",
  });

  const colLabel = (text) => (
    <div style={{
      fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)',
      textAlign: 'center', marginBottom: '10px', opacity: 0.7,
      textTransform: 'uppercase',
    }}>{text}</div>
  );

  return (
    <div style={{ fontFamily: "var(--font-en)" }}>

      {/* Controls bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: '2px',
          background: 'var(--controls-bg)', padding: '3px',
          border: '1px solid var(--btn-inactive-border)', borderRadius: '3px',
        }}>
          {[
            ['side-by-side', '\u21D4 Side by Side'],
            ['bn-only', '\u09AC\u09BE\u0982\u09B2\u09BE'],
            ['en-only', 'English'],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setMode(val)} style={btnStyle(mode === val)}>
              {label}
            </button>
          ))}
        </div>

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--btn-inactive-color)', letterSpacing: '0.1em' }}>SIZE</span>
          {['sm', 'md', 'lg'].map(s => (
            <button key={s} onClick={() => setFontSize(s)} style={{
              width: '30px', height: '30px',
              border: `1px solid ${fontSize === s ? 'var(--btn-active-border)' : 'var(--btn-inactive-border)'}`,
              borderRadius: '2px', cursor: 'pointer',
              background: fontSize === s ? 'var(--btn-active-bg)' : 'transparent',
              color: fontSize === s ? 'var(--text-active)' : 'var(--btn-inactive-color)',
              fontSize: s === 'sm' ? '0.65rem' : s === 'md' ? '0.8rem' : '1rem',
              fontFamily: 'Georgia, serif',
              transition: 'all 0.2s',
            }}>A</button>
          ))}
        </div>
      </div>

      {/* Reader columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mode === 'side-by-side' ? '1fr 1fr' : '1fr',
        gap: '12px',
      }}>

        {/* Bangla column */}
        {(mode === 'side-by-side' || mode === 'bn-only') && (
          <div>
            {colLabel('\u09AC\u09BE\u0982\u09B2\u09BE \u09AE\u09C2\u09B2 \u00B7 Original')}
            <div
              ref={leftRef}
              style={panelStyle}
              onScroll={() => mode === 'side-by-side' && syncScroll(leftRef, rightRef)}
            >
              {book.paragraphs.map((p) => (
                <div
                  key={p.id}
                  ref={el => paraRefsLeft.current[p.id] = el}
                  onClick={() => handleParaClick(p.id)}
                  style={paraStyle(p.id, true)}
                  data-pagefind-body
                >
                  <span style={{ fontSize: '0.55rem', color: 'var(--id-color)', opacity: 0.4, marginRight: '8px', verticalAlign: 'middle', fontStyle: 'normal', fontFamily: 'monospace' }}>{p.id}</span>
                  {p.bn}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* English column */}
        {(mode === 'side-by-side' || mode === 'en-only') && (
          <div>
            {colLabel('English Translation')}
            <div
              ref={rightRef}
              style={panelStyle}
              onScroll={() => mode === 'side-by-side' && syncScroll(rightRef, leftRef)}
            >
              {book.paragraphs.map((p) => (
                <div
                  key={p.id}
                  ref={el => paraRefsRight.current[p.id] = el}
                  onClick={() => handleParaClick(p.id)}
                  style={paraStyle(p.id, false)}
                  data-pagefind-body
                >
                  <span style={{ fontSize: '0.55rem', color: 'var(--id-color)', opacity: 0.4, marginRight: '8px', verticalAlign: 'middle', fontStyle: 'normal', fontFamily: 'monospace' }}>{p.id}</span>
                  {p.en}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <div style={{
        marginTop: '16px', textAlign: 'center',
        fontSize: '0.7rem', color: 'var(--btn-inactive-color)', letterSpacing: '0.08em', opacity: 0.6,
      }}>
        Click any passage to highlight both columns &middot; Scrolling syncs automatically
      </div>
    </div>
  );
}
