import type { Metadata } from 'next';
import { GenerationView } from '@/components/generation-view';

export async function generateMetadata({ params }: PageProps<'/generate/[batch]'>): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).batch)} Generation` };
}

export default async function GenerateBatchPage({ params }: PageProps<'/generate/[batch]'>) {
  return <GenerationView batch={decodeURIComponent((await params).batch)} />;
}
