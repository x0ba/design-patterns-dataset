import { P } from '../../../../../src/paths.ts';
import { serveFile } from '@/lib/files';

export async function GET(_req: Request, ctx: RouteContext<'/files/dataset/[...path]'>) {
  return serveFile(P.dataset, (await ctx.params).path);
}
