// Standalone SubMiner stats dashboard server for UI capture.
// Mirrors src/stats-daemon-runner.ts but without the Electron/Yomitan helpers
// and without outbound network (AniList/TMDB are not configured).
import path from 'node:path';
import { ImmersionTrackerService } from '../src/core/services/immersion-tracker-service';
import { createStatsApp } from '../src/core/services/stats-server';

const root = path.resolve(import.meta.dir, '..');
const dataDir = path.join(import.meta.dir, 'data');
const port = Number(process.env.PORT ?? 4447);
const ankiPort = Number(process.env.ANKI_STUB_PORT ?? 8765);

const tracker = new ImmersionTrackerService({
  dbPath: process.env.SUBMINER_DB ?? path.join(dataDir, 'immersion.sqlite'),
  policy: {
    // keep everything: the seeded history spans many months
    retention: {
      eventsDays: 0,
      telemetryDays: 0,
      sessionsDays: 0,
      dailyRollupsDays: 0,
      monthlyRollupsDays: 0,
      vacuumIntervalDays: 0,
    },
  },
});

const app = createStatsApp(tracker, {
  staticDir: path.join(root, 'stats', 'dist'),
  knownWordCachePath: path.join(dataDir, 'known-words-cache.json'),
  getAnkiConnectConfig: () =>
    ({
      enabled: true,
      url: `http://127.0.0.1:${ankiPort}`,
      deck: 'Mining::Anime',
    }) as never,
  getYomitanAnkiDeckName: () => 'Mining::Anime',
  getSecondarySubtitleLanguages: () => ['en', 'eng'],
});

const server = Bun.serve({ fetch: app.fetch, port, hostname: '::' });
console.log(`SubMiner stats dashboard on http://localhost:${server.port}/`);

const stop = () => {
  server.stop();
  tracker.destroy();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
