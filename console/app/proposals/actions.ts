'use server';

import { revalidatePath } from 'next/cache';
import { reviewProposal, type ReviewResult } from '@/lib/proposals';

export async function review(batch: string, id: string, action: 'accept' | 'reject', note: string): Promise<ReviewResult> {
  const r = reviewProposal(batch, id, action, note);
  if (r.ok) revalidatePath('/', 'layout');
  return r;
}
