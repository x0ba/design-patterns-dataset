import { siteDetail } from '@/lib/data';

export async function GET(_req: Request, ctx: RouteContext<'/api/site/[batch]/[slug]'>) {
  const { batch, slug } = await ctx.params;
  const d = siteDetail(batch, slug);
  return d ? Response.json(d) : Response.json({ error: 'no such site' }, { status: 404 });
}
