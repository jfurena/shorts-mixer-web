import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props { children?: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null };
  public static getDerivedStateFromError(error: Error): State { return { hasError: true, error, errorInfo: null }; }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: 'red', height: '100vh', overflow: 'auto' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Click for error details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
