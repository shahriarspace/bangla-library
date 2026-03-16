import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'bl_consent_v1';
const CONSENT_VERSION = 1;
const BANNER_DELAY = 4000; // 4 seconds

const defaultConsent = {
  version: CONSENT_VERSION,
  timestamp: '',
  decided: false,
  categories: {
    necessary: true,
    functional: false,
    analytics: false,
  },
};

function getStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(consent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {}
}

/**
 * ConsentManager — GDPR consent banner + preferences modal.
 * Mount in Base.astro as: <ConsentManager client:load privacyUrl="/privacy" />
 */
export default function ConsentManager({ privacyUrl = '/privacy', cfBeaconToken = '' }) {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [consent, setConsent] = useState(() => getStoredConsent() || defaultConsent);
  const [draft, setDraft] = useState(() => ({ ...consent.categories }));
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Show banner after delay if not yet decided
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored?.decided) {
      // Already decided — inject scripts as needed
      injectAnalytics(stored, cfBeaconToken);
      return;
    }
    const timer = setTimeout(() => setShowBanner(true), BANNER_DELAY);
    return () => clearTimeout(timer);
  }, [cfBeaconToken]);

  // Listen for external "open preferences" event (footer link)
  useEffect(() => {
    const handler = () => openModal();
    document.addEventListener('bl:open-prefs', handler);
    return () => document.removeEventListener('bl:open-prefs', handler);
  }, []);

  // Focus trap in modal
  useEffect(() => {
    if (!showModal || !modalRef.current) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = modalRef.current.querySelectorAll(
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
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const acceptAll = useCallback(() => {
    const c = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      decided: true,
      categories: { necessary: true, functional: true, analytics: true },
    };
    saveConsent(c);
    setConsent(c);
    setShowBanner(false);
    setShowModal(false);
    injectAnalytics(c, cfBeaconToken);
  }, [cfBeaconToken]);

  const rejectAll = useCallback(() => {
    const c = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      decided: true,
      categories: { necessary: true, functional: false, analytics: false },
    };
    saveConsent(c);
    setConsent(c);
    setShowBanner(false);
    setShowModal(false);
  }, []);

  const savePreferences = useCallback(() => {
    const c = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      decided: true,
      categories: { necessary: true, functional: draft.functional, analytics: draft.analytics },
    };
    saveConsent(c);
    setConsent(c);
    setShowBanner(false);
    setShowModal(false);
    injectAnalytics(c, cfBeaconToken);
  }, [draft, cfBeaconToken]);

  const openModal = useCallback(() => {
    previousFocusRef.current = document.activeElement;
    setDraft({ ...consent.categories });
    setShowModal(true);
    // Focus modal after render
    setTimeout(() => modalRef.current?.focus(), 50);
  }, [consent.categories]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setDraft({ ...consent.categories });
    previousFocusRef.current?.focus?.();
  }, [consent.categories]);

  const toggleDraft = useCallback((key) => {
    if (key === 'necessary') return; // Cannot disable
    setDraft(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const categories = [
    {
      id: 'necessary',
      label: 'Strictly Necessary',
      labelBn: 'অপরিহার্য',
      desc: 'Consent preferences, session state',
      locked: true,
    },
    {
      id: 'functional',
      label: 'Functional',
      labelBn: 'কার্যকরী',
      desc: 'Reading preferences (font size, view mode), reading progress',
      locked: false,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      labelBn: 'বিশ্লেষণ',
      desc: 'Cookieless page views via Cloudflare Web Analytics',
      locked: false,
    },
  ];

  return (
    <>
      {/* Banner */}
      {showBanner && (
        <div className="consent-banner" role="alert" aria-live="polite">
          <div className="consent-banner-inner">
            <div className="consent-text">
              <strong lang="bn">আমরা আপনার গোপনীয়তাকে সম্মান করি</strong>
              <br />
              <strong>We respect your privacy.</strong>
              <span className="consent-detail">
                {' '}We use localStorage for reading preferences. No cookies.{' '}
                <a href={privacyUrl}>Privacy Policy</a>
              </span>
            </div>
            <div className="consent-actions">
              <button className="consent-btn consent-btn-primary" onClick={acceptAll}>
                Accept All
              </button>
              <button className="consent-btn consent-btn-outline" onClick={rejectAll}>
                Reject Non-Essential
              </button>
              <button className="consent-btn consent-btn-text" onClick={openModal}>
                Manage Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showModal && (
        <div className="consent-overlay" onClick={closeModal}>
          <div
            className="consent-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prefs-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal} aria-label="Close">
              &times;
            </button>
            <h2 id="prefs-title" className="modal-title">
              Privacy Preferences
            </h2>
            <p className="modal-subtitle">
              Choose which data categories you allow. Strictly Necessary is always on.
            </p>

            <div className="pref-list">
              {categories.map(cat => (
                <div key={cat.id} className="pref-item">
                  <div className="pref-info">
                    <div className="pref-label">
                      {cat.label} <span className="pref-label-bn" lang="bn">{cat.labelBn}</span>
                    </div>
                    <div className="pref-desc">{cat.desc}</div>
                  </div>
                  <button
                    className={`toggle ${draft[cat.id] ? 'toggle-on' : 'toggle-off'} ${cat.locked ? 'toggle-locked' : ''}`}
                    role="switch"
                    aria-checked={draft[cat.id]}
                    aria-label={`${cat.label}: ${draft[cat.id] ? 'enabled' : 'disabled'}`}
                    disabled={cat.locked}
                    onClick={() => toggleDraft(cat.id)}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="consent-btn consent-btn-primary" onClick={savePreferences}>
                Save Preferences
              </button>
              <button className="consent-btn consent-btn-outline" onClick={acceptAll}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Banner */
        .consent-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: #1c1812;
          border-top: 2px solid rgba(200,160,80,0.4);
          animation: slideUp 0.35s ease-out;
        }
        .consent-banner-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .consent-text {
          font-size: 0.85rem;
          color: #d4b87a;
          line-height: 1.6;
          flex: 1;
        }
        .consent-text a {
          color: #c8a050;
          text-decoration: underline;
        }
        .consent-detail {
          font-size: 0.78rem;
          color: #8a7050;
        }
        .consent-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          align-items: center;
        }
        .consent-btn {
          padding: 10px 18px;
          font-size: 0.78rem;
          border: none;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.04em;
          min-height: 44px;
          transition: all 0.2s;
        }
        .consent-btn-primary {
          background: #c8a050;
          color: #1c1812;
          font-weight: 600;
        }
        .consent-btn-primary:hover {
          background: #f0dfa0;
        }
        .consent-btn-outline {
          background: transparent;
          border: 1px solid #c8a050;
          color: #c8a050;
        }
        .consent-btn-outline:hover {
          background: rgba(200,160,80,0.1);
        }
        .consent-btn-text {
          background: transparent;
          color: #8a7050;
          text-decoration: underline;
          padding: 10px 8px;
        }
        .consent-btn-text:hover {
          color: #c8a050;
        }

        /* Modal overlay */
        .consent-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        .consent-modal {
          background: #1c1812;
          border: 1px solid rgba(200,160,80,0.3);
          max-width: 520px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          position: relative;
          outline: none;
        }
        .modal-close {
          position: absolute;
          top: 12px;
          right: 16px;
          background: none;
          border: none;
          color: #8a7050;
          font-size: 1.5rem;
          cursor: pointer;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-close:hover {
          color: #f0dfa0;
        }
        .modal-title {
          font-size: 1.1rem;
          color: #f0dfa0;
          font-weight: 400;
          margin-bottom: 8px;
        }
        .modal-subtitle {
          font-size: 0.8rem;
          color: #8a7050;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        /* Preference items */
        .pref-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }
        .pref-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid rgba(200,160,80,0.1);
        }
        .pref-info { flex: 1; }
        .pref-label {
          font-size: 0.85rem;
          color: #d4b87a;
          margin-bottom: 4px;
        }
        .pref-label-bn {
          font-size: 0.78rem;
          color: #8a7050;
          margin-left: 8px;
        }
        .pref-desc {
          font-size: 0.72rem;
          color: #6a5030;
          line-height: 1.5;
        }

        /* Toggle switch */
        .toggle {
          width: 44px;
          height: 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
          padding: 0;
        }
        .toggle-on {
          background: #c8a050;
        }
        .toggle-off {
          background: #3a3020;
        }
        .toggle-locked {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .toggle-knob {
          position: absolute;
          top: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f0dfa0;
          transition: left 0.2s;
        }
        .toggle-on .toggle-knob {
          left: 22px;
        }
        .toggle-off .toggle-knob {
          left: 2px;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        /* Animations */
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .consent-banner-inner {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
          }
          .consent-actions {
            flex-direction: column;
          }
          .consent-btn {
            width: 100%;
            text-align: center;
          }
          .consent-modal {
            padding: 24px 20px;
          }
          .modal-actions {
            flex-direction: column;
          }
          .modal-actions .consent-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}

/** Inject Cloudflare Web Analytics if consent is granted */
function injectAnalytics(consent, token) {
  if (!consent?.categories?.analytics || !token) return;
  if (document.querySelector('script[data-cf-beacon]')) return; // Already injected
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.cfBeacon = JSON.stringify({ token });
  document.head.appendChild(script);
}
