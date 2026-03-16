import { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// AuthorTimeline — Interactive chronological timeline of Bengali authors
// Placed on the /authors page as a React island
// ---------------------------------------------------------------------------

const ERAS = [
  { id: 'all', label: 'All Eras', labelBn: 'সকল যুগ' },
  { id: '19th', label: '19th Century', labelBn: '১৯শ শতক', start: 1800, end: 1899 },
  { id: 'early-20th', label: 'Early 20th', labelBn: '২০শ শতকের প্রথমার্ধ', start: 1900, end: 1949 },
  { id: 'mid-20th', label: 'Mid–Late 20th', labelBn: '২০শ শতকের দ্বিতীয়ার্ধ', start: 1950, end: 1999 },
];

function getYear(dateStr) {
  if (!dateStr) return null;
  const y = parseInt(dateStr.split('-')[0], 10);
  return isNaN(y) ? null : y;
}

function getEra(birthYear) {
  if (!birthYear) return null;
  for (const era of ERAS) {
    if (era.id === 'all') continue;
    if (birthYear >= era.start && birthYear <= era.end) return era.id;
  }
  return null;
}

export default function AuthorTimeline({ authors, baseUrl = '' }) {
  const [selectedEra, setSelectedEra] = useState('all');
  const [hoveredAuthor, setHoveredAuthor] = useState(null);

  // Process author data into timeline entries sorted by birth year
  const entries = useMemo(() => {
    return authors
      .map(a => ({
        id: a.id,
        nameBn: a.name_bn,
        nameEn: a.name_en,
        birthYear: getYear(a.born),
        deathYear: getYear(a.died),
        born: a.born,
        died: a.died,
        genres: a.genres || [],
        imageUrl: a.image_url,
        bookCount: a.bookCount || 0,
        era: getEra(getYear(a.born)),
      }))
      .filter(a => a.birthYear !== null)
      .sort((a, b) => a.birthYear - b.birthYear);
  }, [authors]);

  const filtered = useMemo(() => {
    if (selectedEra === 'all') return entries;
    return entries.filter(e => e.era === selectedEra);
  }, [entries, selectedEra]);

  // Timeline range
  const minYear = filtered.length > 0 ? Math.min(...filtered.map(e => e.birthYear)) : 1800;
  const maxYear = filtered.length > 0
    ? Math.max(...filtered.map(e => e.deathYear || new Date().getFullYear()))
    : 2020;
  const range = maxYear - minYear || 1;

  return (
    <div style={{ marginBottom: '48px' }}>
      {/* Section heading */}
      <h2 style={{
        fontSize: '0.85rem', letterSpacing: '0.15em',
        color: 'var(--gold)', textTransform: 'uppercase',
        fontWeight: 400, textAlign: 'center', marginBottom: '20px',
      }}>
        Literary Timeline
      </h2>

      {/* Era filter buttons */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap',
        justifyContent: 'center', marginBottom: '28px',
      }}>
        {ERAS.map(era => (
          <button
            key={era.id}
            onClick={() => setSelectedEra(era.id)}
            style={{
              padding: '8px 14px',
              border: '1px solid ' + (selectedEra === era.id
                ? 'var(--btn-active-border)' : 'var(--border)'),
              background: selectedEra === era.id
                ? 'var(--btn-active-bg)' : 'transparent',
              color: selectedEra === era.id
                ? 'var(--gold-light)' : 'var(--gold-dim)',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              letterSpacing: '0.06em',
              fontFamily: 'Georgia, serif',
              transition: 'all 0.2s',
              minHeight: '44px',
            }}
          >
            {era.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{
          textAlign: 'center', color: 'var(--text-dim)',
          fontSize: '0.85rem', padding: '24px 0',
        }}>
          No authors found in this era.
        </p>
      ) : (
        <>
          {/* Timeline visualization */}
          <div style={{
            position: 'relative',
            padding: '16px 0 32px',
            overflowX: 'auto',
            overflowY: 'visible',
          }}>
            {/* Year axis labels */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0 20px', marginBottom: '8px',
            }}>
              {/* Show decade markers */}
              {(() => {
                const startDecade = Math.floor(minYear / 10) * 10;
                const endDecade = Math.ceil(maxYear / 10) * 10;
                const decades = [];
                for (let d = startDecade; d <= endDecade; d += 20) {
                  decades.push(d);
                }
                return decades.map(d => (
                  <span key={d} style={{
                    fontSize: '0.65rem', color: 'var(--text-dim)',
                    letterSpacing: '0.04em', opacity: 0.6,
                  }}>
                    {d}
                  </span>
                ));
              })()}
            </div>

            {/* Horizontal axis line */}
            <div style={{
              position: 'relative',
              height: '2px',
              background: 'var(--border)',
              margin: '0 20px 24px',
            }}>
              {/* Birth year markers on the axis */}
              {filtered.map(entry => {
                const pos = ((entry.birthYear - minYear) / range) * 100;
                return (
                  <div
                    key={entry.id + '-marker'}
                    style={{
                      position: 'absolute',
                      left: `${pos}%`,
                      top: '-4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: hoveredAuthor === entry.id
                        ? 'var(--gold-light)' : 'var(--gold)',
                      border: '2px solid var(--bg)',
                      transform: 'translateX(-50%)',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      zIndex: hoveredAuthor === entry.id ? 10 : 1,
                    }}
                    onMouseEnter={() => setHoveredAuthor(entry.id)}
                    onMouseLeave={() => setHoveredAuthor(null)}
                    title={`${entry.nameEn} (${entry.birthYear}–${entry.deathYear || 'present'})`}
                  />
                );
              })}
            </div>

            {/* Author cards below timeline */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px',
              padding: '0 20px',
            }}>
              {filtered.map(entry => {
                const lifespan = entry.deathYear
                  ? `${entry.birthYear}–${entry.deathYear}`
                  : `${entry.birthYear}–present`;
                const isHovered = hoveredAuthor === entry.id;

                return (
                  <a
                    key={entry.id}
                    href={`${baseUrl}/authors/${entry.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 16px',
                      border: '1px solid ' + (isHovered
                        ? 'var(--card-hover-border)' : 'var(--border)'),
                      background: isHovered
                        ? 'var(--card-hover-bg)' : 'var(--bg-panel)',
                      textDecoration: 'none',
                      transition: 'all 0.25s',
                      minHeight: '44px',
                    }}
                    onMouseEnter={() => setHoveredAuthor(entry.id)}
                    onMouseLeave={() => setHoveredAuthor(null)}
                  >
                    {/* Avatar */}
                    {entry.imageUrl ? (
                      <img
                        src={entry.imageUrl}
                        alt={entry.nameEn}
                        style={{
                          width: '44px', height: '44px',
                          borderRadius: '50%', objectFit: 'cover',
                          border: '1px solid var(--border)',
                          flexShrink: 0,
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'var(--bg2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border)',
                        fontFamily: 'var(--font-bn)', fontSize: '1.2rem',
                        color: 'var(--gold-dim)', flexShrink: 0,
                      }}>
                        {entry.nameBn?.charAt(0) || '?'}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-bn)',
                          fontSize: '1.05rem', color: 'var(--gold-light)',
                        }}>
                          {entry.nameBn}
                        </span>
                        <span style={{
                          fontSize: '0.82rem', color: 'var(--gold)',
                          fontStyle: 'italic',
                        }}>
                          {entry.nameEn}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginTop: '4px', flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: '0.72rem', color: 'var(--text-dim)',
                          letterSpacing: '0.04em',
                        }}>
                          {lifespan}
                        </span>
                        {entry.genres.length > 0 && (
                          <span style={{
                            fontSize: '0.65rem', color: 'var(--gold-dim)',
                            letterSpacing: '0.04em',
                          }}>
                            {entry.genres.slice(0, 3).join(' · ')}
                          </span>
                        )}
                        {entry.bookCount > 0 && (
                          <span style={{
                            fontSize: '0.65rem', color: 'var(--text-dim)',
                          }}>
                            {entry.bookCount} {entry.bookCount === 1 ? 'book' : 'books'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Life span bar — hidden by default, shown on wider screens via CSS */}
                    <div style={{
                      width: '120px', height: '6px',
                      background: 'var(--bg2)',
                      borderRadius: '3px',
                      position: 'relative',
                      flexShrink: 0,
                    }} className="timeline-lifespan-bar">
                      <div style={{
                        position: 'absolute',
                        left: `${((entry.birthYear - minYear) / range) * 100}%`,
                        width: `${(((entry.deathYear || new Date().getFullYear()) - entry.birthYear) / range) * 100}%`,
                        height: '100%',
                        background: 'var(--gold)',
                        borderRadius: '3px',
                        opacity: 0.4,
                        minWidth: '4px',
                      }} />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Timeline legend */}
      <div style={{
        textAlign: 'center', marginTop: '16px',
        fontSize: '0.68rem', color: 'var(--text-dim)',
        opacity: 0.5, letterSpacing: '0.06em',
      }}>
        {filtered.length} {filtered.length === 1 ? 'author' : 'authors'} ·
        Click to view profile
      </div>
    </div>
  );
}
