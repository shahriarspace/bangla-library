import FallbackCover from './FallbackCover.jsx';

/**
 * BookCover — Displays a book cover image with fallback to CSS-generated cover.
 * Includes 3D tilt effect on hover.
 */
export default function BookCover({
  cover_image,
  title_bn,
  title_en,
  author_en,
  year,
  width = 200,
  height = 280,
  className = '',
  link,
}) {
  const coverStyle = {
    width: `${width}px`,
    height: `${height}px`,
    perspective: '800px',
  };

  const innerStyle = {
    width: '100%',
    height: '100%',
    transform: 'rotateY(-5deg)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '4px 4px 16px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  };

  const content = cover_image ? (
    <img
      src={cover_image}
      alt={`${title_en} cover`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
      loading="lazy"
    />
  ) : (
    <FallbackCover
      title_bn={title_bn}
      title_en={title_en}
      author_en={author_en}
      year={year}
    />
  );

  const Wrapper = link ? 'a' : 'div';
  const wrapperProps = link
    ? { href: link, style: { ...coverStyle, display: 'block', textDecoration: 'none' }, className: `book-cover ${className}` }
    : { style: coverStyle, className: `book-cover ${className}` };

  return (
    <Wrapper {...wrapperProps}>
      <div className="book-cover-inner" style={innerStyle}>
        {content}
      </div>
      <style>{`
        .book-cover:hover .book-cover-inner {
          transform: rotateY(0deg) scale(1.02) !important;
          box-shadow: 8px 8px 24px rgba(0,0,0,0.5) !important;
        }
      `}</style>
    </Wrapper>
  );
}
