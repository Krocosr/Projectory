'use client';
import { Component } from 'react';
import PropTypes from 'prop-types';
import { captureChunkError } from '@/lib/clientLogger';

function isChunkError(error) {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk.*failed/i.test(error.message) ||
    /Loading CSS chunk.*failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message)
  );
}

function extractChunkUrl(error) {
  const m = error.message.match(/https?:\/\/[^\s"']+/);
  return m ? m[0] : null;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false, chunkUrl: null, retryCount: 0 };
    this.retryTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkError(error), chunkUrl: extractChunkUrl(error) };
  }

  componentDidCatch(error, errorInfo) {
    const chunkUrl = extractChunkUrl(error);
    if (isChunkError(error)) {
      captureChunkError(error, chunkUrl);
    }

    console.error('ErrorBoundary caught an error:', { // eslint-disable-line no-console
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      context: this.props.context || 'Unknown',
      isChunkError: isChunkError(error),
      chunkUrl,
    });
    this.setState({ error, errorInfo });
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false, chunkUrl: null, retryCount: 0 });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleRetry = () => {
    const retryCount = this.state.retryCount + 1;
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false, chunkUrl: null, retryCount });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleHardReload = () => {
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('projectory_restore_path', currentPath);
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('projectory_restore_path', currentPath);
    window.location.reload();
  };

  static propTypes = {
    children: PropTypes.node,
    context: PropTypes.string,
    errorMessage: PropTypes.string,
    fallback: PropTypes.func,
    onReset: PropTypes.func,
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, {
          reset: this.handleReset,
          retry: this.handleRetry,
          hardReload: this.handleHardReload,
          clearCacheAndReload: this.handleClearCacheAndReload,
          isChunkError: this.state.isChunkError,
          chunkUrl: this.state.chunkUrl,
        });
      }

      if (this.state.isChunkError) {
        return (
          <div className="min-h-[320px] bg-[var(--bg-card)] rounded-2xl border border-amber-500/20 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Failed to load module</h3>
            <p className="text-sm text-[var(--text-muted)] mb-1 max-w-sm">
              A part of the app failed to load — likely a stale cached file after a deployment.
            </p>
            {this.state.chunkUrl && (
              <p className="text-xs text-[var(--text-muted)] mb-4 max-w-sm truncate w-full font-mono">
                {this.state.chunkUrl}
              </p>
            )}
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent-clay)] hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
              <button
                onClick={this.handleHardReload}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:opacity-90 transition-opacity"
              >
                Reload &amp; Restore
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:opacity-90 transition-opacity"
              >
                Clear Cache &amp; Reload
              </button>
            </div>
          </div>
        );
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
