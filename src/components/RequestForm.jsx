import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_REASON_CHARS = 500;

const INITIAL_FORM = {
  title_bn: '',
  title_en: '',
  author: '',
  year: '',
  reason: '',
  name: '',
  honeypot: '', // hidden — bots fill this
};

// ---------------------------------------------------------------------------
// RequestForm — React island for the Request a Book page
// ---------------------------------------------------------------------------
export default function RequestForm({ workerUrl = '', initialRequests = [] }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error | rate_limited
  const [errorMsg, setErrorMsg] = useState('');
  const [requests, setRequests] = useState(initialRequests);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  // ---- Field change handler ----
  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    setErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // ---- Validation ----
  const validate = useCallback(() => {
    const errs = {};
    if (!form.title_bn.trim() && !form.title_en.trim()) {
      errs.title_bn = 'Please enter the book title in Bangla or English';
    }
    if (!form.author.trim() || form.author.trim().length < 2) {
      errs.author = 'Author name is required (min 2 characters)';
    }
    if (form.reason.length > MAX_REASON_CHARS) {
      errs.reason = `Maximum ${MAX_REASON_CHARS} characters`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  // ---- Strip HTML ----
  const sanitize = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();

  // ---- Submit ----
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Honeypot check — if filled, silently "succeed"
    if (form.honeypot) {
      setStatus('success');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const payload = {
      title_bn: sanitize(form.title_bn),
      title_en: sanitize(form.title_en),
      author: sanitize(form.author),
      year: sanitize(form.year),
      reason: sanitize(form.reason).slice(0, MAX_REASON_CHARS),
      name: sanitize(form.name),
    };

    // If the Cloudflare Worker URL is configured, POST to it
    if (workerUrl) {
      try {
        const res = await fetch(`${workerUrl}/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 429) {
          setStatus('rate_limited');
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error || 'Something went wrong. Please try again.');
          setStatus('error');
          return;
        }

        // Success
        setStatus('success');
      } catch {
        setErrorMsg('Network error. Please check your connection and try again.');
        setStatus('error');
        return;
      }
    } else {
      // No Worker configured — create a pre-filled GitHub issue URL as fallback
      const titleEn = payload.title_en || payload.title_bn;
      const issueTitle = encodeURIComponent(`Book Request: ${titleEn} — ${payload.author}`);
      const issueBody = encodeURIComponent([
        '## Book Request',
        '',
        `**Title (Bangla):** ${payload.title_bn || '\u2014'}`,
        `**Title (English):** ${payload.title_en || '\u2014'}`,
        `**Author:** ${payload.author}`,
        `**Year:** ${payload.year || 'Unknown'}`,
        '',
        '**Why this book:**',
        payload.reason || '*(No reason given)*',
        '',
        `**Requested by:** ${payload.name || 'Anonymous'}`,
        `**Date:** ${new Date().toISOString().split('T')[0]}`,
        '',
        '---',
        '*Submitted via bangla-library request form*',
        '*Copyright status: verify before adding*',
      ].join('\n'));

      const ghUrl = `https://github.com/shahriarspace/bangla-library/issues/new?title=${issueTitle}&body=${issueBody}&labels=book-request,public-domain-check`;
      window.open(ghUrl, '_blank', 'noopener');
      setStatus('success');
    }

    // Optimistic UI — prepend to visible list
    const displayTitle = payload.title_en || payload.title_bn;
    setRequests(prev => [{
      id: 'pending-' + Date.now(),
      title: `Book Request: ${displayTitle} \u2014 ${payload.author}`,
      reactions: { '+1': 0 },
      labels: [{ name: 'book-request' }],
      html_url: '#',
      isPending: true,
    }, ...prev]);

  }, [form, validate, workerUrl]);

  // ---- Reset for another submission ----
  const handleReset = useCallback(() => {
    setForm(INITIAL_FORM);
    setStatus('idle');
    setErrorMsg('');
    setErrors({});
  }, []);

  // ---- Render: Success state ----
  if (status === 'success') {
    return (
      <div>
        <div style={styles.successBox}>
          <div style={styles.successIcon}>&#10003;</div>
          <h3 style={styles.successTitle}>Request submitted!</h3>
          <p style={styles.successText}>
            Your request has been added to the list below. We review all
            requests and aim to respond within a few days.
          </p>
          <button onClick={handleReset} style={styles.submitBtn}>
            Submit another request
          </button>
        </div>
        <OpenRequestsPanel requests={requests} />
      </div>
    );
  }

  // ---- Render: Rate limited ----
  if (status === 'rate_limited') {
    return (
      <div>
        <div style={styles.rateLimitBox}>
          <p style={styles.rateLimitText}>
            You've submitted 3 requests recently.
            Please wait an hour before submitting more.
          </p>
          <button onClick={handleReset} style={{ ...styles.submitBtn, marginTop: 16 }}>
            Try again
          </button>
        </div>
        <OpenRequestsPanel requests={requests} />
      </div>
    );
  }

  // ---- Render: Form ----
  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div style={styles.formCard}>
          {/* Title Bangla */}
          <FormField
            label="Book Title (Bangla)"
            required
            error={errors.title_bn}
          >
            <input
              type="text"
              value={form.title_bn}
              onChange={(e) => handleChange('title_bn', e.target.value)}
              placeholder="\u09AC\u0987\u09AF\u09BC\u09C7\u09B0 \u09A8\u09BE\u09AE \u09B2\u09BF\u0996\u09C1\u09A8..."
              style={styles.input}
              lang="bn"
              dir="auto"
              aria-invalid={!!errors.title_bn}
            />
          </FormField>

          {/* Title English */}
          <FormField label="Book Title (English)">
            <input
              type="text"
              value={form.title_en}
              onChange={(e) => handleChange('title_en', e.target.value)}
              placeholder="Book title in English..."
              style={styles.input}
            />
          </FormField>

          {/* Author */}
          <FormField
            label="Author Name"
            required
            error={errors.author}
          >
            <input
              type="text"
              value={form.author}
              onChange={(e) => handleChange('author', e.target.value)}
              placeholder="\u09B2\u09C7\u0996\u0995\u09C7\u09B0 \u09A8\u09BE\u09AE..."
              style={styles.input}
              dir="auto"
              aria-invalid={!!errors.author}
            />
          </FormField>

          {/* Year */}
          <FormField label="Publication Year (approx)">
            <input
              type="text"
              value={form.year}
              onChange={(e) => handleChange('year', e.target.value)}
              placeholder="e.g. 1905"
              style={{ ...styles.input, maxWidth: 180 }}
              inputMode="numeric"
            />
          </FormField>

          {/* Reason */}
          <FormField
            label="Why do you want this book?"
            sublabel="optional"
            error={errors.reason}
          >
            <textarea
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Tell us why this book matters to you..."
              style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
              maxLength={MAX_REASON_CHARS}
              rows={3}
            />
            <div style={styles.charCount}>
              {form.reason.length}/{MAX_REASON_CHARS}
            </div>
          </FormField>

          {/* Name */}
          <FormField label="Your name" sublabel="optional">
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Anonymous if left blank"
              style={styles.input}
            />
          </FormField>

          {/* Honeypot — hidden from humans */}
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
            <label>
              Leave this blank
              <input
                type="text"
                value={form.honeypot}
                onChange={(e) => handleChange('honeypot', e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          {/* Error message */}
          {status === 'error' && errorMsg && (
            <div style={styles.errorBox} role="alert">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'submitting'}
            style={{
              ...styles.submitBtn,
              opacity: status === 'submitting' ? 0.6 : 1,
              cursor: status === 'submitting' ? 'wait' : 'pointer',
            }}
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit Request \u2192'}
          </button>
        </div>
      </form>

      <OpenRequestsPanel requests={requests} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormField — label + input wrapper
// ---------------------------------------------------------------------------
function FormField({ label, sublabel, required, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}> *required</span>}
        {sublabel && <span style={styles.sublabel}> ({sublabel})</span>}
      </label>
      {children}
      {error && <div style={styles.fieldError} role="alert">{error}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OpenRequestsPanel — list of open GitHub Issues
// ---------------------------------------------------------------------------
function OpenRequestsPanel({ requests }) {
  if (!requests || requests.length === 0) {
    return (
      <div style={styles.panelSection}>
        <div style={styles.panelDivider}></div>
        <h3 style={styles.panelTitle}>Open Requests</h3>
        <p style={styles.panelEmpty}>
          No open requests yet. Be the first to suggest a book!
        </p>
      </div>
    );
  }

  return (
    <div style={styles.panelSection}>
      <div style={styles.panelDivider}></div>
      <h3 style={styles.panelTitle}>Open Requests</h3>
      <div style={styles.requestList}>
        {requests.map((issue) => {
          // Parse title: "Book Request: [Title] — [Author]"
          const displayTitle = issue.title
            .replace(/^Book Request:\s*/i, '')
            .trim();

          // Check for status labels
          const hasInProgress = issue.labels?.some(l =>
            l.name === 'in-progress' || l.name === 'in progress'
          );
          const statusLabel = hasInProgress ? 'IN PROGRESS' : 'OPEN';
          const statusColor = hasInProgress ? '#4ade80' : 'var(--gold)';

          return (
            <a
              key={issue.id}
              href={issue.html_url !== '#' ? issue.html_url : undefined}
              target={issue.html_url !== '#' ? '_blank' : undefined}
              rel={issue.html_url !== '#' ? 'noopener' : undefined}
              style={styles.requestRow}
            >
              <div style={styles.requestTitle}>
                {displayTitle}
              </div>
              <div style={styles.requestMeta}>
                {issue.isPending ? (
                  <span style={styles.pendingBadge}>Just submitted</span>
                ) : (
                  <span style={styles.thumbCount}>
                    {issue.reactions?.['+1'] || 0} &#128077;
                  </span>
                )}
                <span style={{ ...styles.statusBadge, color: statusColor, borderColor: statusColor }}>
                  {issue.isPending ? 'PENDING' : statusLabel}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  formCard: {
    position: 'relative',
    border: '1px solid var(--border)',
    padding: '32px',
    maxWidth: 560,
    margin: '0 auto',
  },
  field: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    color: 'var(--gold)',
    letterSpacing: '0.06em',
    marginBottom: 8,
    fontWeight: 400,
  },
  required: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    fontWeight: 400,
  },
  sublabel: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    fontWeight: 400,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    lineHeight: 1.6,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  charCount: {
    fontSize: '0.68rem',
    color: 'var(--text-dim)',
    textAlign: 'right',
    marginTop: 4,
    letterSpacing: '0.04em',
  },
  fieldError: {
    fontSize: '0.75rem',
    color: '#e25555',
    marginTop: 6,
  },
  errorBox: {
    padding: '12px 16px',
    background: 'rgba(226,85,85,0.08)',
    border: '1px solid rgba(226,85,85,0.2)',
    color: '#e25555',
    fontSize: '0.82rem',
    lineHeight: 1.6,
    marginBottom: 20,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    background: 'var(--gold)',
    color: 'var(--bg)',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: 44,
  },
  successBox: {
    textAlign: 'center',
    padding: '40px 24px',
    border: '1px solid var(--border)',
    maxWidth: 480,
    margin: '0 auto',
  },
  successIcon: {
    fontSize: '2rem',
    color: '#4ade80',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: '1.1rem',
    color: 'var(--gold-light)',
    fontWeight: 400,
    marginBottom: 12,
  },
  successText: {
    fontSize: '0.85rem',
    color: 'var(--text-dim)',
    lineHeight: 1.7,
    marginBottom: 24,
  },
  rateLimitBox: {
    textAlign: 'center',
    padding: '32px 24px',
    border: '1px solid rgba(226,85,85,0.2)',
    background: 'rgba(226,85,85,0.04)',
    maxWidth: 480,
    margin: '0 auto',
  },
  rateLimitText: {
    fontSize: '0.88rem',
    color: 'var(--text)',
    lineHeight: 1.7,
  },
  panelSection: {
    marginTop: 48,
    maxWidth: 560,
    margin: '48px auto 0',
  },
  panelDivider: {
    width: 60,
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
    margin: '0 auto 24px',
  },
  panelTitle: {
    fontSize: '0.85rem',
    letterSpacing: '0.15em',
    color: 'var(--gold)',
    textTransform: 'uppercase',
    fontWeight: 400,
    textAlign: 'center',
    marginBottom: 24,
  },
  panelEmpty: {
    textAlign: 'center',
    fontSize: '0.82rem',
    color: 'var(--text-dim)',
    fontStyle: 'italic',
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  requestRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: '1px solid var(--border)',
    background: 'var(--bg-panel)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.2s, background 0.2s',
    gap: 12,
    minHeight: 44,
  },
  requestTitle: {
    fontSize: '0.85rem',
    color: 'var(--text)',
    flex: 1,
    lineHeight: 1.4,
  },
  requestMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  thumbCount: {
    fontSize: '0.75rem',
    color: 'var(--text-dim)',
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    fontWeight: 600,
    padding: '3px 8px',
    border: '1px solid',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  pendingBadge: {
    fontSize: '0.68rem',
    color: '#4ade80',
    fontStyle: 'italic',
  },
};
