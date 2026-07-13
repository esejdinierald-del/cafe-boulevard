import { Component, ReactNode } from "react";
import { logCritical } from "@/lib/error-logger";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
    logCritical(error.message || "ErrorBoundary caught", {
      stack: error.stack,
      componentStack: (info as { componentStack?: string })?.componentStack,
    });
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold">Diçka nuk shkoi mirë</h1>
            <p className="text-slate-400 text-sm break-words">
              {this.state.error.message || "Gabim i papritur."}
            </p>
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
            >
              Kthehu në fillim
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}