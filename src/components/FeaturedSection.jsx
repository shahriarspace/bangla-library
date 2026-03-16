import { useState, useEffect, useCallback, useRef } from 'react';
import FallbackCover from './FallbackCover.jsx';

/**
 * FeaturedSection — Homepage centrepiece.
 * Left: Cover slideshow with 3D tilt, auto-advance.
 * Right: Tabbed panels (Recently Added, Coming Soon, Top Read).
 */
export default function FeaturedSection({
  recentBooks = [],
  comingSoon = [],
  topRead = [],
  slideshowBooks = [],
  basePath = '',
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('recent');
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  const slides = slideshowBooks.length > 0 ? slideshowBooks : recentBooks.slice(0, 8);

  // Auto-advance slideshow
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    intervalRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [slides.length, isPaused]);

  const goToSlide = useCallback((i) => setActiveSlide(i), []);
  const currentBook = slides[activeSlide] || slides[0];

  // Check if a book was added in the last 7 days
  const isNew = (publishedDate) => {
    if (!publishedDate) return false;
    const d = new Date(publishedDate);
    const now = new Date();
    return (now - d) / (1000 * 60 * 60 * 24) <= 7;
  };

  const tabs = [
    { id: 'recent', label: 'Recently Added' },
    { id: 'soon', label: 'Coming Soon' },
    { id: 'top', label: 'Top Read' },
  ];

  return (
    <section className="featured-section">
      <div className="featured-inner">

        {/* LEFT — Cover Slideshow */}
        <div
          className="slideshow"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {currentBook && (
            <a
              href={`${basePath}/books/${currentBook.slug}`}
              className="slideshow-cover"
              key={currentBook.slug}
            >
              <div className="cover-3d">
                {currentBook.cover_image ? (
                  <img
                    src={currentBook.cover_image}
                    alt={currentBook.title_en}
                    className="cover-img"
                  />
                ) : (
                  <FallbackCover
                    title_bn={currentBook.title_bn}
                    title_en={currentBook.title_en}
                    author_en={currentBook.author_en}
                    year={currentBook.year}
                  />
                )}
              </div>
            </a>
          )}

          {currentBook && (
            <div className="slideshow-info">
              <div className="slideshow-title-bn">{currentBook.title_bn}</div>
              <div className="slideshow-title-en">{currentBook.title_en}</div>
              <div className="slideshow-author">
                {currentBook.author_en} · {currentBook.year}
              </div>
            </div>
          )}

          {slides.length > 1 && (
            <div className="slideshow-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === activeSlide ? 'dot-active' : ''}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Tabbed Lists */}
        <div className="tabs-panel">
          <div className="tab-bar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'recent' && (
              <div className="tab-list fade-in">
                {recentBooks.length === 0 && (
                  <div className="tab-empty">No books yet</div>
                )}
                {recentBooks.map(book => (
                  <a
                    key={book.slug}
                    href={`${basePath}/books/${book.slug}`}
                    className="tab-row"
                  >
                    <div className="tab-row-cover">
                      {book.cover_image ? (
                        <img src={book.cover_image} alt="" className="mini-cover" />
                      ) : (
                        <div className="mini-cover-fallback">
                          <span>{book.title_bn?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="tab-row-info">
                      <div className="tab-row-title">
                        {book.title_en}
                        {isNew(book.published_date) && (
                          <span className="badge-new">
                            <span className="badge-dot" /> NEW
                          </span>
                        )}
                      </div>
                      <div className="tab-row-sub">{book.author_en} · {book.year}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {activeTab === 'soon' && (
              <div className="tab-list fade-in">
                {comingSoon.length === 0 && (
                  <div className="tab-empty">Stay tuned!</div>
                )}
                {comingSoon.map((item, i) => (
                  <div key={i} className="tab-row tab-row-static">
                    <div className="tab-row-info">
                      <div className="tab-row-title">
                        {item.teaser || item.title_en || 'Untitled'}
                        <span className="badge-soon">SOON</span>
                      </div>
                      <div className="tab-row-sub">
                        {item.category} · {item.expected}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'top' && (
              <div className="tab-list fade-in">
                {topRead.length === 0 && (
                  <div className="tab-empty">No read data yet</div>
                )}
                {topRead.map((book, i) => (
                  <a
                    key={book.slug}
                    href={`${basePath}/books/${book.slug}`}
                    className="tab-row"
                  >
                    <div className="tab-row-rank">#{i + 1}</div>
                    <div className="tab-row-info">
                      <div className="tab-row-title">{book.title_en}</div>
                      <div className="tab-row-sub">
                        {book.author_en}
                        {book.reads > 0 && <span> · {book.reads.toLocaleString()} readers</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .featured-section {
          padding: 48px 24px;
          border-bottom: 1px solid var(--border);
        }
        .featured-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 40px;
          align-items: start;
        }

        /* Slideshow */
        .slideshow {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .slideshow-cover {
          display: block;
          width: 220px;
          height: 310px;
          perspective: 800px;
          text-decoration: none;
          margin-bottom: 16px;
        }
        .cover-3d {
          width: 100%;
          height: 100%;
          transform: rotateY(-8deg);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 6px 6px 20px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .slideshow-cover:hover .cover-3d {
          transform: rotateY(0deg) scale(1.02);
          box-shadow: 10px 10px 30px rgba(0,0,0,0.6);
        }
        .cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .slideshow-info {
          text-align: center;
          animation: fadeSlide 0.6s ease-in-out;
        }
        .slideshow-title-bn {
          font-family: var(--font-bn, 'Noto Serif Bengali', serif);
          font-size: 1.2rem;
          color: var(--gold-light, #f0dfa0);
          margin-bottom: 2px;
        }
        .slideshow-title-en {
          font-size: 0.85rem;
          color: var(--gold, #c8a050);
          font-style: italic;
          margin-bottom: 4px;
        }
        .slideshow-author {
          font-size: 0.72rem;
          color: var(--text-dim, #8a7050);
        }
        .slideshow-dots {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid var(--gold-dim, #a08050);
          background: transparent;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
        }
        .dot:hover {
          background: var(--gold-dim, #a08050);
        }
        .dot-active {
          background: var(--gold, #c8a050);
          border-color: var(--gold, #c8a050);
        }

        /* Tabs */
        .tabs-panel {
          min-height: 360px;
        }
        .tab-bar {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--border, rgba(200,160,80,0.15));
          margin-bottom: 16px;
        }
        .tab-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 10px 16px;
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          color: var(--gold-dim, #a08050);
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          min-height: 44px;
        }
        .tab-btn:hover {
          color: var(--gold-light, #f0dfa0);
        }
        .tab-active {
          color: var(--gold-light, #f0dfa0);
          border-bottom-color: var(--gold, #c8a050);
        }

        .tab-content {
          min-height: 280px;
        }
        .tab-list {
          display: flex;
          flex-direction: column;
        }
        .tab-empty {
          padding: 40px 0;
          text-align: center;
          color: var(--text-dim, #8a7050);
          font-style: italic;
          font-size: 0.85rem;
        }
        .tab-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 8px;
          border-left: 2px solid transparent;
          transition: all 0.2s;
          text-decoration: none;
          color: inherit;
          min-height: 44px;
        }
        .tab-row:hover {
          border-left-color: var(--gold, #c8a050);
          background: rgba(200,160,80,0.05);
        }
        .tab-row-static {
          cursor: default;
        }
        .tab-row-cover {
          flex-shrink: 0;
        }
        .mini-cover {
          width: 36px;
          height: 50px;
          object-fit: cover;
          border: 1px solid var(--border, rgba(200,160,80,0.15));
          transition: transform 0.2s;
        }
        .tab-row:hover .mini-cover {
          transform: scale(1.05);
        }
        .mini-cover-fallback {
          width: 36px;
          height: 50px;
          background: linear-gradient(160deg, #1c1812, #2c1f0e);
          border: 1px solid rgba(200,160,80,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Noto Serif Bengali', serif;
          font-size: 0.9rem;
          color: #f0dfa0;
        }
        .tab-row-rank {
          font-size: 0.85rem;
          color: var(--gold-dim, #a08050);
          min-width: 28px;
          text-align: center;
          flex-shrink: 0;
        }
        .tab-row-info {
          flex: 1;
          min-width: 0;
        }
        .tab-row-title {
          font-size: 0.85rem;
          color: var(--text, #d4b87a);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-row-sub {
          font-size: 0.72rem;
          color: var(--text-dim, #8a7050);
          margin-top: 2px;
        }

        /* Badges */
        .badge-new {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          color: var(--gold, #c8a050);
          border: 1px solid var(--gold-dim, #a08050);
          padding: 1px 6px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold, #c8a050);
          animation: pulse 2s infinite;
        }
        .badge-soon {
          display: inline-flex;
          align-items: center;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          color: var(--gold-dim, #a08050);
          border: 1px solid var(--border, rgba(200,160,80,0.15));
          padding: 1px 6px;
          border-radius: 2px;
          margin-left: 8px;
          flex-shrink: 0;
        }

        /* Animations */
        .fade-in {
          animation: fadeSlide 0.2s ease-out;
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .featured-section {
            padding: 32px 16px;
          }
          .featured-inner {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .slideshow-cover {
            width: 180px;
            height: 255px;
          }
          .tabs-panel {
            min-height: auto;
          }
        }
        @media (max-width: 480px) {
          .featured-section {
            padding: 24px 12px;
          }
          .slideshow-cover {
            width: 150px;
            height: 212px;
          }
          .tab-btn {
            padding: 8px 10px;
            font-size: 0.72rem;
          }
        }
      `}</style>
    </section>
  );
}
