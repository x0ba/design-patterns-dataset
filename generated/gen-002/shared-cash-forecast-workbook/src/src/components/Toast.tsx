import { useApp } from '../ctx';

export function Toast() {
  const { s } = useApp();
  if (!s.toast) return null;
  return (
    <div className="toast" key={s.toast.id} role="status">
      {s.toast.text}
    </div>
  );
}
