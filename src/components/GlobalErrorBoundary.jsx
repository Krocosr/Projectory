'use client';
import { Component } from 'react';
import PropTypes from 'prop-types';

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GlobalErrorBoundary] Fatal error:', error, errorInfo); // eslint-disable-line no-console
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <html lang="en">
          {/* eslint-disable-next-line @next/next/no-head-element */}
          <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Deadliner — Error</title>
            <style>{`
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; background: #0f0e0d; color: #d1cbc5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              .container { text-align: center; padding: 2rem; max-width: 480px; }
              .icon { width: 64px; height: 64px; margin: 0 auto 1.5rem; background: rgba(239,68,68,0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
              h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; color: #edebe9; }
              p { font-size: 0.875rem; color: #a39a94; margin-bottom: 2rem; line-height: 1.5; }
              .buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
              button { padding: 0.625rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; transition: opacity 0.15s; }
              button:hover { opacity: 0.85; }
              .reload { background: #D4815B; color: #fff; }
              .clear { background: #7f1d1d; color: #fff; }
            `}</style>
          </head>
          <body>
            <div className="container">
              <div className="icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h1>Something went wrong</h1>
              <p>The application crashed. This is usually caused by a stale cache after a deployment update.</p>
              <div className="buttons">
                <button className="reload" onClick={this.handleReload}>Reload &amp; Restore</button>
                <button className="clear" onClick={this.handleClearAndReload}>Clear Cache &amp; Reload</button>
              </div>
            </div>
          </body>
        </html>
      );
    }

    return this.props.children;
  }
}

GlobalErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export default GlobalErrorBoundary;
