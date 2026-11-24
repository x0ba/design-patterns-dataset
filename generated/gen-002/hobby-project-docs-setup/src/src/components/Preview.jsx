import { useEffect, useRef } from 'react';

export default function Preview({ html, anchorJump, onNavigate, onBrokenRef }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !anchorJump) return;
    const target = body.querySelector(`[id="${CSS.escape(anchorJump.anchor)}"]`);
    if (target) body.scrollTo({ top: target.offsetTop - 16, behavior: 'smooth' });
  }, [anchorJump]);

  const handleClick = (event) => {
    const link = event.target.closest('a.xref');
    if (link) {
      event.preventDefault();
      onNavigate(link.dataset.slug, link.dataset.anchor || null);
      return;
    }
    const broken = event.target.closest('.xref-broken');
    if (broken) onBrokenRef(broken.dataset.target);
  };

  return (
    <section className="pane preview-pane">
      <div className="pane-head">
        <span className="pane-title">Preview</span>
        <span className="muted">How readers will see this page</span>
      </div>
      <div
        className="preview-body"
        ref={bodyRef}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
