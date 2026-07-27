import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PageErrorBoundary]', error.message, errorInfo.componentStack);
    if (window.__SENTRY__) {
      window.__SENTRY__.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
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
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
