import type { Metadata } from 'next';
import { GenerationView } from '@/components/generation-view';

export const metadata: Metadata = { title: 'Generation' };

export default function GeneratePage() {
  return <GenerationView />;
}
