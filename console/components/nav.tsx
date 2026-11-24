'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Progress', match: (p: string) => p === '/' || p.startsWith('/batch/') || p.startsWith('/site/') },
  { href: '/generate', label: 'Generation', match: (p: string) => p.startsWith('/generate') },
  { href: '/codebook', label: 'Codebook', match: (p: string) => p.startsWith('/codebook') },
  { href: '/proposals', label: 'Proposals', match: (p: string) => p.startsWith('/proposals') },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(pathname) ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
