import { Component } from "react";
import { V2_KEY } from "../universe/schema";

// Reads the raw stored string on purpose: the in-memory universe may be what crashed the app.
function readRawBackup() {
  try {
    return window.localStorage.getItem(V2_KEY);
  } catch {
    return null;
  }
}

function backupFilename(now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `wwe-universe-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export default class ErrorBoundary extends Component {
  state = { failed: false, exportError: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("The app crashed:", error, info?.componentStack);
  }

  exportBackup = () => {
    const raw = readRawBackup();

    if (raw === null) return;

    let url;

    try {
      url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));

      const link = document.createElement("a");

      link.href = url;
      link.download = backupFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      this.setState({ exportError: false });
    } catch (error) {
      console.error("Backup export failed:", error);
      this.setState({ exportError: true });
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;

    const hasBackup = readRawBackup() !== null;

    return (
      <div className="error-fallback" role="alert">
        <h1>Something went wrong</h1>
        <p>
          The app hit an unexpected error. Your saved universe has not been
          changed. Export a backup before reloading if you want to be safe.
        </p>

        <div className="error-fallback-actions">
          <button
            type="button"
            onClick={this.exportBackup}
            disabled={!hasBackup}
            title={hasBackup ? undefined : "Nothing to export"}
          >
            Export backup
          </button>

          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>

        {!hasBackup && <p className="error-fallback-note">Nothing to export</p>}

        {this.state.exportError && (
          <p className="error-fallback-note">
            Export failed – try again or reload the page.
          </p>
        )}
      </div>
    );
  }
}
