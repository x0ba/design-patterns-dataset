import { reviewProposal } from '@/lib/proposals';

export async function POST(req: Request, ctx: RouteContext<'/api/proposals/[batch]/[id]/[action]'>) {
  const { batch, id, action } = await ctx.params;
  if (action !== 'accept' && action !== 'reject') return Response.json({ error: 'not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const r = reviewProposal(batch, id, action, body.note, body.by);
  return r.ok ? Response.json(r) : Response.json({ error: r.error }, { status: 400 });
}
