"use client";

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SentryWindow extends Window {
  __SENTRY__?: {
    captureException: (error: Error, context?: Record<string, unknown>) => void;
  };
}

export interface PageErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[PageErrorBoundary]', error.message, errorInfo.componentStack);
    const sentry = (window as unknown as SentryWindow).__SENTRY__;
    if (sentry) {
      sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-4">
          <div className="text-center glass rounded-2xl p-6 max-w-sm w-full">
            <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: 'var(--warning-text, #f59e0b)' }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Page Error
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {this.props.fallbackMessage || 'Something went wrong loading this page.'}
            </p>
            <button onClick={this.handleRetry} className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">
              <RefreshCw size={14} /> Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs cursor-pointer font-mono" style={{ color: 'var(--text-muted)' }}>
                  Error detail (dev only)
                </summary>
                <pre className="mt-2 p-2 rounded-lg text-[11px] font-mono overflow-auto max-h-40" style={{ background: 'var(--input-bg)', color: 'var(--danger-text)' }}>
                  {String(this.state.error?.message || this.state.error)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
