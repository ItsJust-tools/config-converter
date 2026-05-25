'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-icon">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 3L25 24H3L14 3z" />
            <path d="M14 10v6" />
            <circle cx="14" cy="20" r="0.5" fill="currentColor" />
          </svg>
        </div>
        <h1>Something went wrong</h1>
        <p>{error.message || 'An unexpected error occurred.'}</p>
        <div className="error-actions">
          <button onClick={reset} className="error-btn-primary">
            Try again
          </button>
          <Link href="/" className="error-btn-secondary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
