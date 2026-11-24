export function fmtSize(mb: number): string {
  return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

export function shortDigest(digest: string): string {
  return `${digest.slice(0, 19)}…`;
}

export function shortHash(hash: string, n = 12): string {
  return `${hash.slice(0, n)}…`;
}
