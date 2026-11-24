// Records the autopilot + window-session changes in app.json
import fs from 'node:fs';
const f = new URL('../app.json', import.meta.url);
const a = JSON.parse(fs.readFileSync(f, 'utf8'));
let n = a.notes;
n = n.replace(/Flow a returning player sees:[\s\S]*?WiFi connected to 'Calloway-5G'\./,
  "What the entry URL shows: the game always opens on a 'CLICK TO START' splash, followed by the main menu, a boot log and the login screen. On its own that leaves the page nearly blank (only the start button). out/aurora-autopilot.js, loaded right after the seed loader, therefore performs the returning player's own steps through the real UI: click Initialize System, skip the logo, choose Continue (enabled because a save exists), wait for the boot log, then pick Mira Calloway and log in with her password from the users DB. After about 6–8 s the page is the logged-in desktop (Aurora wallpaper, fuchsia accent, WiFi 'Calloway-5G'), with the saved window session restored: a Finder window and the Mail app open on the seeded inbox. Add ?intro (e.g. /?intro) to turn the autopilot off and click through by hand: Continue, then Mira Calloway, password nightowl42 (hint: 'bird that stays up late'; root password: admin).");
n = n.replace(/ Verification:[\s\S]*$/, " Verification: Chrome cannot start inside this sandbox, so .ui-capture/seed/smoke.check.tsx renders the real <App/> in jsdom at 1440x900 with out/seed.json loaded, runs the shipped out/aurora-autopilot.js and checks the stages: intro, then the menu (~1.5 s), the login screen (~6 s) and the desktop (~6.4 s), where the seeded Desktop files, the Finder window and the Mail inbox are visible. Run it with: npx vitest run --config .ui-capture/seed/vitest.seed.config.ts smoke.");
if (!n.includes('Saved window session')) n = n.replace('Also seeded: ', 'Also seeded: a saved window session (Finder + Mail), ');
a.notes = n;
a.stubs = a.stubs.map(s => s.service.startsWith('Seed data delivery') ? { ...s, how: s.how + ' A second script, out/aurora-autopilot.js, clicks through the game\'s splash, main menu and login (see notes) so the page opens on the desktop; ?intro disables it.' } : s);
fs.writeFileSync(f, JSON.stringify(a, null, 2) + '\n');
console.log(a.notes.slice(0, 900));
