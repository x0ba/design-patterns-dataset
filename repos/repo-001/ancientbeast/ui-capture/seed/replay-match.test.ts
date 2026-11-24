/**
 * @jest-environment <rootDir>/test/jsdom-environment.ts
 * @jest-environment-options {"resources": "usable"}
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Verifies .ui-capture/seed/match.ab replays cleanly: feeds every logged action
 * through game.action() with the same performer-matching rules as
 * Game.onLogLoad, and reports dropped actions plus the final board.
 */
import { jest, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { performance as realPerf } from 'perf_hooks';
jest.mock('pixi', () => ({}), { virtual: true });
jest.mock('p2', () => ({}), { virtual: true });
import { createGame, disposeGame } from '../../src/__tests__/simulation/botgeria';

const ABILITIES = ['Abolished', 'Bounty-Hunter', 'Chimera', 'Cyber-Wolf', 'Cycloper', 'Dark-Priest',
	'Golden-Wyrm', 'Gumble', 'Headless', 'Horn-Head', 'Impaler', 'Infernal', 'Knightmare',
	'Miss-Creeper', 'Nutcase', 'Scavenger', 'Snow-Bunny', 'Stomper', 'Swine-Thug', 'Swampler',
	'Uncle-Fungus', 'Vehemoth'];

test('replay seeded match', async () => {
	const str = fs.readFileSync(path.resolve(process.cwd(), '.ui-capture/seed/match.ab'), 'utf8');
	const log = JSON.parse(Buffer.from(str.split('||')[1], 'base64').toString('utf8'));
	const cfg = log.custom.configData;
	const GameModule: any = await import('../../src/game');
	const proto = GameModule.default.prototype;
	const origSetup = proto.setup;
	proto.setup = function (this: any, n: number) {
		this.configData = { ...cfg, players: [0, 1] }; // no bot interference while replaying
		for (const k of ['plasma_amount', 'creaLimitNbr', 'abilityUpgrades', 'unitDrops', 'timePool', 'turnTimePool', 'gameMode']) this[k] = cfg[k];
		return origSetup.call(this, n);
	};
	const loaders: any[] = [];
	for (const a of ABILITIES) { const m: any = await import(`../../src/abilities/${a}`); loaders.push(m.default ?? m); }
	const game: any = await createGame(loaders);
	proto.setup = origSetup;
	game.isReplayInProgress = true;

	const step = async (n = 1) => { for (let i = 0; i < n; i++) { game.headlessDriver?.stepFrames(16); await new Promise((r) => setTimeout(r, 0)); } };
	const matches = (p: any, c: any) => c && c.name === p.name && c.player?.id === p.player;
	await step(20);
	let dropped = 0;
	const t0 = realPerf.now();
	for (const a of log.actions) {
		let waited = 0;
		while (a.performer && !matches(a.performer, game.activeCreature) && waited < 1200) {
			if (waited % 150 === 0 && waited > 0 && game.activeCreature) { if (process.env.REC_TRACE) process.stderr.write(`handoff r${game.turn} active=${game.activeCreature.player.id}:${game.activeCreature.name} want=${a.performer.player}:${a.performer.name} act=${a.action}\n`); game.activeCreature.deactivate('turn-end'); game.nextCreature(); }
			await step(); waited++;
		}
		if (a.performer && !matches(a.performer, game.activeCreature)) { dropped++; continue; }
		let done = false;
		game.activeCreature?.queryMove?.();
		game.action(a, { callback: () => { done = true; } });
		let w = 0;
		while (!done && w < 2000) { await step(); w++; }
		if (!done) { dropped++; process.stderr.write(`stuck on ${JSON.stringify(a).slice(0, 200)}\n`); }
	}
	await step(30);
	const alive = game.creatures.filter((c: any) => c && !c.dead).map((c: any) => `${c.player.id}:${c.name}(${c.health}/${c.stats?.health})`);
	process.stderr.write(`replayed ${log.actions.length} actions, dropped ${dropped}, ${(realPerf.now() - t0).toFixed(0)}ms; round ${game.turn}, active ${game.activeCreature?.player?.id}:${game.activeCreature?.name}\n  ${alive.join(' ')}\n`);
	expect(dropped).toBe(0);
	disposeGame(game);
});
