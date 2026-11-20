import { batchNames, batchSummary } from '@/lib/data';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ batches: batchNames().map(batchSummary) });
}
