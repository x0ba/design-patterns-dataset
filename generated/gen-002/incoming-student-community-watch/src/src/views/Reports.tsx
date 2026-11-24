import { useStore, type CaseId } from '../store';
import { WELLBEING, PII, SCAM_MESSAGES, SCAM_ACCOUNTS } from '../data/cases';
import { groupById } from '../data/community';
import { Pill, hhmm, type Tone } from '../components/ui';
import { wbSteps, scamSteps, piiSteps, stateOf } from '../progress';

interface Row { at: number; cat: string; tone: Tone; target: string; where: string; reporter: string; note: string; caseId: CaseId }

export default function Reports() {
  const s = useStore();
  const rows: Row[] = [
    { at: WELLBEING.reportedAt, cat: 'Wellbeing', tone: 'red' as Tone, target: `Post by ${WELLBEING.author.name}`, where: 'Hartwell Hall 2030', reporter: WELLBEING.report.by, note: WELLBEING.report.note, caseId: 'wellbeing' as CaseId },
    ...PII.reports.map((r): Row => ({ at: r.at, cat: 'Personal info', tone: 'violet', target: `Comment by ${PII.poster.name}`, where: 'Roommate Search 2030', reporter: r.by, note: r.note, caseId: 'pii' })),
    ...SCAM_MESSAGES.filter((m) => m.reported).map((m, i): Row => ({
      at: [9 * 60 + 58, 10 * 60 + 40, 10 * 60 + 21, 11 * 60 + 15].map((x) => new Date(2026, 7, 13, Math.floor(x / 60), x % 60).getTime())[i],
      cat: 'Scam', tone: 'amber', target: `${m.groupId ? 'Post' : 'DM'} from ${SCAM_ACCOUNTS.find((a) => a.id === m.accountId)!.name}`,
      where: m.groupId ? groupById(m.groupId).name : 'Direct message', reporter: ['Hartwell Hall member', 'Class of 2030 General member', 'DM recipient (Hartwell Hall)', 'DM recipient (Off-campus Housing)'][i],
      note: ['this is a scam, same thing happened to my cousin', 'new account, no admissions badge, asking for money', 'they want $300 by zelle before I’ve even seen the place??', 'is this real? they say someone else wants it tonight'][i], caseId: 'scam',
    })),
  ].sort((a, b) => a.at - b.at);

  const caseState = { wellbeing: stateOf(wbSteps(s)), scam: stateOf(scamSteps(s)), pii: stateOf(piiSteps(s)) } as Record<string, string>;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Student reports since 9:00</h1>
          <p className="page-sub">7 reports, grouped into 3 cases on the catch-up screen. Reporter identities are visible to staff only.</p>
        </div>
      </div>
      <table className="table">
        <thead><tr><th>Reported</th><th>Type</th><th>About</th><th>Where</th><th>Reporter’s note</th><th>Case</th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const st = caseState[r.caseId];
            return (
              <tr key={i} className="clickable" onClick={() => s.go('catchup', r.caseId)}>
                <td className="mono">{hhmm(r.at)}</td>
                <td><Pill tone={r.tone}>{r.cat}</Pill></td>
                <td>{r.target}</td>
                <td>{r.where}</td>
                <td className="clip muted">“{r.note}” <span className="small">— {r.reporter}</span></td>
                <td>{st === 'done' ? <Pill tone="green">Done</Pill> : st === 'active' ? <Pill tone="teal">In progress</Pill> : <Pill tone="red">Open</Pill>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
