'use client';
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      context: this.props.context || 'Unknown',
    });
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 min-h-[220px] flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4 text-center max-w-xs">
            {this.props.errorMessage || 'An unexpected error occurred while loading this component.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent-clay)] hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
