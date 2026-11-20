import { acceptProposal, rejectProposal } from '../../src/pipeline/proposals.ts';

export type ReviewResult = { ok: true; message: string; version?: string } | { ok: false; error: string };

/** Accepts or rejects a filed proposal, editing codebook/ the same way scripts/proposals.ts does. */
export function reviewProposal(batch: string, id: string, action: 'accept' | 'reject', note?: string, by?: string): ReviewResult {
  try {
    if (action === 'accept') {
      const r = acceptProposal(batch, id, { by, note: note || undefined });
      return { ok: true, version: r.version, message: `Accepted ${id}. The codebook source is now ${r.version}; rebuild dist/ with node scripts/build-codebook.ts before the next batch.` };
    }
    if (!note?.trim()) return { ok: false, error: 'Add a note that says why, so the rater who filed it can learn from it.' };
    rejectProposal(batch, id, { by, note });
    return { ok: true, message: `Rejected ${id}.` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
