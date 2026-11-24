export type Env = 'prod' | 'staging' | 'none';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface ScanCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Finding {
  cve: string;
  severity: Severity;
  pkg: string;
  installed: string;
  fixedIn: string | null;
  title: string;
}

export interface HistoryLine {
  instruction: string;
  sizeMB: number;
}

export interface Build {
  sourceRepo: string;
  commit: string;
  commitMessage: string;
  branch: string;
  author: string;
  pipeline: string;
  runner: string;
  durationSec: number;
  dockerfile: string;
  buildArgs: Record<string, string>;
  labels: Record<string, string>;
  history: HistoryLine[];
}

export interface Tag {
  /** "repo:tag" */
  id: string;
  repo: string;
  name: string;
  digest: string;
  sizeMB: number;
  arch: string;
  base: string;
  /** Digest of the base image this build was made on. */
  baseDigest: string;
  pushedAt: string;
  pushedBy: string;
  lastPulledAt: string | null;
  pulls30d: number;
  env: Env;
  scan: ScanCounts;
  /** Capped list of findings, most severe first. Counts in `scan` are the full totals. */
  findings: Finding[];
  build: Build;
}

export interface RepoMeta {
  name: string;
  description: string;
}
