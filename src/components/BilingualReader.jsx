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
    // scroll both columns to the clicked paragraph
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
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(200,160,80,0.15)',
    borderRadius: '2px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(200,160,80,0.2) transparent',
  };

  const paraStyle = (id, isBn) => ({
    padding: '14px 12px',
    marginBottom: '2px',
    cursor: 'pointer',
    borderLeft: activeId === id ? '2px solid #c8a050' : '2px solid transparent',
    background: activeId === id ? 'rgba(200,160,80,0.07)' : 'transparent',
    transition: 'all 0.2s',
    lineHeight: '1.9',
    fontSize: isBn ? bnFontSizes[fontSize] : fontSizes[fontSize],
    fontFamily: isBn ? "'Noto Serif Bengali', serif" : "'Lora', Georgia, serif",
    fontStyle: isBn ? 'normal' : 'italic',
    color: activeId === id ? '#f0dfa0' : isBn ? '#d4b87a' : '#c8a878',
    borderRadius: '2px',
  });

  const btnStyle = (active) => ({
    padding: '6px 14px',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
    background: active ? 'rgba(200,160,80,0.2)' : 'transparent',
    color: active ? '#f0dfa0' : '#a08050',
    transition: 'all 0.2s',
    fontFamily: "'Lora', serif",
  });

  const colLabel = (text) => (
    <div style={{
      fontSize: '0.65rem', letterSpacing: '0.2em', color: '#c8a050',
      textAlign: 'center', marginBottom: '10px', opacity: 0.7,
      textTransform: 'uppercase',
    }}>{text}</div>
  );

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif" }}>

      {/* Controls bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
        padding: '10px 0',
        borderBottom: '1px solid rgba(200,160,80,0.12)',
      }}>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: '2px',
          background: 'rgba(0,0,0,0.3)', padding: '3px',
          border: '1px solid rgba(200,160,80,0.15)', borderRadius: '3px',
        }}>
          {[
            ['side-by-side', '⇔ Side by Side'],
            ['bn-only', 'বাংলা'],
            ['en-only', 'English'],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setMode(val)} style={btnStyle(mode === val)}>
              {label}
            </button>
          ))}
        </div>

        {/* Font size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.65rem', color: '#a08050', letterSpacing: '0.1em' }}>SIZE</span>
          {['sm', 'md', 'lg'].map(s => (
            <button key={s} onClick={() => setFontSize(s)} style={{
              width: '30px', height: '30px',
              border: `1px solid ${fontSize === s ? 'rgba(200,160,80,0.4)' : 'rgba(200,160,80,0.15)'}`,
              borderRadius: '2px', cursor: 'pointer',
              background: fontSize === s ? 'rgba(200,160,80,0.12)' : 'transparent',
              color: fontSize === s ? '#f0dfa0' : '#a08050',
              fontSize: s === 'sm' ? '0.65rem' : s === 'md' ? '0.8rem' : '1rem',
              fontFamily: 'Georgia, serif',
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
            {colLabel('বাংলা মূল · Original')}
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
                  <span style={{ fontSize: '0.55rem', color: '#c8a050', opacity: 0.4, marginRight: '8px', verticalAlign: 'middle', fontStyle: 'normal', fontFamily: 'monospace' }}>{p.id}</span>
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
                  <span style={{ fontSize: '0.55rem', color: '#c8a050', opacity: 0.4, marginRight: '8px', verticalAlign: 'middle', fontStyle: 'normal', fontFamily: 'monospace' }}>{p.id}</span>
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
        fontSize: '0.7rem', color: '#a08050', letterSpacing: '0.08em', opacity: 0.6,
      }}>
        Click any passage to highlight both columns · Scrolling syncs automatically
      </div>
    </div>
  );
}
