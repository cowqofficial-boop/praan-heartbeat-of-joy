import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-[9999] rounded-[12px] p-4 text-[13px]"
          style={{ background: "#2a0e14", color: "#FF2FA3", border: "1px solid #FF2FA3" }}
        >
          <p className="font-semibold">Something crashed{this.props.label ? ` in ${this.props.label}` : ""}.</p>
          <p className="mt-1 opacity-80">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => this.setState({ error: null })}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
