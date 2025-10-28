"use client";

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface WalletErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface WalletErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class WalletErrorBoundary extends Component<
  WalletErrorBoundaryProps,
  WalletErrorBoundaryState
> {
  constructor(props: WalletErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): WalletErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('Wallet Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="p-6 max-w-md mx-auto">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Wallet Connection Error
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Something went wrong with your wallet connection. This might be due to:
              </p>
            </div>

            <div className="text-left space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Wallet extension not installed or enabled</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Network connection issues</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Wallet locked or permissions denied</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Unsupported network or chain</span>
              </div>
            </div>

            {this.state.error && (
              <details className="text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="default"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              If the problem persists, please check your wallet settings or try a different browser.
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook for wallet error handling
export function useWalletErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Wallet Error:', error, errorInfo);
    
    // You can add additional error reporting here
    // e.g., send to error tracking service
    
    // Show user-friendly error message
    if (typeof window !== 'undefined') {
      // You can integrate with your toast system here
      console.warn('Wallet error occurred:', error.message);
    }
  }, []);

  return { handleError };
}

// Higher-order component for wallet error boundary
export function withWalletErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<WalletErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <WalletErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </WalletErrorBoundary>
  );

  WrappedComponent.displayName = `withWalletErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
