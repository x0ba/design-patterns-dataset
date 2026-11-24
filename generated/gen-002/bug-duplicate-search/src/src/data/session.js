// Build history, the tester's current session, and database totals.
// Everything here is mock data for the prototype.

export const BUILDS = ['0.44.2011', '0.45.2033', '0.46.2051', '0.47.2090', '0.48.2117'];
export const CURRENT_BUILD = '0.48.2117';

export const SESSION = {
  tester: { id: 'QA-0217', name: 'Aaliyah Brooks', team: 'Console Certification' },
  devkit: 'PS5-DK-44',
  platform: 'PS5',
  build: CURRENT_BUILD,
  dumpId: 'CD-0.48.2117-7F3A91C2',
  capturedAt: '2026-11-17 21:48',
  signature: 'MapRenderer::UpdateWeatherOverlay null pointer',
  clip: { duration: '0:40' },
  sessionType: '4-player co-op',
  // Exactly what the tester typed before opening Dupehound.
  description: 'crash opening map in rain co-op teammate fast travel PS5',
};

export const DB_STATS = { total: 48600, open: 3940 };
