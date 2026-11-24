// One-off helper: refreshes the stubs/notes in .ui-capture/app.json
import fs from 'node:fs';
const f = new URL('../app.json', import.meta.url);
const a = JSON.parse(fs.readFileSync(f, 'utf8'));
a.stubs = [
  {
    service: 'Connectivity/latency ping to https://caravane.digital/favicon.ico (the main-menu "CRVN xx ms" badge, src/utils/network.ts). This is the only outside request the web build makes.',
    how: 'out/aurora-seed-loader.js wraps window.fetch and sends any caravane.digital request to /stubs/caravane/favicon.ico, a local copy of the app icon served with the static build, so the badge shows a real local round-trip time. The app source is unchanged.',
  },
  {
    service: 'In-game online services: TrustMail mail, Messages, Browser websites (aurora.edu, techblog.com, hackwithjack.org, securebank.com, trustmail.com), WiFi',
    how: 'No stub needed. These are simulated inside the app (MailService/MessagesService keep their data in localStorage, and the websites are React components), so there are no API keys or backends. The optional .env.example variables keep their defaults. Electron\'s binary download was skipped (ELECTRON_SKIP_BINARY_DOWNLOAD=1) because only the web build is used.',
  },
  {
    service: 'Seed data delivery (an established player\'s save game)',
    how: 'out/seed.json is a localStorage dump in the same format as DevCenter\'s "Import Storage". out/aurora-seed-loader.js, added to the built index.html <head> before the app bundle, copies it into localStorage on the first visit, but only when the browser has no Aurora save (no os_filesystem key and no sys_seed_applied flag). The app\'s source code is unchanged.',
  },
];
if (!a.notes.includes('Installed via the App Store')) {
  a.notes = a.notes.replace('Also seeded: ', 'Installed via the App Store (FileSystemProvider.installApp): Notepad, Messages, Calendar, Music, Photos. The Dock shows Finder/Browser/Mail plus Terminal/Settings; the others are in the Dock\'s overflow (grid) menu, which is how the app lays out more than 3 user apps. Also seeded: ');
  a.notes += ' Verification: Chrome cannot start inside this sandbox, so .ui-capture/seed/smoke.check.tsx renders the real <App/> in jsdom with out/seed.json loaded. It walks the intro, the main menu (Continue enabled), the login screen (Mira Calloway), the desktop (seeded Desktop files visible) and the Mail app (seeded inbox visible). Run it with: npx vitest run --config .ui-capture/seed/vitest.seed.config.ts smoke.';
}
fs.writeFileSync(f, JSON.stringify(a, null, 2) + '\n');
console.log('app.json updated');
