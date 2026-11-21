import { P } from '../../../../../src/paths.ts';
import { serveFile } from '@/lib/files';

export async function GET(req: Request, ctx: RouteContext<'/files/dataset/[...path]'>) {
  return serveFile(req, P.dataset, (await ctx.params).path);
}
