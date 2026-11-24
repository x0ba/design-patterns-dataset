/** The advisory the console is currently about. */
export const CVE_ID = 'CVE-2026-41187';
export const CVE_PUBLISHED_AT = '2026-11-16T06:40:00-08:00';
/** Images pushed before this instant on a debian:12 base carry the vulnerable libssl3. */
export const CUTOFF_AT = '2026-11-14T00:00:00-08:00';

export const CVE_INFO = {
  id: CVE_ID,
  cvss: 9.8,
  pkg: 'libssl3',
  summary:
    "Out-of-bounds read in OpenSSL's TLS handshake parser, shipped in the libssl3 package of Debian 12 (bookworm). A remote peer can trigger it during the handshake, which can crash the process or expose adjacent heap memory. Any TLS listener that accepts untrusted clients is exposed.",
  fixNote:
    'Fixed in debian:12 base images rebuilt on or after Nov 14, 2026. Images built earlier still ship the vulnerable libssl3 until they are rebuilt on the new base.',
};

const CUTOFF_MS = Date.parse(CUTOFF_AT);

/** The match rule from the advisory: debian:12 base family, pushed before the cutoff. */
export function matchesCve(base: string, pushedAt: string): boolean {
  return base.startsWith('debian:12') && Date.parse(pushedAt) < CUTOFF_MS;
}

/**
 * Bookworm is Debian 12 underneath, but these tags do not match the debian:12 base rule.
 * Surfaced separately so nobody clears the list while they are unchecked.
 */
export function isBookwormWarning(base: string, pushedAt: string): boolean {
  return !base.startsWith('debian:12') && base.includes('bookworm') && Date.parse(pushedAt) < CUTOFF_MS;
}
