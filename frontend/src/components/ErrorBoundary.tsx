'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by React ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-xl p-6 border border-red-500/30 bg-red-950/10 text-white space-y-4">
          <div className="flex items-center space-x-3 text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h3 className="text-sm font-bold">{this.props.fallbackTitle || 'Component View Exception'}</h3>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed font-mono bg-gray-950/60 p-3 rounded-lg border border-gray-900">
            {this.state.error?.message || 'A JavaScript runtime error occurred while rendering this section.'}
          </p>

          <button
            onClick={this.handleReset}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Component State</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
