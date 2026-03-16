import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// ReadCounter — Genuine reading engagement counter
// Only fires after 30 seconds of the reader being visible in viewport.
// Falls back to showing build-time count when no Worker is configured.
// ---------------------------------------------------------------------------

const MIN_READS_TO_SHOW = 10;
const READ_DELAY_MS = 30000; // 30 seconds

export default function ReadCounter({ slug, initialCount = 0, workerUrl = '' }) {
  const [count, setCount] = useState(initialCount);
  const [counted, setCounted] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    // Don't try to count if no worker or already counted
    if (!workerUrl || counted) return;
    if (!sentinelRef.current) return;

    let timer = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !counted) {
          // Start 30-second countdown
          timer = setTimeout(async () => {
            try {
              const res = await fetch(`${workerUrl}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
              });
              if (res.ok) {
                const data = await res.json();
                if (typeof data.count === 'number') {
                  setCount(data.count);
                }
              }
            } catch {
              // Fail silently — never break reading experience
            }
            setCounted(true);
          }, READ_DELAY_MS);
        } else {
          // Reader scrolled out of view — cancel the timer
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [slug, workerUrl, counted]);

  // Don't render anything if count is below threshold
  if (count < MIN_READS_TO_SHOW) {
    return <div ref={sentinelRef} style={{ display: 'inline' }} />;
  }

  return (
    <span
      ref={sentinelRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        letterSpacing: '0.06em',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {count.toLocaleString()} readers
    </span>
  );
}
