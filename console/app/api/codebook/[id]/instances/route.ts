import { codebookBundle, codebookInstances } from '@/lib/data';

export async function GET(_req: Request, ctx: RouteContext<'/api/codebook/[id]/instances'>) {
  const { id } = await ctx.params;
  if (!codebookBundle()) return Response.json({ error: 'dist/codebook.json is missing. Run node scripts/build-codebook.ts.' }, { status: 404 });
  const instances = codebookInstances(id);
  return instances ? Response.json({ id, instances }) : Response.json({ error: 'no such codebook entry' }, { status: 404 });
}
