import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { KIOSKS, NODES, type Lang } from '../data/campus';
import { LANGS, STRINGS, fmt } from '../lib/i18n';
import { clock, formatPhone, maskPhone } from '../lib/format';
import { Icon } from './Icon';

export function Modal({ title, onClose, className, children, closeLabel }: { title: string; onClose: () => void; className: string; children: ReactNode; closeLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="xbtn" onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" size={30} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- text to phone ---------- */
export function SendModal({ lang, buildMessage, onClose }: { lang: Lang; buildMessage: (l: Lang) => string; onClose: () => void }) {
  const T = STRINGS[lang];
  const [digits, setDigits] = useState('');
  const [msgLang, setMsgLang] = useState<Lang>(lang);
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const valid = digits.length === 10;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sent) return;
      if (/^[0-9]$/.test(e.key)) setDigits((d) => (d.length < 10 ? d + e.key : d));
      else if (e.key === 'Backspace') setDigits((d) => d.slice(0, -1));
      else if (e.key === 'Enter' && digits.length === 10) go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const go = () => {
    if (!valid || sending) return;
    setSending(true);
    // No backend in this build: the send is simulated.
    window.setTimeout(() => {
      setSent(digits);
      setSending(false);
      setDigits('');
    }, 900);
  };

  return (
    <Modal title={T.sendTitle} onClose={onClose} className="sendm" closeLabel={T.close}>
      {sent ? (
        <div className="sent">
          <div className="tick"><Icon name="check" size={58} /></div>
          <h3>{T.sentTitle}</h3>
          <p>{fmt(T.sentBody, { phone: maskPhone(sent) })}</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn primary" onClick={onClose}>{T.done}</button>
            <button className="btn" onClick={() => setSent(null)}>{T.sendAnother}</button>
          </div>
        </div>
      ) : (
        <div className="send-body">
          <div>
            <div className="phone-disp" aria-live="polite">
              <b>{T.phoneLabel}</b>
              {digits ? <span>{formatPhone(digits)}</span> : <span className="ph">(___) ___-____</span>}
            </div>
            <div className="pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button key={k} onClick={() => setDigits((d) => (d.length < 10 ? d + k : d))}>{k}</button>
              ))}
              <button className="fn" onClick={() => setDigits('')}>{T.clear}</button>
              <button onClick={() => setDigits((d) => (d.length < 10 ? d + '0' : d))}>0</button>
              <button className="fn" onClick={() => setDigits((d) => d.slice(0, -1))} aria-label={T.delete}>
                <Icon name="delete" size={34} />
              </button>
            </div>
          </div>
          <div className="send-right">
            <div>
              <div className="h-label">{T.sendLang}</div>
              <div className="msg-lang">
                {LANGS.map((l) => (
                  <button key={l.id} aria-pressed={msgLang === l.id} onClick={() => setMsgLang(l.id)}>{l.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="h-label">{T.preview}</div>
              <div className="bubble">{buildMessage(msgLang)}</div>
            </div>
            <button className="btn primary" style={{ minHeight: 76, fontSize: '1.4rem' }} disabled={!valid || sending} onClick={go}>
              <Icon name="sms" size={30} /> {sending ? '…' : T.send}
            </button>
            <div className="fine">{T.numberErased}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- QR ---------- */
export function QrModal({ lang, text, onClose }: { lang: Lang; text: string; onClose: () => void }) {
  const T = STRINGS[lang];
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'L', margin: 0, color: { dark: '#000000', light: '#ffffff' } }).then(setSvg);
  }, [text]);
  return (
    <Modal title={T.qrTitle} onClose={onClose} className="qrm" closeLabel={T.close}>
      <div className="qr-body">
        <div className="qr-box" dangerouslySetInnerHTML={{ __html: svg }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 600, maxWidth: 520 }}>{T.qrBody}</div>
        <button className="btn primary" onClick={onClose}>{T.done}</button>
      </div>
    </Modal>
  );
}

/* ---------- start picker ---------- */
export function StartPicker({ lang, kioskId, closed, onPick, onClose }: { lang: Lang; kioskId: string; closed: Set<string>; onPick: (id: string) => void; onClose: () => void }) {
  const T = STRINGS[lang];
  return (
    <Modal title={T.startFromTitle} onClose={onClose} className="picker" closeLabel={T.close}>
      <div className="pick-list">
        {KIOSKS.map((k) => {
          const isClosed = !!k.closedBy && closed.has(k.closedBy);
          return (
            <button key={k.id} className="pick" aria-pressed={k.id === kioskId} disabled={isClosed} onClick={() => onPick(k.id)}>
              <span style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                <Icon name="pin" /> {k.name[lang]}
              </span>
              {isClosed ? (
                <span className="tag"><Icon name="blocked" size={22} /> {T.closedShort}</span>
              ) : k.id === kioskId ? (
                <Icon name="check" />
              ) : null}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------- appointment time ---------- */
export function ApptModal({ lang, value, onChange, onClose }: { lang: Lang; value: number | null; onChange: (v: number | null) => void; onClose: () => void }) {
  const T = STRINGS[lang];
  const v = value ?? 10 * 60 + 30;
  const bump = (d: number) => onChange(Math.max(6 * 60, Math.min(20 * 60, v + d)));
  return (
    <Modal title={T.apptTitle} onClose={onClose} className="apptm" closeLabel={T.close}>
      <div className="appt-body">
        <div className="appt-time">{clock(v, lang)}</div>
        <div className="appt-row">
          <button className="btn" onClick={() => bump(-60)}><Icon name="down" /> 1 h</button>
          <button className="btn" onClick={() => bump(-15)}><Icon name="down" /> 15 min</button>
          <button className="btn" onClick={() => bump(15)}><Icon name="up" /> 15 min</button>
          <button className="btn" onClick={() => bump(60)}><Icon name="up" /> 1 h</button>
        </div>
        <div className="appt-row">
          <button className="btn primary" onClick={() => { onChange(v); onClose(); }}>{T.done}</button>
          {value !== null && <button className="btn ghost" onClick={() => { onChange(null); onClose(); }}>{T.clear}</button>}
        </div>
      </div>
    </Modal>
  );
}

export const startLabelFor = (nodeId: string, lang: Lang) => KIOSKS.find((k) => k.node === nodeId)?.name[lang] ?? NODES.get(nodeId)?.id ?? '';
