import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render crash:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, background: '#F8F9FA', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#041627', margin: 0 }}>Something went wrong</h1>
          <pre style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#b91c1c', maxWidth: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#1066b1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
