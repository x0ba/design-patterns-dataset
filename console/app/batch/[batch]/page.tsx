import type { Metadata } from 'next';
import { ProgressView } from '@/components/progress-view';

export async function generateMetadata({ params }: PageProps<'/batch/[batch]'>): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).batch)} Progress` };
}

export default async function BatchPage({ params }: PageProps<'/batch/[batch]'>) {
  return <ProgressView batch={decodeURIComponent((await params).batch)} />;
}
