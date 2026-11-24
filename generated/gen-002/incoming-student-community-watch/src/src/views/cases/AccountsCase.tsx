import { useStore } from '../../store';
import { UNVERIFIED } from '../../data/cases';
import { accountsDone } from '../../progress';
import { AccountsPanel } from '../Accounts';
import { CaseHead } from './common';

export default function AccountsCase() {
  const s = useStore();
  const done = accountsDone(s);
  return (
    <div className="case">
      <CaseHead kind="Accounts" tone="slate"
        title="3 other unverified accounts need a decision"
        meta={<>Created today without an admissions match · {done}/{UNVERIFIED.length} decided · suggested action is highlighted</>} />
      <div className="case-body">
        <AccountsPanel />
        <p className="muted small" style={{ marginTop: 14 }}>
          The other 6 unverified accounts belong to the housing scam wave and are handled in that case.{' '}
          <button className="link-btn" onClick={() => s.select('scam')}>Open scam case →</button>
        </p>
      </div>
    </div>
  );
}
