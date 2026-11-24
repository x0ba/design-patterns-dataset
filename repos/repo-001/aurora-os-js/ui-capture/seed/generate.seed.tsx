/**
 * Seed generator for Aurora OS.js (ui-capture).
 *
 * Replays what an established player did over ~6 months, using the app's own
 * code paths: AppProvider + FileSystemProvider (same calls Onboarding.tsx makes),
 * FS mutations (createFile/createDirectory/writeFile/moveToTrash), MailService and
 * MessagesService. The system clock is moved with vi.setSystemTime so every file,
 * mail and message gets a realistic timestamp. At the end the jsdom localStorage is
 * dumped to raw-dump.json; finalize.mjs turns it into out/seed.json.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AppProvider, useAppContext } from '@/components/AppContext';
import { FileSystemProvider, useFileSystem } from '@/components/FileSystemContext';
import { STORAGE_KEYS, getAppStateKey } from '@/utils/memory';
import { updateStoredVersion } from '@/utils/migrations';
import { encodePassword } from '@/utils/authUtils';
import { MailService } from '@/services/MailService';
import { MessagesService } from '@/services/MessagesService';
import * as D from './data';

const OUT = path.resolve(__dirname, 'raw-dump.json');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

it('seeds an established Aurora OS save', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  localStorage.clear();
  const at = (iso: string) => vi.setSystemTime(new Date(iso));

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider><FileSystemProvider>{children}</FileSystemProvider></AppProvider>
  );
  const { result } = renderHook(() => ({ fs: useFileSystem(), app: useAppContext() }), { wrapper });
  await waitFor(() => { if (!result.current.fs.users.length) throw new Error('fs not ready'); });

  const step = async (fn: () => unknown) => { await act(async () => { fn(); }); };
  const U = D.USER.username;
  const HOME = `/home/${U}`;

  // ---- 1. Onboarding (mirrors Onboarding.tsx handleFinishOnboarding) ----
  at(D.INSTALL_DATE);
  await step(() => result.current.app.setLocale('en-US'));
  await step(() => result.current.fs.addUser(U, D.USER.fullName, D.USER.password, D.USER.hint, 'root', true));
  await step(() => result.current.fs.addUserToGroup(U, 'admin'));
  await step(() => result.current.fs.addUserToGroup(U, 'users'));
  await step(() => result.current.app.switchUser(U));
  await step(() => result.current.app.setAccentColor(D.PREFS.accentColor));
  localStorage.setItem(STORAGE_KEYS.LANGUAGE, 'en-US');
  localStorage.setItem(STORAGE_KEYS.INSTALL_DATE, new Date().toISOString());
  await step(() => result.current.app.setOnboardingComplete(true));
  updateStoredVersion();
  await step(() => result.current.fs.saveFileSystem());
  await step(() => result.current.fs.login(U, D.USER.password));

  // ---- 2. Preferences changed over time ----
  at(D.PREFS.changedAt);
  await step(() => result.current.app.setWallpaper(D.PREFS.wallpaper));
  await step(() => result.current.app.setThemeMode(D.PREFS.themeMode as never));
  // App Store installs over the first weeks (FileSystemProvider.installApp)
  for (const [when, appId] of D.INSTALLS) {
    at(when);
    await step(() => result.current.fs.installApp(appId, U));
  }
  // WiFi: joined home network (same writes NetworkContext.connectToNetwork makes)
  await step(() => result.current.app.setWifiEnabled(true));
  await step(() => result.current.app.setWifiNetwork(D.WIFI.connected));
  localStorage.setItem(STORAGE_KEYS.KNOWN_NETWORKS, JSON.stringify(D.WIFI.known));

  // ---- 3. Files (directories first, then files in chronological order) ----
  for (const [when, parent, name] of D.DIRS) {
    at(when);
    await step(() => result.current.fs.createDirectory(parent.replace('~', HOME), name, U));
  }
  const files = [...D.FILES].sort((a, b) => a.at.localeCompare(b.at));
  for (const f of files) {
    at(f.at);
    const dir = f.dir.replace('~', HOME);
    await step(() => result.current.fs.createFile(dir, f.name, f.content, U));
  }
  for (const t of D.TRASHED) {
    at(t.at);
    await step(() => result.current.fs.moveToTrash(t.path.replace('~', HOME), U));
  }

  // ---- 4. Mail (TrustMail cloud account + ~/.Config/mail.json auto-login) ----
  at(D.MAIL.createdAt);
  MailService.createAccount(D.MAIL.address, D.MAIL.password, D.USER.fullName);
  MailService.addEmails(D.MAIL.address, D.buildEmails());
  const mailAcct = MailService.getAccount(D.MAIL.address)!;
  await step(() => result.current.fs.createFile(`${HOME}/.Config`, 'mail.json', JSON.stringify({
    email: D.MAIL.address, password: encodePassword(D.MAIL.password), provider: 'trustmail',
    lastLogin: D.NOW, recoverySecret: mailAcct.recoverySecret,
  }, null, 2), U));

  // ---- 5. Messages (accounts for user + contacts, then dated conversation history) ----
  at(D.MSG.createdAt);
  MessagesService.createAccount(D.MSG.username, D.MSG.password);
  for (const c of D.CONTACTS) { at(c.joined); MessagesService.createAccount(c.handle, c.password); }
  for (const m of D.buildMessages()) {
    at(m.timestamp);
    MessagesService.sendMessage(m.sender, m.recipient, m.content);
  }
  // mark history read except the latest unread ones
  const msgDb = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES_DB)!);
  const unreadIds = D.unreadMessagePredicate;
  msgDb.messages.forEach((m: any) => { m.read = !unreadIds(m); });
  msgDb.accounts[D.MSG.username].starredPartners = D.MSG.starred;
  localStorage.setItem(STORAGE_KEYS.MESSAGES_DB, JSON.stringify(msgDb));
  const msgAcct = MessagesService.getAccount(D.MSG.username)!;
  await step(() => result.current.fs.createFile(`${HOME}/.Config`, 'messages.json', JSON.stringify({
    username: D.MSG.username, password: msgAcct.passwordHash, recoverySecret: msgAcct.recoverySecret,
    lastLogin: D.NOW, service: 'aurora-messages', provider: 'aurora-net',
  }, null, 2), U));

  // ---- 6. Calendar (~/.Config/calendar.json, same format Calendar.tsx writes) ----
  at(D.NOW);
  await step(() => result.current.fs.createFile(`${HOME}/.Config`, 'calendar.json',
    JSON.stringify({ events: D.buildEvents(), categories: D.CALENDAR_CATEGORIES }, null, 2), U));

  // ---- 7. App soft-state: notepad tabs, browser history/bookmarks, notifications, terminal ----
  localStorage.setItem(getAppStateKey('notepad', U), JSON.stringify(D.notepadState(HOME)));
  localStorage.setItem(`${STORAGE_KEYS.APP_DATA_PREFIX}browser-${U}`, JSON.stringify(D.browserState()));
  localStorage.setItem(`${STORAGE_KEYS.APP_DATA_PREFIX}notifications-${U}`, JSON.stringify(D.notifications(U)));
  localStorage.setItem(`${STORAGE_KEYS.APP_DATA_PREFIX}music-recent-${U}`, JSON.stringify(D.musicRecent(HOME)));
  localStorage.setItem(`${STORAGE_KEYS.TERM_INPUT_PREFIX}${U}`, JSON.stringify(D.TERMINAL_INPUT));
  localStorage.setItem(`${STORAGE_KEYS.WINDOWS_PREFIX}${U}`, JSON.stringify(D.windowSession(U)));

  // ---- 8. Flush ----
  at(D.NOW);
  await step(() => result.current.fs.saveFileSystem());
  await sleep(1500); // let debounced writers (FS, preferences) flush

  const dump: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    dump[k] = localStorage.getItem(k)!;
  }
  fs.writeFileSync(OUT, JSON.stringify(dump, null, 2));
  console.log('seed keys:', Object.keys(dump).sort().join(', '));
});
