export default function Banner({ kind = "info", onDismiss, children }) {
  return (
    <div
      className={`banner ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span>{children}</span>

      <button type="button" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
