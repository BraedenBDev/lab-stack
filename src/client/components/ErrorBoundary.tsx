import { Component, type ReactNode } from "react";
import { reportError } from "@/shared/report";

/**
 * Catches render-time crashes so a bug shows a recoverable screen instead of a
 * blank white page, and routes the error through the shared reporting seam.
 * Error boundaries must be class components — this is the one in the stack.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    reportError(error, { componentStack: info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Inline styles on purpose: must render even if the CSS bundle failed.
    return (
      <div style={{ maxWidth: 480, margin: "15vh auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#111" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h1>
        <p style={{ color: "#666", margin: "0 0 20px", lineHeight: 1.5 }}>
          An unexpected error occurred. Try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: "#111", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          Reload
        </button>
      </div>
    );
  }
}
