// Offline shim for the MapTiler SDK (injected via .ui-capture/rsbuild.capture.config.ts
// as a pre-entry; not part of the app's source). Disables SDK telemetry and routes
// every MapTiler REST call (geocoding etc.) to the local stub at /maptiler-stub/.
import { config } from '@maptiler/sdk';

config.telemetry = false;
config.session = false;
const realFetch = window.fetch.bind(window);
config.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const local = url.replace(/^https:\/\/api\.maptiler\.(com|eu)\//, `${window.location.origin}/maptiler-stub/api/`);
  return realFetch(local, init);
}) as typeof fetch;
