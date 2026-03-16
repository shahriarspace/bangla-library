// ---------------------------------------------------------------------------
// ShareButtons — Social sharing for book pages
// WhatsApp (priority), Twitter/X, Facebook, Copy Link
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';

const SHARE_TARGETS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (url, text) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`,
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
];

export default function ShareButtons({ bookTitle, bookTitleBn, authorEn, slug, siteUrl }) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const pageUrl = `${siteUrl}/books/${slug}/`;
  const shareText = `Read "${bookTitle}" (${bookTitleBn}) by ${authorEn} — free bilingual Bangla-English reading`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = pageUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pageUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: bookTitle,
          text: shareText,
          url: pageUrl,
        });
      } catch {
        // User cancelled — ignore
      }
    }
  }, [bookTitle, shareText, pageUrl]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Share toggle button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Share this book"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--gold-dim)',
          fontSize: '0.78rem',
          letterSpacing: '0.06em',
          fontFamily: 'Georgia, serif',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '44px',
          borderRadius: '2px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '8px',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 50,
            whiteSpace: 'nowrap',
          }}
        >
          {/* Social share buttons */}
          {SHARE_TARGETS.map(target => (
            <a
              key={target.id}
              href={target.getUrl(pageUrl, shareText)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${target.label}`}
              aria-label={`Share on ${target.label}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '4px',
                color: 'var(--gold-dim)',
                transition: 'all 0.2s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--gold-light)';
                e.currentTarget.style.background = 'var(--highlight)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--gold-dim)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {target.icon}
            </a>
          ))}

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '24px',
            background: 'var(--border)',
            margin: '0 2px',
          }} />

          {/* Copy link */}
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy link'}
            aria-label="Copy link to clipboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '4px',
              border: 'none',
              background: copied ? 'var(--highlight)' : 'transparent',
              color: copied ? 'var(--gold-light)' : 'var(--gold-dim)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            )}
          </button>

          {/* Native share (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <>
              <div style={{
                width: '1px',
                height: '24px',
                background: 'var(--border)',
                margin: '0 2px',
              }} />
              <button
                onClick={handleNativeShare}
                title="Share via system"
                aria-label="Share via system dialog"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--gold-dim)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
