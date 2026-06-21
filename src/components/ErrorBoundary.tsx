import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
            <p className="text-gray-500 mb-6 font-medium">시스템 처리 중 예상치 못한 문제가 발생했습니다. 페이지를 새로고침 해주세요.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
