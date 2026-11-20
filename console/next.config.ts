import path from 'node:path';
import type { NextConfig } from 'next';

// The console imports the pipeline code in ../src, so the repo root is the
// project root for bundling and file tracing.
const root = path.resolve(import.meta.dirname, '..');

const config: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  devIndicators: false,
};

export default config;
