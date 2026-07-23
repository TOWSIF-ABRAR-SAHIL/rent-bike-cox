import { Component } from 'react';
import { RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="text-center glass rounded-2xl p-8 max-w-md">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>An unexpected error occurred.</p>
            <button onClick={() => window.location.reload()} className="btn-primary flex items-center mx-auto">
              <RefreshCw size={16} className="mr-2" /> Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
