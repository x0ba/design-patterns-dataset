import { useEffect, useState } from 'react';
import { newId, useStore } from '../store';
import { Icon } from '../util';

export function RepliesView() {
  const { s, d } = useStore();
  const [sel, setSel] = useState<string | null>(s.replies[0]?.id ?? null);
  const current = s.replies.find((r) => r.id === sel);
  const [title, setTitle] = useState(current?.title ?? '');
  const [body, setBody] = useState(current?.body ?? '');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    setTitle(current?.title ?? '');
    setBody(current?.body ?? '');
    setConfirmDel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const dirty = current ? title !== current.title || body !== current.body : false;

  const create = () => {
    const id = newId('sr');
    d({ type: 'replyUpsert', reply: { id, title: 'New saved reply', body: 'Hi {first_name}, ', uses: 0 } });
    setSel(id);
  };

  return (
    <section className="page replies-page">
      <header className="page-head">
        <div>
          <h1>Saved replies</h1>
          <div className="page-sub">Insert from any conversation’s composer. {'{first_name}'} and {'{show}'} fill in automatically; anything else in braces must be filled before sending.</div>
        </div>
        <button className="btn primary" onClick={create}><Icon name="plus" size={15} /> New reply</button>
      </header>
      <div className="replies">
        <ul className="reply-list">
          {s.replies.map((r) => (
            <li key={r.id}>
              <button className={`reply-item ${sel === r.id ? 'active' : ''}`} onClick={() => setSel(r.id)}>
                <b>{r.title}</b>
                <span>{r.body.replace(/\s+/g, ' ')}</span>
                <em>Used {r.uses} {r.uses === 1 ? 'time' : 'times'}</em>
              </button>
            </li>
          ))}
        </ul>
        {current ? (
          <div className="reply-editor">
            <label className="mini-label" htmlFor="rtitle">Name</label>
            <input id="rtitle" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="mini-label" htmlFor="rbody">Message</label>
            <textarea id="rbody" className="input" rows={16} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="placeholders">
              Insert:
              {['{first_name}', '{show}', '{when}'].map((p) => (
                <button key={p} className="chip btnchip" onClick={() => setBody((b) => b + p)}>{p}</button>
              ))}
            </div>
            <div className="row-end">
              {confirmDel ? (
                <>
                  <span className="muted">Delete “{current.title}”?</span>
                  <button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Keep</button>
                  <button className="btn danger sm" onClick={() => {
                    d({ type: 'replyDelete', id: current.id });
                    setSel(s.replies.find((r) => r.id !== current.id)?.id ?? null);
                  }}>Delete</button>
                </>
              ) : (
                <button className="btn ghost sm" onClick={() => setConfirmDel(true)}><Icon name="trash" size={14} /> Delete</button>
              )}
              <span className="flex1" />
              <button className="btn ghost" disabled={!dirty} onClick={() => { setTitle(current.title); setBody(current.body); }}>Discard</button>
              <button className="btn primary" disabled={!dirty || !title.trim() || !body.trim()} onClick={() => {
                d({ type: 'replyUpsert', reply: { ...current, title: title.trim(), body } });
                d({ type: 'toast', text: 'Saved reply updated' });
              }}>Save</button>
            </div>
          </div>
        ) : (
          <div className="reply-editor empty">No saved replies yet.</div>
        )}
      </div>
    </section>
  );
}
