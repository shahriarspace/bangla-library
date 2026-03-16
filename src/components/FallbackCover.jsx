/**
 * FallbackCover — CSS-generated book cover when no cover image is available.
 * Matches the site's antique gold aesthetic.
 */
export default function FallbackCover({ title_bn, title_en, author_en, year, style }) {
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
        padding: '24px',
        textAlign: 'center',
        fontFamily: "'Noto Serif Bengali', serif",
        ...style,
      }}
    >
      <div
        style={{
          width: '40px',
          height: '1px',
          background: 'rgba(200,160,80,0.4)',
          marginBottom: '20px',
        }}
      />
      <div
        style={{
          fontSize: '1.6rem',
          color: '#f0dfa0',
          lineHeight: 1.4,
          marginBottom: '12px',
        }}
      >
        {title_bn}
      </div>
      <div
        style={{
          fontSize: '0.8rem',
          color: '#c8a050',
          fontStyle: 'italic',
          fontFamily: 'Georgia, serif',
          marginBottom: '20px',
        }}
      >
        {title_en}
      </div>
      <div
        style={{
          width: '40px',
          height: '1px',
          background: 'rgba(200,160,80,0.4)',
          marginBottom: '16px',
        }}
      />
      <div
        style={{
          fontSize: '0.72rem',
          color: '#a08050',
          fontFamily: 'Georgia, serif',
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
