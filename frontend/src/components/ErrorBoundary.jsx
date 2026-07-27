import { Component } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error.message, error.stack);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="text-center glass rounded-2xl p-8 max-w-md w-full">
            <div
              className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full"
              style={{ backgroundColor: 'var(--danger-bg, rgba(239,68,68,0.1))' }}
            >
              <AlertTriangle size={32} style={{ color: 'var(--danger-text, #ef4444)' }} />
            </div>

            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Something went wrong
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              An unexpected error occurred. Please try again or head back to the homepage.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button onClick={this.handleReset} className="btn-primary flex items-center gap-2" aria-label="Retry">
                <RefreshCw size={16} /> Try Again
              </button>
              <button onClick={this.handleGoHome} className="btn-ghost flex items-center gap-2" aria-label="Go to homepage">
                <Home size={16} /> Go Home
              </button>
            </div>

            {isDev && this.state.error && (
              <details className="mt-6 text-left">
                <summary
                  className="text-xs cursor-pointer select-none mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Error Details (Development)
                </summary>
                <div
                  className="rounded-lg p-4 text-xs font-mono overflow-auto max-h-48"
                  style={{ backgroundColor: 'var(--bg-secondary, #1a1a2e)', color: 'var(--danger-text, #ef4444)' }}
                >
                  <p className="mb-2 font-bold">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap opacity-80">{this.state.error.stack}</pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <pre className="whitespace-pre-wrap mt-2 opacity-60">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
