/**
 * @jest-environment <rootDir>/test/jsdom-environment.ts
 * @jest-environment-options {"resources": "usable"}
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Records a real match with the repo's headless bot harness (botgeria) and writes
 * the game's own log (`Ancient Beast <ver> GameLog | ...`) to .ui-capture/seed/match.ab.
 * The log is cut at the start of one of player 1's (red, human seat) turns in a
 * mid-game round, so loading it lands on "your turn" in an ongoing vs-bot match.
 *
 * Env: REC_SEED (bot RNG seed), REC_ROUND (round to stop at), REC_LOCATION.
 */
import { jest, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
jest.mock('pixi', () => ({}), { virtual: true });
jest.mock('p2', () => ({}), { virtual: true });
import { performance as realPerf } from 'perf_hooks';
import { createGame, disposeGame } from '../../src/__tests__/simulation/botgeria';

const ABILITIES = ['Abolished', 'Bounty-Hunter', 'Chimera', 'Cyber-Wolf', 'Cycloper', 'Dark-Priest',
	'Golden-Wyrm', 'Gumble', 'Headless', 'Horn-Head', 'Impaler', 'Infernal', 'Knightmare',
	'Miss-Creeper', 'Nutcase', 'Scavenger', 'Snow-Bunny', 'Stomper', 'Swine-Thug', 'Swampler',
	'Uncle-Fungus', 'Vehemoth'];

// Settings an experienced player would pick on the pre-match screen.
const CONFIG = {
	gameMode: 2,
	players: [0], // seat 1 human, seat 2 bot
	creaLimitNbr: 4,
	unitDrops: 1,
	abilityUpgrades: 3,
	plasma_amount: 60,
	turnTimePool: -1,
	timePool: -1,
	background_image: process.env.REC_LOCATION || 'Dragon Bones',
	combatLocation: process.env.REC_LOCATION || 'Dragon Bones',
	fullscreenMode: false,
};

// Deterministic Math.random so a given seed records the same match.
function mulberry32(a: number) {
	return () => {
		a |= 0; a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

test('record a mid-game match log', async () => {
	Math.random = mulberry32(Number(process.env.REC_SEED || 7));
	const stopRound = Number(process.env.REC_ROUND || 8);

	const GameModule: any = await import('../../src/game');
	const proto = GameModule.default.prototype;
	const origSetup = proto.setup;
	proto.setup = function (this: any, n: number) {
		this.configData = { ...CONFIG, players: [] }; // both seats bot-driven while recording
		for (const k of ['plasma_amount', 'creaLimitNbr', 'abilityUpgrades', 'unitDrops', 'timePool', 'turnTimePool', 'gameMode']) {
			this[k] = (CONFIG as any)[k];
		}
		return origSetup.call(this, n);
	};

	const loaders: any[] = [];
	for (const a of ABILITIES) {
		const mod: any = await import(`../../src/abilities/${a}`);
		loaders.push(mod.default ?? mod);
	}
	const game: any = await createGame(loaders);
	proto.setup = origSetup;

	// Bots end turns by calling skipTurn/delayCreature directly (the UI buttons log
	// these for humans); log them so the replay advances turns the same way.
	const skip = game.skipTurn.bind(game);
	game.skipTurn = (o: any = {}) => { if (o && o.noTooltip === true && Object.keys(o).length === 1 && game.activeCreature && game.gameState !== 'ended') game.gamelog.add({ action: 'skip' }); return skip(o); };

	let captured: any[] | null = null;
	let capturedInfo = '';
	game.channels.creature.on?.('activate', ({ creature }: any) => {
		if (captured || !creature) return;
		if (game.turn >= stopRound && creature.player?.id === 0 && creature.type !== '--') {
			captured = JSON.parse(JSON.stringify(game.gamelog.actions, (k, v) => (k === 'sourceCreature' ? {} : v)));
			capturedInfo = `round ${game.turn}, active ${creature.name}`;
		}
	});

	const start = realPerf.now();
	while (!captured && game.gameState !== 'ended' && realPerf.now() - start < 240000) {
		game.headlessDriver?.stepFrames(16);
		await new Promise((r) => setTimeout(r, 0));
	}
	const alive = game.creatures.filter((c: any) => c && !c.dead).map((c: any) => `${c.player.id}:${c.name}(${c.health}/${c.stats?.health})`);
	process.stderr.write(`state: ${capturedInfo || 'not captured'} turn=${game.turn} state=${game.gameState}\n  ${alive.join(' ')}\n`);
	expect(captured).not.toBeNull();

	game.gamelog.actions = captured;
	game.configData = { ...CONFIG };
	const str = game.gamelog.stringify();
	const out = path.resolve(process.cwd(), '.ui-capture/seed/match.ab');
	fs.writeFileSync(out, str);
	process.stderr.write(`wrote ${captured!.length} actions (${str.length} bytes) to ${out}\n`);
	disposeGame(game);
});
