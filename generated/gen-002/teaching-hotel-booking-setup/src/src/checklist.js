// Gwen's Spring 2027 setup checklist. Each task is checked automatically from the current draft.

const money = ['override', 'waiveLco', 'waiveCancel'];

export function buildChecklist(s) {
  const room = (n) => s.rooms.find((r) => r.number === n);
  const rate = (id) => s.rates.find((r) => r.id === id);
  const topicWeek = (topic) => {
    const weeks = [...new Set(s.scenarios.filter((x) => x.topic === topic).map((x) => x.week))];
    return weeks.length === 1 ? weeks[0] : null;
  };
  const agent = s.roles.find((r) => r.id === 'agent');
  const lead = s.roles.find((r) => r.id === 'lead');

  const suite = room('204');
  const r101 = room('101');

  const groups = [
    {
      id: 'rooms', title: 'Rooms', page: 'rooms',
      tasks: [
        { id: 'combine', label: 'Combine rooms 204 and 205 into Suite 204',
          hint: 'The renovation joined them behind one door.',
          done: !!suite && suite.type === 'Suite' && !room('205'), go: 'rooms', cta: 'Combine rooms', goState: { select: ['r204', 'r205'] } },
        { id: 'roll', label: 'Update room 101 with its roll-in shower',
          hint: 'It is still listed with the old tub and transfer bench.',
          done: !!r101 && r101.accessible && r101.features.includes('Roll-in shower'), go: 'rooms', cta: 'Edit room 101', goState: { edit: 'r101' } },
      ],
    },
    {
      id: 'rates', title: 'Rates & packages', page: 'rates',
      tasks: [
        { id: 'grad', label: 'Activate the Graduation Weekend rate',
          hint: 'Two-night minimum, stricter cancellation. Currently a draft.',
          done: rate('graduation')?.status === 'active', go: 'rates', cta: 'Review draft', goState: { edit: 'graduation' } },
        { id: 'parents', label: 'Retire the Parents’ Weekend package',
          hint: 'It ended Oct 18 and will not run again this term.',
          done: rate('parents')?.status === 'retired', go: 'rates', cta: 'Open rate plans' },
      ],
    },
    {
      id: 'scenarios', title: 'Practice scenarios', page: 'scenarios',
      tasks: [
        { id: 'w3', label: 'Unlock walk-ins and overbookings in week 3',
          done: topicWeek('walkins') === 3, go: 'scenarios', cta: 'Set schedule' },
        { id: 'w7', label: 'Unlock group blocks in week 7',
          done: topicWeek('groups') === 7, go: 'scenarios', cta: 'Set schedule' },
        { id: 'w10', label: 'Unlock rate disputes and no-show charging in week 10',
          done: topicWeek('disputes') === 10 && topicWeek('noshow') === 10, go: 'scenarios', cta: 'Set schedule' },
      ],
    },
    {
      id: 'roles', title: 'Student roles', page: 'roles',
      tasks: [
        { id: 'roster', label: 'Import the spring roster',
          hint: `${agent.students} first-term and ${lead.students} second-term students are assigned to roles.`,
          done: true, keepHint: true, go: 'roles', cta: 'View roles' },
        { id: 'agent', label: 'First-term Desk Agents cannot override rates or waive fees',
          done: money.every((a) => agent.perms[a] === 'no'), go: 'roles', cta: 'Edit permissions' },
        { id: 'lead', label: 'Second-term Shift Leads can, with a reason',
          done: money.every((a) => lead.perms[a] === 'reason'), go: 'roles', cta: 'Edit permissions' },
      ],
    },
    {
      id: 'taxes', title: 'Taxes & fees', page: 'taxes',
      tasks: [
        { id: 'tax', label: 'Confirm the lodging tax and city occupancy fee',
          hint: 'Lodging tax is 11% this term, up from 10.5%.',
          done: !!s.flags.taxConfirmed, go: 'taxes', cta: 'Review taxes' },
      ],
    },
  ];
  return groups;
}

export function checklistProgress(groups) {
  const all = groups.flatMap((g) => g.tasks);
  return { done: all.filter((t) => t.done).length, total: all.length };
}

import { actionById, weekdayOf, fmtDate } from './lib.js';

/** Things worth knowing before publishing. `danger` items block publishing. */
export function buildIssues(s) {
  const issues = [];
  const agent = s.roles.find((r) => r.id === 'agent');

  // Scenarios pointing at a rate plan that is retired or still a draft
  for (const sc of s.scenarios) {
    const plan = s.rates.find((r) => r.id === sc.ratePlan);
    if (plan && plan.status === 'retired') {
      issues.push({ id: `plan-${sc.id}`, tone: 'danger', page: 'scenarios',
        title: `“${sc.title}” uses a retired rate plan`,
        text: `Students would be told to quote ${plan.name}. Pick another plan for this scenario.` });
    }
  }

  // Scenarios needing something first-term students cannot do
  const stuck = s.scenarios.filter((sc) => sc.needs.some((a) => agent.perms[a] === 'no'));
  if (stuck.length) {
    issues.push({ id: 'escalate', tone: 'warn', page: 'roles',
      title: `${stuck.length} ${stuck.length === 1 ? 'scenario needs' : 'scenarios need'} a step Desk Agents can’t do`,
      text: 'They will have to hand that step to a Shift Lead. That works as an escalation drill, but check the wording of each scenario.' });
  }

  // Graduation weekend window quirks
  const g = s.rates.find((r) => r.id === 'graduation');
  if (g && g.status !== 'retired' && g.start && weekdayOf(g.start) !== 'Friday') {
    issues.push({ id: 'grad-start', tone: 'warn', page: 'rates', goState: { edit: 'graduation' },
      title: `Graduation Weekend starts on a ${weekdayOf(g.start)}`,
      text: `${fmtDate(g.start, { weekday: true })} to ${fmtDate(g.end, { weekday: true })}. Friday night isn’t covered by this rate.` });
  }
  return issues;
}
