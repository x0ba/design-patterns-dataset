import { listProposals } from '../../../../src/pipeline/proposals.ts';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ proposals: listProposals() });
}
