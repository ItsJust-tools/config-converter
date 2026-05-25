import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
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
            <circle cx="14" cy="14" r="11" />
            <path d="M9.5 9.5l9 9M18.5 9.5l-9 9" />
          </svg>
        </div>
        <h1>Page not found</h1>
        <p>The page you are looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="error-btn-primary">
          Go home
        </Link>
      </div>
    </div>
  );
}
