export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" key={toast.key}>
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          className="btn link"
          onClick={() => {
            toast.undo();
            onDismiss();
          }}
        >
          Undo
        </button>
      )}
      <button className="btn icon" onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </button>
    </div>
  );
}
