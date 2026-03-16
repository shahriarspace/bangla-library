/**
 * FallbackCover — CSS-generated book cover when no cover image is available.
 * Matches the site's antique gold aesthetic.
 * Handles long titles by scaling font size and wrapping text.
 */
export default function FallbackCover({ title_bn, title_en, author_en, year, style }) {
  // Scale down English title font for long titles
  const enLen = (title_en || '').length;
  const enFontSize = enLen > 30 ? '0.65rem' : enLen > 20 ? '0.72rem' : '0.8rem';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #1c1812 0%, #2c1f0e 100%)',
        border: '1px solid rgba(200,160,80,0.3)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 16px',
        textAlign: 'center',
        fontFamily: "'Noto Serif Bengali', serif",
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          width: '40px',
          height: '1px',
          background: 'rgba(200,160,80,0.4)',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontSize: '1.6rem',
          color: '#f0dfa0',
          lineHeight: 1.4,
          marginBottom: '10px',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
        }}
      >
        {title_bn}
      </div>
      <div
        style={{
          fontSize: enFontSize,
          color: '#c8a050',
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
          marginBottom: '16px',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
          lineHeight: 1.4,
        }}
      >
        {title_en}
      </div>
      <div
        style={{
          width: '40px',
          height: '1px',
          background: 'rgba(200,160,80,0.4)',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontSize: '0.72rem',
          color: '#a08050',
          fontFamily: 'Georgia, serif',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          maxWidth: '100%',
        }}
      >
        {author_en}
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: '#6a5030',
          fontFamily: 'Georgia, serif',
          marginTop: '4px',
        }}
      >
        {year}
      </div>
    </div>
  );
}
