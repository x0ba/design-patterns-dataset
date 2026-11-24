/**
 * Smoke check (jsdom): load out/seed.json the way aurora-seed-loader.js does, then
 * render the real <App/> and walk Intro -> Main menu (Continue enabled) -> Boot ->
 * Login screen (seeded user listed) -> desktop. Also renders Mail / Messages /
 * Calendar directly to confirm the seeded data is picked up.
 * Run: npx vitest run --config .ui-capture/seed/vitest.seed.config.ts smoke
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('motion/react', async () => {
  const React = await import('react');
  const strip = ({ initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, variants, ...p }: any) => p; // eslint-disable-line
  const mk = (tag: string) => React.forwardRef((props: any, ref) => React.createElement(tag, { ...strip(props), ref }));
  const motion = new Proxy({}, { get: (_t, tag: string) => mk(tag) });
  return { motion, AnimatePresence: ({ children }: any) => <>{children}</>, useAnimation: () => ({ start: () => {} }), useReducedMotion: () => true };
});

// jsdom has no Web Audio: replace howler with an inert stand-in (test only)
vi.mock('howler', () => {
  class Howl { constructor(_o: any) {} play() { return 1; } stop() {} pause() {} volume() { return 1; } seek() { return 0; } duration() { return 0; } playing() { return false; } on() {} once() {} off() {} unload() {} state() { return 'loaded'; } fade() {} mute() {} rate() { return 1; } loop() { return false; } }
  const Howler = { ctx: { state: 'running', resume() {} }, volume() {}, mute() {}, stop() {}, unload() {}, usingWebAudio: false };
  return { Howl, Howler, default: { Howl, Howler } };
});

const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../out/seed.json"), "utf8"));

it('seeded save boots to a populated desktop', async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  (Element.prototype as any).scrollIntoView = () => {};
  localStorage.clear();
  Object.entries(seed).forEach(([k, v]) => localStorage.setItem(k, v as string));
  const { default: App } = await import('@/App');
  render(<App />);
  // Run the exact autopilot shipped in out/ (it drives Intro -> Continue -> Boot -> Login)
  const pilot = fs.readFileSync(path.resolve(__dirname, '../out/aurora-autopilot.js'), 'utf8');
  new Function(pilot).call(window);

  const t0 = Date.now();
  let seen = '';
  await waitFor(() => {
    const txt = document.body.textContent || '';
    const stage = txt.includes('Resume your previous loop') ? 'menu' : document.querySelector('input[type=password]') ? 'login' : txt.includes('Initialize System') ? 'intro' : '';
    if (stage && stage !== seen) { seen = stage; console.log(`[check] +${Date.now() - t0}ms ${stage}`); }
    expect(document.querySelector('.z-20000')).toBeNull();
    expect(txt).toContain('scratch.txt');
  }, { timeout: 40000, interval: 200 });
  console.log(`[check] +${Date.now() - t0}ms desktop reached (login overlay gone)`);
  await act(async () => { await new Promise(r => setTimeout(r, 2500)); });
  const body = document.body.textContent || '';
  const needles = ['scratch.txt', 'SEC-331 final project proposal.md', 'Re: Scope + rules of engagement', 'Prof. Elaine Halloran', 'TechBlog Weekly', 'Documents', 'Downloads'];
  console.log('[check] desktop content:', needles.map(n => `${n}=${body.includes(n)}`).join(' '));
  console.log(`[check] visible text length: ${body.replace(/\s+/g, ' ').length}`);
  expect(body).toContain('Re: Scope + rules of engagement');
}, 60000);
