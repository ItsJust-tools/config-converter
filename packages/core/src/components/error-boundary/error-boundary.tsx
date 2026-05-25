import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Tool component crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                Something went wrong.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Please refresh the page to continue.
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
