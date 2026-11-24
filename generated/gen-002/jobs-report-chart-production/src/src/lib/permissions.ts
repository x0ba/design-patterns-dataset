// Release-workflow permissions. Every state change in the store passes through
// canAct(), so the rules for who can finalize, release, hold, or edit live in
// one place. This is a client-side guard: see the README for what it does not do.

import type { Chart, Person } from './types';

export type Action =
  | 'comment'
  | 'editText'
  | 'submitForReview'
  | 'approve'
  | 'returnToDrafting'
  | 'markFinal'
  | 'reopen'
  | 'placeHold'
  | 'liftHold'
  | 'release';

export type Verdict = { ok: true } | { ok: false; reason: string };

const allow: Verdict = { ok: true };
const deny = (reason: string): Verdict => ({ ok: false, reason });

export interface ActionContext {
  /** open (unresolved) comment threads: on this chart for markFinal, across all charts for release */
  openComments?: number;
  /** for release: how many charts are not final yet */
  notFinal?: number;
  /** for release: how many holds are open across the release */
  holdsOpen?: number;
  /** for editText: which text fields the edit touches */
  fields?: string[];
}

export function canAct(actor: Person, action: Action, chart: Chart | null, ctx: ActionContext = {}): Verdict {
  const isLead = actor.role === 'lead';
  const isOwner = !!chart && chart.ownerId === actor.id;

  switch (action) {
    case 'comment':
      return allow;

    case 'editText': {
      if (!chart) return deny('No chart selected.');
      if (chart.status === 'final') return deny('Final charts are locked. Reopen the chart to edit it.');
      if (actor.role === 'lead') return allow;
      if (actor.role === 'editor') {
        // Editors change titles (headlines), release notes and captions. Subtitles stay with the owner.
        return (ctx.fields ?? []).includes('subtitle')
          ? deny('Editors change headlines, release notes and captions. Subtitles belong to the chart owner.')
          : allow;
      }
      if (actor.role === 'analyst') {
        return isOwner ? allow : deny('Analysts can edit only the charts they own.');
      }
      return deny('Disclosure reviewers place and lift holds; they do not edit chart text.');
    }

    case 'submitForReview': {
      if (!chart) return deny('No chart selected.');
      if (chart.status !== 'drafting') return deny('Only drafts can be submitted for review.');
      return isOwner || isLead ? allow : deny('Only the chart owner can submit a draft.');
    }

    case 'approve': {
      if (!isLead) return deny('Only the release lead can approve charts.');
      if (!chart) return deny('No chart selected.');
      if (chart.status === 'disclosure hold') return deny('This chart is on disclosure hold.');
      if (chart.status !== 'in review') return deny('Only charts in review can be approved.');
      return allow;
    }

    case 'returnToDrafting': {
      if (!isLead) return deny('Only the release lead can return a chart to its owner.');
      if (!chart || chart.status !== 'in review') return deny('Only charts in review can be returned.');
      return allow;
    }

    case 'markFinal': {
      if (!isLead) return deny('Only the release lead can mark a chart final.');
      if (!chart) return deny('No chart selected.');
      if (chart.status === 'disclosure hold') return deny('A disclosure hold blocks finalizing.');
      if (chart.status !== 'approved') return deny('Only approved charts can be marked final.');
      if ((ctx.openComments ?? 0) > 0) return deny('Resolve open comments on this chart first.');
      return allow;
    }

    case 'reopen': {
      if (!isLead) return deny('Only the release lead can reopen a final chart.');
      if (!chart || chart.status !== 'final') return deny('Only final charts can be reopened.');
      return allow;
    }

    case 'placeHold': {
      if (actor.role !== 'disclosure') return deny('Only the disclosure reviewer can place a hold.');
      if (!chart) return deny('No chart selected.');
      if (chart.status === 'final') return deny('Reopen the chart before placing a hold.');
      if (chart.status === 'disclosure hold') return deny('This chart is already on hold.');
      return allow;
    }

    case 'liftHold': {
      if (actor.role !== 'disclosure') return deny('Only the disclosure reviewer can lift a hold.');
      if (!chart || chart.status !== 'disclosure hold') return deny('This chart is not on hold.');
      return allow;
    }

    case 'release': {
      if (!isLead) return deny('Only the release lead can release charts to communications.');
      if ((ctx.holdsOpen ?? 0) > 0) return deny('Lift every disclosure hold before release.');
      if ((ctx.openComments ?? 0) > 0) return deny('Resolve open comments before release.');
      if ((ctx.notFinal ?? 0) > 0) return deny('Every chart must be final before release.');
      return allow;
    }
  }
}
