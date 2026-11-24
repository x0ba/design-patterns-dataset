import type { Env, ScanCounts } from '../data/types';
import { useApp } from '../context';
import { copyText } from '../lib/clipboard';
import type { Tier } from '../lib/risk';

export function EnvBadge({ env }: { env: Env }) {
  return <span className={`env env-${env}`}>{env}</span>;
}

export function TierChip({ tier }: { tier: Tier }) {
  return (
    <span className={`tier tier-${tier.label.toLowerCase()}`} title={tier.reason}>
      {tier.label}
    </span>
  );
}

export function CritHigh({ scan }: { scan: ScanCounts }) {
  return (
    <span className="crit-high">
      <span className="sev-critical" title="Critical">
        {scan.critical}
      </span>
      <span className="sep">/</span>
      <span className="sev-high" title="High">
        {scan.high}
      </span>
    </span>
  );
}

export function AdvisoryChip({ id }: { id: string }) {
  return <span className="chip chip-crit">{id}</span>;
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { notify } = useApp();
  return (
    <button
      type="button"
      className="btn-ghost btn-xs"
      onClick={async (e) => {
        e.stopPropagation();
        const ok = await copyText(text);
        notify(ok ? `${label} copied` : 'Copy failed. Select the text and copy it manually.');
      }}
    >
      Copy
    </button>
  );
}
