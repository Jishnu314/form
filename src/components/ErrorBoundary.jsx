import React from "react";

// Catches any render-time crash and shows the actual error message
// instead of a silent white screen — makes future debugging much easier.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "24px", fontFamily: "sans-serif", maxWidth: "560px", margin: "0 auto" }}>
          <h2 style={{ color: "#8f2c2c" }}>Something went wrong</h2>
          <p>The app hit an error while loading. Details:</p>
          <pre
            style={{
              background: "#f6f1e6",
              border: "1px solid #d9c9a3",
              borderRadius: "8px",
              padding: "12px",
              whiteSpace: "pre-wrap",
              fontSize: "12.5px",
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#142240",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
