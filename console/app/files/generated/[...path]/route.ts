import { P } from '../../../../../src/paths.ts';
import { serveFile } from '@/lib/files';

// Only the verified first viewport; built bundles, sources and transcripts stay off the console.
export async function GET(req: Request, ctx: RouteContext<'/files/generated/[...path]'>) {
  const segments = (await ctx.params).path;
  if (segments.length !== 3 || segments[2] !== 'preview.png') return Response.json({ error: 'not found' }, { status: 404 });
  return serveFile(req, P.generated, segments);
}
