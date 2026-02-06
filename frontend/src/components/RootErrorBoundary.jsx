import React from 'react';

/**
 * Catches runtime errors in the app tree and shows a fallback instead of a white screen.
 */
class RootErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const message = err?.message || '';
      const name = err?.name || 'Error';
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#0f172a',
            color: '#e2e8f0',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: 16, textAlign: 'center' }}>
            The app failed to load. Try refreshing the page.
          </p>
          {message && (
            <pre
              style={{
                maxWidth: '90%',
                overflow: 'auto',
                padding: 12,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                fontSize: 12,
                color: '#fca5a5',
                marginBottom: 16,
                textAlign: 'left',
              }}
            >
              {name}: {message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootErrorBoundary;
