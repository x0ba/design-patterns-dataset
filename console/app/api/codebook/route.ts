import { codebookBundle, codebookSourceVersion, codebookUsage } from '@/lib/data';

export const dynamic = 'force-dynamic';

export function GET() {
  const bundle = codebookBundle();
  if (!bundle) return Response.json({ error: 'dist/codebook.json is missing. Run node scripts/build-codebook.ts.' }, { status: 404 });
  return Response.json({ ...bundle, sourceVersion: codebookSourceVersion(), usage: codebookUsage() });
}
