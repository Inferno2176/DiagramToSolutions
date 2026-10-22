import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-surface">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 border border-red-200 shadow-[0_4px_20px_rgba(46,50,48,0.06)] text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-[#FCE8E7] border border-red-200 text-[#A82826] flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-headline font-bold text-[#242820]">Something went wrong</h2>
              <p className="text-sm text-[#73766F] mt-2 leading-relaxed">
                An unexpected UI rendering issue occurred. Your analysis data and OCR results in the backend remain safe.
              </p>
              {this.state.error && (
                <div className="mt-4 bg-[#f5f1ea] border border-[#E5E1D8] rounded-xl p-3 text-left font-mono text-xs text-[#A82826] overflow-x-auto max-h-32">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white font-semibold flex items-center gap-2 text-xs shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  if (this.props.navigateTo) this.props.navigateTo("dashboard");
                  else window.location.href = "/";
                }}
                className="px-4 py-2 rounded-xl bg-white border border-[#E5E1D8] hover:bg-[#F2EFE7] text-[#242820] font-semibold flex items-center gap-2 text-xs shadow-xs transition-all"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
