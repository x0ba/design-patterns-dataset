export default function Loading() {
  return (
    <div className="loading" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-strip" />
      <div className="skeleton skeleton-block" />
    </div>
  );
}
