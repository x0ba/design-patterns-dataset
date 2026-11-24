// Generates a local stand-in for https://opencollective.com/ancientbeast/members/all.json
// (same record shape the real endpoint returns) plus SVG avatars for each member.
// Usage: node gen-opencollective.mjs <outDir>
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const outDir = process.argv[2];
const stubDir = join(outDir, 'stub', 'opencollective');
const avatarDir = join(stubDir, 'avatars');
mkdirSync(avatarDir, { recursive: true });

// [name, slug, type, role, totalAmountDonated (USD), monthly?, active, company, github]
const people = [
	['Dread Knight', 'dreadknight', 'USER', 'ADMIN', 1250, false, true, 'Freezing Moon', 'DreadKnight'],
	['Freezing Moon', 'freezingmoon', 'ORGANIZATION', 'HOST', 0, false, true, null, 'FreezingMoon'],
	['Mihai Ionescu', 'mihai-ionescu', 'USER', 'BACKER', 360, true, true, null, 'mionescu'],
	['Sophie Lindqvist', 'sophielindqvist', 'USER', 'BACKER', 145, true, true, null, null],
	['Tomás Ferreira', 'tferreira', 'USER', 'BACKER', 60, false, true, null, 'tomasf'],
	['Kenji Watanabe', 'kenji-w', 'USER', 'BACKER', 500, true, true, 'Hexgrid Labs', 'kwatanabe'],
	['Hexgrid Labs', 'hexgrid-labs', 'ORGANIZATION', 'BACKER', 1800, true, true, null, null],
	['Ana-Maria Popa', 'anamariapopa', 'USER', 'BACKER', 25, false, true, null, null],
	['Lukas Berger', 'lukasberger', 'USER', 'BACKER', 120, true, true, null, 'lberger'],
	['Priya Raman', 'priya-raman', 'USER', 'BACKER', 75, false, true, null, 'praman'],
	['Gumble Fan Club', 'gumble-fan-club', 'COLLECTIVE', 'BACKER', 210, false, true, null, null],
	['Owen Gallagher', 'owengallagher', 'USER', 'BACKER', 10, false, true, null, null],
	['Marta Kowalczyk', 'mkowalczyk', 'USER', 'BACKER', 95, true, true, null, 'martak'],
	['Incognito', 'incognito-4f2a1c', 'USER', 'BACKER', 50, false, true, null, null],
	['Bogdan Stanciu', 'bstanciu', 'USER', 'BACKER', 300, true, true, null, 'bogdans'],
	['Elif Yıldız', 'elif-yildiz', 'USER', 'BACKER', 40, false, true, null, null],
	['Nightshade Games', 'nightshade-games', 'ORGANIZATION', 'BACKER', 750, false, true, null, null],
	['Jonas Ekström', 'jekstrom', 'USER', 'BACKER', 20, false, false, null, null],
	['Camille Dubois', 'camilledubois', 'USER', 'BACKER', 85, true, true, null, 'cdubois'],
	['Rafael Ortega', 'rortega', 'USER', 'BACKER', 15, false, true, null, null],
	['Guest', 'guest-91b0e3', 'USER', 'BACKER', 5, false, true, null, null],
	['Yuki Tanaka', 'yukitanaka', 'USER', 'BACKER', 130, true, true, null, null],
	['Daniel Okafor', 'dokafor', 'USER', 'BACKER', 45, false, true, null, 'danokafor'],
	['Vlad Munteanu', 'vladmunteanu', 'USER', 'BACKER', 220, true, true, null, 'vmunteanu'],
	['Hannah Weiss', 'hannahweiss', 'USER', 'CONTRIBUTOR', 0, false, true, null, 'hweiss'],
	['Pixel Forge Studio', 'pixelforge', 'ORGANIZATION', 'BACKER', 400, false, true, null, null],
	['Ion Vasilescu', 'ionvasilescu', 'USER', 'BACKER', 30, false, true, null, null],
	['Chloé Martin', 'chloemartin', 'USER', 'BACKER', 65, true, true, null, null],
	['Arjun Mehta', 'arjunmehta', 'USER', 'BACKER', 12, false, true, null, null],
	['Sven Nilsen', 'svennilsen', 'USER', 'FOLLOWER', 0, false, true, null, null],
];

const palette = ['#8e2f2f', '#2f5d8e', '#4f7a2a', '#7a4f9e', '#a8761d', '#1f7a75', '#9e3f6b', '#555c66'];
function avatarSvg(name, i) {
	const initials = name
		.split(/[\s-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join('');
	const bg = palette[i % palette.length];
	return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="${bg}"/><circle cx="104" cy="24" r="40" fill="#ffffff" opacity="0.08"/><text x="64" y="80" font-family="Verdana, sans-serif" font-size="46" font-weight="bold" fill="#f3ead8" text-anchor="middle">${initials}</text></svg>`;
}

const start = Date.UTC(2015, 3, 2);
const now = Date.UTC(2026, 10, 14);
let memberId = 3101;
const members = people.map(([name, slug, type, role, total, monthly, active, company, github], i) => {
	const created = new Date(start + ((now - start) * ((i * 37) % 97)) / 97);
	const last = new Date(Math.min(now, created.getTime() + (monthly ? 900 : 120) * 86400000 * ((i % 5) + 1) / 3));
	const lastAmount = total === 0 ? 0 : monthly ? (total >= 300 ? 25 : 5) : Math.min(total, [10, 20, 50, 100][i % 4]);
	const file = `${slug}.svg`;
	writeFileSync(join(avatarDir, file), avatarSvg(name, i));
	return {
		MemberId: memberId++,
		createdAt: created.toISOString().replace('T', ' ').slice(0, 19),
		type,
		role,
		tier: role === 'BACKER' ? (total >= 500 ? 'sponsor' : 'backer') : undefined,
		isActive: active,
		totalAmountDonated: total,
		currency: 'USD',
		lastTransactionAt: last.toISOString().replace('T', ' ').slice(0, 19),
		lastTransactionAmount: lastAmount,
		profile: `https://opencollective.com/${slug}`,
		name,
		company,
		description: null,
		image: `./stub/opencollective/avatars/${file}`,
		email: null,
		twitter: null,
		github: github ? `https://github.com/${github}` : null,
		website: null,
	};
});

writeFileSync(join(stubDir, 'members-all.json'), JSON.stringify(members, null, 2));
console.log(`wrote ${members.length} Open Collective members to ${stubDir}`);
