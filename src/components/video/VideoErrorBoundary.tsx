import { Component, type ReactNode } from "react";

/**
 * Keeps a crash inside the video setup dialog local to the dialog.
 * Without this, a throw here bubbles to the root route error component
 * and takes the whole app down with "Something didn't load."
 */
export class VideoErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[video] dialog crashed", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
        role="alertdialog"
        aria-label="Video setup problem"
      >
        <div className="w-full max-w-[400px] rounded-[20px] border border-line bg-raised p-5 text-center">
          <p className="text-[16px] font-medium text-ink">Video setup didn't open.</p>
          <p className="mt-1 text-[13px] text-muted">
            Nothing was charged. Close this and try again in a moment.
          </p>
          <button
            onClick={() => {
              this.setState({ failed: false });
              this.props.onClose();
            }}
            className="mt-4 h-11 w-full rounded-[12px] bg-primary text-[15px] font-medium text-primary-foreground"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
}
