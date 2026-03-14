import { useState, useEffect, useCallback } from 'react';

/**
 * Standalone Like/Heart button that displays reaction counts from Giscus
 * (GitHub Discussions) and scrolls to the comment section when clicked.
 *
 * Giscus emits metadata via postMessage when data-emit-metadata="1" is set.
 * The message shape is: { giscus: { discussion: { totalReactionCount, reactionCount, reactions, ... } } }
 */
export default function LikeButton() {
  const [count, setCount] = useState(null);
  const [animate, setAnimate] = useState(false);

  // Listen for Giscus metadata messages
  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== 'https://giscus.app') return;

      const data = event.data;
      if (!data || !data.giscus || !data.giscus.discussion) return;

      const discussion = data.giscus.discussion;
      // totalReactionCount includes all reaction types on the discussion
      const total = discussion.totalReactionCount;
      if (typeof total === 'number') {
        setCount(prev => {
          // Animate if count increased
          if (prev !== null && total > prev) {
            setAnimate(true);
            setTimeout(() => setAnimate(false), 600);
          }
          return total;
        });
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleClick = useCallback(() => {
    const section = document.getElementById('giscus-comments');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Pulse animation on click
    setAnimate(true);
    setTimeout(() => setAnimate(false), 600);
  }, []);

  return (
    <button
      className={`like-button${animate ? ' like-button--pulse' : ''}`}
      onClick={handleClick}
      title="React to this book — click to scroll to comments"
      aria-label={`Like this book${count !== null ? `, ${count} reaction${count !== 1 ? 's' : ''}` : ''}`}
      type="button"
    >
      <svg
        className="like-button__heart"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count !== null && (
        <span className="like-button__count">{count}</span>
      )}
    </button>
  );
}
