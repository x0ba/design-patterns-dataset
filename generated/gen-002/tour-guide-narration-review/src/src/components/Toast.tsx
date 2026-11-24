import { useEffect } from 'react';
import { useApp } from '../App';

export default function Toast() {
  const { state, dispatch } = useApp();
  const t = state.toast;
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => dispatch({ type: 'clearToast' }), t.undo ? 5000 : 2400);
    return () => clearTimeout(h);
  }, [t, dispatch]);
  if (!t) return null;
  return (
    <div className="toast" role="status" key={t.id}>
      <span>{t.text}</span>
      {t.undo && (
        <button
          onClick={() => {
            dispatch(t.undo!);
            dispatch({ type: 'clearToast' });
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
