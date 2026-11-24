import { useEffect, useRef, useState } from 'react';
import { CONTAINERS, ContainerId, ME, PEOPLE, SUNDAY, TODAY_DAY, containerName, siteLabel } from '../data';
import { commentsFor, photoTarget, useStore } from '../store';
import { fmtWhen } from '../util';
import { Icon } from '../components/bits';
import PhotoArt from '../components/PhotoArt';

type F = 'all' | 'home' | 'grandma' | 'new';

export default function Photos() {
  const s = useStore();
  const [f, setF] = useState<F>('all');
  const [pending, setPending] = useState<{ src: string; name: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [tub, setTub] = useState<ContainerId | ''>('');
  const file = useRef<HTMLInputElement>(null);

  const sorted = [...s.photos].sort((a, b) => b.at.getTime() - a.at.getTime());
  const shown = sorted.filter((p) => (f === 'all' ? true : f === 'new' ? p.at >= SUNDAY : p.site === f));
  const counts = {
    all: s.photos.length,
    home: s.photos.filter((p) => p.site === 'home').length,
    grandma: s.photos.filter((p) => p.site === 'grandma').length,
    new: s.photos.filter((p) => p.at >= SUNDAY).length,
  };
  const selected = s.target?.photoId;

  useEffect(() => {
    if (s.focus.photoId) {
      const p = s.photos.find((x) => x.id === s.focus.photoId);
      if (p) s.open(photoTarget(p));
      document.getElementById('ph-' + s.focus.photoId)?.scrollIntoView({ block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focus.nonce]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Photo log</div>
          <h1>Photos</h1>
          <p className="lede">Photos back up the numbers. A picture of the scale display is the easiest way to double-check a reading.</p>
        </div>
        <button className="btn btn-primary" onClick={() => file.current?.click()}>
          <Icon name="upload" size={15} /> Add a photo
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const fl = e.target.files?.[0];
            if (fl) {
              setPending({ src: URL.createObjectURL(fl), name: fl.name });
              setCaption('');
            }
            e.target.value = '';
          }}
        />
      </div>

      {pending && (
        <div className="card upload">
          <img src={pending.src} alt="" />
          <div className="upload-f">
            <label>
              Caption
              <input autoFocus value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What does this photo show?" />
            </label>
            <label>
              Tub
              <select value={tub} onChange={(e) => setTub(e.target.value as ContainerId)}>
                <option value="">Not a specific tub</option>
                {CONTAINERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {siteLabel(c)} · {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="addform-foot">
              <button className="btn btn-ghost" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!caption.trim()}
                onClick={() => {
                  const c = CONTAINERS.find((x) => x.id === tub);
                  s.addPhoto({ day: TODAY_DAY, site: c?.site ?? 'home', container: c?.id, caption: caption.trim(), art: { kind: 'tub', seed: 99 }, src: pending.src });
                  setPending(null);
                  setTub('');
                }}
              >
                Add photo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chips" style={{ marginBottom: 16 }}>
        {(
          [
            ['all', 'All'],
            ['new', 'Since Sunday'],
            ['home', 'Home'],
            ['grandma', 'Grandma’s'],
          ] as [F, string][]
        ).map(([k, l]) => (
          <button key={k} className={'chip' + (f === k ? ' chip-on chip-dark' : '')} onClick={() => setF(k)}>
            {l} <span className="count">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="pgrid">
        {shown.map((p) => {
          const n = commentsFor(s.comments, `photo:${p.id}`).length;
          return (
            <button id={'ph-' + p.id} key={p.id} className={'pcard' + (selected === p.id ? ' on' : '')} onClick={() => s.open(photoTarget(p))}>
              <div className="pimg">
                <PhotoArt photo={p} />
                {p.at >= SUNDAY && <span className="new-dot">New</span>}
                {n > 0 && (
                  <span className="pc-count">
                    <Icon name="chat" size={12} /> {n}
                  </span>
                )}
              </div>
              <div className="pcap">{p.caption}</div>
              <div className="pmeta">
                Day {p.day} · {p.container ? containerName(p.container) : p.site === 'home' ? 'Home' : 'Grandma’s'}
              </div>
              <div className="pmeta">
                <span style={{ color: PEOPLE[p.by].color }}>{p.by === ME ? 'You' : PEOPLE[p.by].short}</span> · {fmtWhen(p.at)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
