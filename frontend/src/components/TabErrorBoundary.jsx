import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error(`[TabErrorBoundary:${this.props.name || 'unknown'}]`, error.message);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass rounded-2xl p-6 border text-center" style={{ borderColor: 'var(--border-base)' }}>
          <AlertTriangle size={24} className="mx-auto mb-2" style={{ color: 'var(--warning-text)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {this.props.fallbackTitle || 'Tab Error'}
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {this.props.fallbackMessage || 'This section encountered an error. Please try again.'}
          </p>
          <button onClick={this.handleRetry} className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default TabErrorBoundary;
