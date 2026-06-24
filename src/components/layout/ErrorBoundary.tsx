/**
 * ErrorBoundary — Catch React render errors gracefully
 * Spec 13: "mọi lỗi hiện thân thiện, không crash"
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <div className="p-3 rounded-2xl bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-semibold mb-1">Đã xảy ra lỗi</h2>
            <p className="text-xs text-muted-foreground max-w-md">
              {this.state.error?.message || 'Lỗi không xác định'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium
              hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
