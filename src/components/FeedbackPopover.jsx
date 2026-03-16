import { useState, useCallback, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_SUGGESTION_CHARS = 1000;

const ISSUE_TYPES = [
  { id: 'translation_inaccurate', label: 'Translation inaccurate' },
  { id: 'typo_bangla',            label: 'Typo in Bangla text' },
  { id: 'typo_english',           label: 'Typo in English text' },
  { id: 'awkward_phrasing',       label: 'Awkward English phrasing' },
  { id: 'missing_content',        label: 'Missing content' },
  { id: 'extra_content',          label: 'Extra content added' },
  { id: 'other',                  label: 'Other' },
];

// ---------------------------------------------------------------------------
// FeedbackPopover — inline translation feedback form
// ---------------------------------------------------------------------------
export default function FeedbackPopover({
  isOpen,
  onClose,
  paragraphId,
  paragraphBn,
  paragraphEn,
  bookSlug,
  bookTitle,
  authorEn,
  workerUrl = '',
  isMobile = false,
  anchorRect = null,
}) {
  const [feedbackType, setFeedbackType] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error | rate_limited
  const [errorMsg, setErrorMsg] = useState('');
  const popoverRef = useRef(null);
  const prevFocusRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement;
      setFeedbackType(null);
      setSuggestion('');
      setName('');
      setHoneypot('');
      setStatus('idle');
      setErrorMsg('');
      // Focus popover
      setTimeout(() => popoverRef.current?.focus(), 50);
    }
  }, [isOpen, paragraphId]);

  // Auto-close on success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Escape / outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && popoverRef.current) {
        const focusable = popoverRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Delay adding click listener to prevent immediate close from the opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose?.();
    prevFocusRef.current?.focus?.();
  }, [onClose]);

  // ---- Submit ----
  const handleSubmit = useCallback(async () => {
    if (!feedbackType) return;

    // Honeypot
    if (honeypot) {
      setStatus('success');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const sanitize = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();

    const payload = {
      bookSlug,
      bookTitle,
      authorEn,
      paragraphId,
      paragraphBn: sanitize(paragraphBn).slice(0, 2000),
      paragraphEn: sanitize(paragraphEn).slice(0, 2000),
      feedbackType,
      suggestion: sanitize(suggestion).slice(0, MAX_SUGGESTION_CHARS),
      name: sanitize(name) || 'Anonymous',
      pageUrl: typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}#p${paragraphId}`
        : '',
    };

    if (workerUrl) {
      try {
        const res = await fetch(`${workerUrl}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.status === 429) {
          setStatus('rate_limited');
          return;
        }
        if (!res.ok) {
          setErrorMsg('Failed to submit. Please try again.');
          setStatus('error');
          return;
        }
        setStatus('success');
      } catch {
        setErrorMsg('Network error. Please try again.');
        setStatus('error');
        return;
      }
    } else {
      // No Worker — open pre-filled GitHub issue as fallback
      const ISSUE_TYPE_DISPLAY = {
        translation_inaccurate: 'Translation inaccurate',
        typo_bangla: 'Typo in Bangla',
        typo_english: 'Typo in English',
        awkward_phrasing: 'Awkward phrasing',
        missing_content: 'Missing content',
        extra_content: 'Extra content',
        other: 'Other',
      };

      const issueTitle = encodeURIComponent(
        `Translation feedback: ${payload.bookTitle} \u00A7${payload.paragraphId} \u2014 ${payload.feedbackType}`
      );
      const issueBody = encodeURIComponent([
        '## Translation Feedback',
        '',
        `**Book:** ${payload.bookTitle}`,
        `**Author:** ${payload.authorEn}`,
        `**Paragraph:** #${payload.paragraphId}`,
        `**Issue type:** ${ISSUE_TYPE_DISPLAY[payload.feedbackType] || payload.feedbackType}`,
        '',
        '---',
        '',
        `### Original Bangla text (paragraph #${payload.paragraphId})`,
        payload.paragraphBn.slice(0, 500),
        '',
        '### Current English translation',
        payload.paragraphEn.slice(0, 500),
        '',
        '### Reader\'s suggestion',
        payload.suggestion || '*(No suggestion given)*',
        '',
        '---',
        '',
        `**Reported by:** ${payload.name}`,
        `**Date:** ${new Date().toISOString().split('T')[0]}`,
        `**Page:** ${payload.pageUrl}`,
        '',
        '---',
        '*Submitted via paragraph feedback tool*',
        `*Book slug: ${payload.bookSlug} \u00B7 Paragraph ID: ${payload.paragraphId}*`,
      ].join('\n'));

      const labels = encodeURIComponent('translation-feedback');
      const ghUrl = `https://github.com/shahriarspace/bangla-library/issues/new?title=${issueTitle}&body=${issueBody}&labels=${labels}`;
      window.open(ghUrl, '_blank', 'noopener');
      setStatus('success');
    }
  }, [feedbackType, suggestion, name, honeypot, bookSlug, bookTitle, authorEn, paragraphId, paragraphBn, paragraphEn, workerUrl]);

  if (!isOpen) return null;

  // ---- Positioning ----
  const popoverStyle = isMobile
    ? {
        // Bottom sheet on mobile
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: '12px 12px 0 0',
        maxHeight: '85vh',
        overflowY: 'auto',
      }
    : {
        // Desktop: fixed center overlay for simplicity
        // (anchored positioning is complex; this is reliable)
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        maxWidth: 360,
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
      };

  // ---- Render: Success ----
  if (status === 'success') {
    return (
      <>
        <div style={overlayStyle} />
        <div ref={popoverRef} style={{ ...basePopoverStyle, ...popoverStyle }} tabIndex={-1} role="dialog" aria-modal="true">
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: '1.5rem', color: '#4ade80', marginBottom: 8 }}>&#10003;</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--gold-light)' }}>Feedback sent!</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 8 }}>
              Thank you. This window will close automatically.
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- Render: Rate limited ----
  if (status === 'rate_limited') {
    return (
      <>
        <div style={overlayStyle} />
        <div ref={popoverRef} style={{ ...basePopoverStyle, ...popoverStyle }} tabIndex={-1} role="dialog" aria-modal="true">
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
              Too many reports recently. Please wait a while before submitting more.
            </div>
            <button onClick={handleClose} style={{ ...actionBtn, marginTop: 16 }}>Close</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={overlayStyle} />
      <div
        ref={popoverRef}
        style={{ ...basePopoverStyle, ...popoverStyle }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Feedback for paragraph ${paragraphId}`}
      >
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gold-light)' }}>
              Feedback &middot; Paragraph #{paragraphId}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
              {bookTitle}
            </div>
          </div>
          <button onClick={handleClose} style={closeBtn} aria-label="Close">&times;</button>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>
          {/* Issue type radios */}
          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>What is the issue?</div>
            {ISSUE_TYPES.map(type => (
              <label key={type.id} style={radioLabel}>
                <input
                  type="radio"
                  name="feedbackType"
                  value={type.id}
                  checked={feedbackType === type.id}
                  onChange={() => setFeedbackType(type.id)}
                  style={radioInput}
                />
                <span style={radioText}>{type.label}</span>
              </label>
            ))}
          </div>

          {/* Suggestion */}
          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Your suggestion <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>(optional)</span></div>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Suggest a better translation..."
              maxLength={MAX_SUGGESTION_CHARS}
              rows={3}
              style={textareaStyle}
            />
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textAlign: 'right', marginTop: 2 }}>
              {suggestion.length}/{MAX_SUGGESTION_CHARS}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Your name <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>(optional)</span></div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous if blank"
              style={inputStyle}
            />
          </div>

          {/* Honeypot */}
          <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
            <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} />
          </div>

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div style={{ fontSize: '0.75rem', color: '#e25555', marginBottom: 12 }} role="alert">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={handleClose} style={cancelBtn}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!feedbackType || status === 'submitting'}
              style={{
                ...actionBtn,
                opacity: (!feedbackType || status === 'submitting') ? 0.5 : 1,
                cursor: (!feedbackType || status === 'submitting') ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'submitting' ? 'Sending...' : 'Send Feedback \u2192'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 999,
  background: 'rgba(0,0,0,0.5)',
};

const basePopoverStyle = {
  background: 'var(--bg2, #1c1812)',
  border: '1px solid rgba(200,160,80,0.3)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  outline: 'none',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '16px 20px',
  borderBottom: '1px solid var(--border, rgba(200,160,80,0.15))',
};

const closeBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--text-dim, #8a7050)',
  fontSize: '1.3rem',
  cursor: 'pointer',
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  flexShrink: 0,
};

const fieldLabel = {
  fontSize: '0.75rem',
  color: 'var(--gold, #c8a050)',
  letterSpacing: '0.04em',
  marginBottom: 8,
};

const radioLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
  cursor: 'pointer',
};

const radioInput = {
  accentColor: 'var(--gold, #c8a050)',
  width: 14,
  height: 14,
  cursor: 'pointer',
  flexShrink: 0,
};

const radioText = {
  fontSize: '0.8rem',
  color: 'var(--text, #d4b87a)',
};

const textareaStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg, #12100e)',
  border: '1px solid var(--border, rgba(200,160,80,0.15))',
  color: 'var(--text, #d4b87a)',
  fontFamily: 'inherit',
  fontSize: '0.82rem',
  lineHeight: 1.5,
  resize: 'vertical',
  outline: 'none',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg, #12100e)',
  border: '1px solid var(--border, rgba(200,160,80,0.15))',
  color: 'var(--text, #d4b87a)',
  fontFamily: 'inherit',
  fontSize: '0.82rem',
  outline: 'none',
};

const cancelBtn = {
  padding: '8px 16px',
  background: 'transparent',
  border: '1px solid var(--border, rgba(200,160,80,0.15))',
  color: 'var(--text-dim, #8a7050)',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
  minHeight: 36,
};

const actionBtn = {
  padding: '8px 18px',
  background: 'var(--gold, #c8a050)',
  border: 'none',
  color: 'var(--bg, #12100e)',
  fontSize: '0.78rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  minHeight: 36,
  transition: 'opacity 0.2s',
};
