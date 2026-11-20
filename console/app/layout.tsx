import './globals.css';
import '@ui-sdk/core/web.css';
import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import { Live } from '@/components/live';
import { Nav } from '@/components/nav';
import { Toaster } from '@/components/toaster';
import { codebookBundle, codebookSourceVersion } from '@/lib/data';

const sans = Instrument_Sans({ subsets: ['latin'], axes: ['wdth'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Dataset Console', template: '%s | Dataset Console' },
  description: 'Labeling progress, agreement, the codebook and proposal review for the design patterns dataset.',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#16181d' },
  ],
};

export const dynamic = 'force-dynamic';

function CodebookVersion() {
  const bundle = codebookBundle();
  if (!bundle) return <span className="cb-version">No codebook build</span>;
  const source = codebookSourceVersion();
  const stale = source && source !== bundle.version;
  return (
    <span className="cb-version">
      Codebook <span className="mono">{bundle.version}</span>
      {stale ? (
        <span className="cb-stale" title="codebook/ has changed since dist/ was built">
          Source is <span className="mono">{source}</span>. Run <code>node&nbsp;scripts/build-codebook.ts</code>
        </span>
      ) : null}
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to Content</a>
        <header className="top">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            Design Patterns Dataset
          </Link>
          <Nav />
          <CodebookVersion />
          <Live />
        </header>
        <main id="main" tabIndex={-1}>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
