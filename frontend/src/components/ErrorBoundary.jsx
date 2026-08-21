import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl m-4">
          <h2 className="text-xl font-bold mb-4">Đã xảy ra lỗi giao diện!</h2>
          <p className="mb-2">Ứng dụng vừa gặp một lỗi nghiêm trọng. Dưới đây là chi tiết lỗi để kỹ thuật viên khắc phục:</p>
          <pre className="bg-rose-100 p-4 rounded text-sm overflow-x-auto">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded font-bold hover:bg-rose-700"
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
