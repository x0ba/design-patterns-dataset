import { redirect } from 'next/navigation';
import { codebookBundle } from '@/lib/data';
import { codebookHref } from '@/lib/format';

export default async function CodebookIndex({ searchParams }: PageProps<'/codebook'>) {
  const first = codebookBundle()?.entries[0];
  if (!first) return null;
  const sp = new URLSearchParams(Object.entries(await searchParams).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
  redirect(`${codebookHref(first.id)}${sp.size ? `?${sp}` : ''}`);
}
