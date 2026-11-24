// Local stand-in for the two Deutsche Bahn APIs BetterBahn talks to:
//   - www.bahn.de/web/api/angebote/{verbindung/:vbid, recon}   (share-link resolution)
//   - app.vendo.noncd.db.de/mob/angebote/fahrplan               (db-vendo-client "dbnav" journeys)
// Responses follow DB's raw JSON shapes so the app's real parsing code runs unchanged.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S, CORRIDORS, TRIPS } from "./network.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const PORT = Number(process.env.STUB_PORT || 4455);

// ---------- station metadata (names + coordinates from the bundled db-hafas-stations) ----------
const wanted = new Set(Object.values(S));
const STATIONS = {};
const stationsFile = path.join(root, "node_modules/db-hafas-stations/full.ndjson");
for (const line of fs.readFileSync(stationsFile, "utf8").split("\n")) {
	if (!line) continue;
	const m = line.match(/^\{"id":"(\d+)"/);
	if (!m || !wanted.has(m[1])) continue;
	const s = JSON.parse(line);
	STATIONS[s.id] = { id: s.id, name: s.name, lat: s.location.latitude, lon: s.location.longitude };
}
for (const [name, id] of Object.entries(S)) {
	STATIONS[id] ??= { id, name, lat: 51, lon: 10 };
}
const idOf = (name) => {
	const id = S[name];
	if (!id) throw new Error(`unknown station ${name}`);
	return id;
};

// ---------- helpers ----------
const hash = (str) => {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0) / 4294967295;
};
const MIN = 60_000;
// All seeded travel dates are in CET (winter); Berlin = UTC+1.
const localToMs = (date, hhmm) => Date.parse(`${date}T${hhmm}:00+01:00`);
const iso = (ms) => new Date(ms + 3600_000).toISOString().slice(0, 19) + "+01:00";
const compact = (ms) => iso(ms).slice(0, 16).replace(/[-T:]/g, "");
const locId = (id) => {
	const s = STATIONS[id];
	return `A=1@O=${s.name}@X=${Math.round(s.lon * 1e6)}@Y=${Math.round(s.lat * 1e6)}@U=80@L=${id}@B=1@p=1763065012@i=U×00${id}@`;
};

// ---------- runs (concrete train services) ----------
const runs = new Map();
const makeRun = (corridorId, anchorName, anchorMs, number) => {
	const c = CORRIDORS[corridorId];
	const a = c.stops.find((s) => s[0] === anchorName);
	if (!a) throw new Error(`${anchorName} not on ${corridorId}`);
	number ??= c.numbers[Math.floor(hash(corridorId + anchorMs) * c.numbers.length)];
	const stops = c.stops.map(([name, off], i) => {
		const t = anchorMs + (off - a[1]) * MIN;
		return {
			id: idOf(name),
			arr: i === 0 ? null : t - (c.product === "REGIONAL" ? 1 : 2) * MIN,
			dep: i === c.stops.length - 1 ? null : t,
		};
	});
	const key = `${corridorId}|${stops[0].dep ?? stops[0].arr}`;
	if (runs.has(key)) return runs.get(key);
	const run = { key, corridorId, c, number, stops };
	runs.set(key, run);
	return run;
};

// Trips from saved share links
const TRIP_BY_VBID = new Map();
const TRIP_BY_RECON = new Map();
const SAVED_TRANSFERS = new Set();
for (const trip of TRIPS) {
	const legs = [];
	let prevArr = null;
	for (const [corr, from, to, hhmm, transfer] of trip.legs) {
		const depMs = hhmm ? localToMs(trip.date, hhmm) : prevArr + (transfer ?? 8) * MIN;
		const run = makeRun(corr, from, depMs);
		const fi = run.stops.findIndex((s) => s.id === idOf(from));
		const ti = run.stops.findIndex((s) => s.id === idOf(to));
		legs.push({ run, fi, ti });
		prevArr = run.stops[ti].arr;
	}
	const first = legs[0], last = legs.at(-1);
	const fromSt = STATIONS[first.run.stops[first.fi].id];
	const toSt = STATIONS[last.run.stops[last.ti].id];
	const depMs = first.run.stops[first.fi].dep;
	const arrMs = last.run.stops[last.ti].arr;
	const recon =
		`¶HKI¶T$${locId(fromSt.id)}$${locId(toSt.id)}$${compact(depMs)}$${compact(arrMs)}$` +
		legs.map((l) => `${l.run.c.kurz}  ${l.run.number}`).join("$") +
		`$$1$$$$$$¶KC¶#VE#2#CF#100#CA#0#CM#0#SICT#0#AM#16465#AM2#0#RT#7#¶KCC¶` +
		Buffer.from(`#VE#1#ST#${Math.floor(depMs / 1000)}#PI#0#ZI#${Math.floor(hash(trip.vbid) * 900000)}#TA#0#DA#${compact(depMs).slice(2, 8)}#`).toString("base64") +
		`¶SC¶1_H4sIAAAAAAAAA${Buffer.from(trip.vbid).toString("base64").replace(/=/g, "")}¶`;
	for (let i = 1; i < legs.length; i++) SAVED_TRANSFERS.add(`${legs[i - 1].run.key}>${legs[i].run.key}`);
	const rec = { ...trip, legs, fromSt, toSt, depMs, arrMs, recon };
	TRIP_BY_VBID.set(trip.vbid, rec);
	TRIP_BY_RECON.set(recon, rec);
}

// Background timetable: every corridor runs every 2 hours (both seed-driven and generic queries work)
const backgroundRunsFor = (dayStartMs) => {
	for (const [cid, c] of Object.entries(CORRIDORS)) {
		const base = Math.floor(hash(cid) * 60);
		for (let h = 5; h <= 21; h += 2) {
			makeRun(cid, c.stops[0][0], dayStartMs + (h * 60 + base) * MIN);
		}
	}
};
const daysSeeded = new Set();
const ensureDay = (ms) => {
	const day = iso(ms).slice(0, 10);
	if (daysSeeded.has(day)) return;
	daysSeeded.add(day);
	backgroundRunsFor(localToMs(day, "00:00"));
};

// ---------- journey search ----------
const idx = (run, id) => run.stops.findIndex((s) => s.id === id);
const searchJourneys = (fromId, toId, whenMs) => {
	ensureDay(whenMs);
	ensureDay(whenMs + 24 * 60 * MIN);
	const all = [...runs.values()];
	const results = [];
	for (const r of all) {
		const fi = idx(r, fromId), ti = idx(r, toId);
		if (fi < 0 || ti < 0 || fi >= ti) continue;
		const dep = r.stops[fi].dep;
		if (dep >= whenMs - MIN && dep <= whenMs + 5 * 60 * MIN) results.push([{ run: r, fi, ti }]);
	}
	results.sort((a, b) => a[0].run.stops[a[0].fi].dep - b[0].run.stops[b[0].fi].dep);
	const exactDirect = results.some((j) => Math.abs(j[0].run.stops[j[0].fi].dep - whenMs) <= MIN);
	if (!exactDirect) {
		// one change of trains
		const transfers = [];
		for (const r1 of all) {
			const fi = idx(r1, fromId);
			if (fi < 0 || idx(r1, toId) > fi) continue;
			const dep = r1.stops[fi].dep;
			if (dep == null || dep < whenMs - MIN || dep > whenMs + 3 * 60 * MIN) continue;
			for (let xi = fi + 1; xi < r1.stops.length; xi++) {
				const x = r1.stops[xi];
				let best = null;
				for (const r2 of all) {
					if (r2 === r1 || r2.corridorId === r1.corridorId) continue;
					const x2 = idx(r2, x.id), t2 = idx(r2, toId);
					if (x2 < 0 || t2 < 0 || x2 >= t2) continue;
					const d2 = r2.stops[x2].dep;
					if (d2 < x.arr + 5 * MIN || d2 > x.arr + 100 * MIN) continue;
					const saved = SAVED_TRANSFERS.has(`${r1.key}>${r2.key}`);
					if (saved) { best = { run: r2, fi: x2, ti: t2, saved }; break; }
					if (!best || r2.stops[t2].arr < best.run.stops[best.ti].arr) best = { run: r2, fi: x2, ti: t2 };
				}
				if (best) transfers.push([{ run: r1, fi, ti: xi }, best]);
			}
		}
		transfers.sort((a, b) => (b[1].saved ? 1 : 0) - (a[1].saved ? 1 : 0) || a.at(-1).run.stops[a.at(-1).ti].arr - b.at(-1).run.stops[b.at(-1).ti].arr);
		const seen = new Set();
		const anySaved = transfers.some((j) => j[1].saved);
		for (const j of anySaved ? transfers.filter((j) => j[1].saved) : transfers) {
			const k = j[0].run.key + j[0].fi;
			if (seen.has(k)) continue;
			seen.add(k);
			results.push(j);
		}
		results.sort((a, b) => a[0].run.stops[a[0].fi].dep - b[0].run.stops[b[0].fi].dep);
	}
	return results.slice(0, 6);
};

// ---------- fares ----------
const TIERS = [17.99, 19.99, 21.99, 23.99, 25.99, 27.99, 29.99, 32.99, 34.99, 37.99, 39.99, 42.99, 45.99, 49.99, 52.99, 55.99, 59.99, 62.99, 65.99, 69.99, 72.99, 76.99, 79.99, 84.99, 89.99, 94.99, 99.99, 104.99, 109.99, 114.99, 119.99, 124.99, 129.99, 134.99, 139.99, 144.99, 149.99, 159.99, 169.99, 179.99, 189.99, 199.99];
const snap = (p) => TIERS.find((t) => t >= p) ?? Math.round(p) - 0.01;
const RATE = { ICE: 0.42, EC_IC: 0.34, REGIONAL: 0.25 };
const HUBS = new Set(["8011160", "8002549", "8000261", "8000105", "8000207", "8000096", "8000085", "8010205", "8000152", "8000284", "8010085", "8000080"]);
const priceFor = (journey, req) => {
	const first = journey[0], last = journey.at(-1);
	const fromId = first.run.stops[first.fi].id, toId = last.run.stops[last.ti].id;
	const dep = first.run.stops[first.fi].dep;
	const klasse = req.klasse || "KLASSE_2";
	const reisender = req.reisendenProfil?.reisende?.[0] || {};
	const erm = (reisender.ermaessigungen?.[0] || "").split(" ")[0];
	const age = reisender.alter;
	const dticket = req.fahrverguenstigungen?.deutschlandTicketVorhanden;
	const regionalOnly = journey.every((l) => l.run.c.product === "REGIONAL");

	let flex = 0;
	for (const l of journey) {
		const mins = (l.run.stops[l.ti].arr - l.run.stops[l.fi].dep) / MIN;
		flex += mins * RATE[l.run.c.product];
	}
	if (regionalOnly) flex = 3.4 + flex * 0.85; // Nahverkehr tariff: base fare + degressive per-km part
	flex = Math.max(flex, 6.2);
	if (klasse === "KLASSE_1") flex *= 1.62;

	let amount;
	if (regionalOnly) {
		if (dticket) return 0;
		amount = Math.round(flex * 10) / 10;
		if (erm === "BAHNCARD25") amount *= 0.75;
		if (erm === "BAHNCARD50") amount *= 0.5;
	} else {
		// Sparpreis contingent: depends on route popularity, train and departure hour
		let demand = 0.28 + 0.6 * hash(`${fromId}>${toId}@${dep}#${first.run.number}`);
		if (HUBS.has(fromId) && HUBS.has(toId)) demand += 0.18;
		const hour = new Date(dep + 3600_000).getUTCHours();
		if (hour >= 15 && hour <= 18) demand += 0.08;
		if (demand >= 0.97) {
			amount = Math.floor(flex) + 0.9; // only Flexpreis left
			if (erm === "BAHNCARD25") amount *= 0.75;
			if (erm === "BAHNCARD50") amount *= 0.5;
		} else {
			amount = snap(flex * demand);
			if (erm === "BAHNCARD25" || erm === "BAHNCARD50") amount *= 0.75;
		}
	}
	if (age !== undefined && age < 6) return 0;
	if (age !== undefined && age < 15) amount *= 0.5;
	else if (age !== undefined && age < 27 && !regionalOnly) amount *= 0.9;
	else if (age !== undefined && age >= 65 && !regionalOnly) amount *= 0.9;
	return Math.round(amount * 100) / 100;
};

// ---------- raw dbnav serialization ----------
const LOAD = (seed) => {
	const h = hash(seed);
	const s2 = h < 0.45 ? 1 : h < 0.8 ? 2 : h < 0.95 ? 3 : 4;
	return [{ klasse: "KLASSE_1", stufe: Math.max(1, s2 - 1) }, { klasse: "KLASSE_2", stufe: s2 }];
};
const platform = (stationId, run) => {
	const big = HUBS.has(stationId);
	const n = big ? 14 : 6;
	return String(1 + Math.floor(hash(stationId + run.corridorId + (run.number % 2)) * n));
};
const ort = (id) => {
	const s = STATIONS[id];
	return { name: s.name, locationId: locId(id), evaNr: id, position: { latitude: s.lat, longitude: s.lon }, typ: "ST" };
};
const serializeLeg = ({ run, fi, ti }) => {
	const c = run.c;
	const name = c.line ? `${c.kurz} ${c.line.replace(/\D/g, "")}` : `${c.kurz} ${run.number}`;
	const halte = run.stops.slice(fi, ti + 1).map((s, i, arr) => ({
		ort: ort(s.id),
		ankunftsDatum: i === 0 ? undefined : iso(s.arr),
		abgangsDatum: i === arr.length - 1 ? undefined : iso(s.dep),
		gleis: platform(s.id, run),
		auslastungsInfos: c.product === "REGIONAL" ? undefined : LOAD(run.key + s.id),
	}));
	const dep = run.stops[fi].dep, arr = run.stops[ti].arr;
	return {
		typ: "FAHRZEUG",
		abgangsDatum: iso(dep),
		ankunftsDatum: iso(arr),
		abgangsOrt: ort(run.stops[fi].id),
		ankunftsOrt: ort(run.stops[ti].id),
		abschnittsDauer: (arr - dep) / 1000,
		zuglaufId: `2|#VN#1#ST#1763065012#PI#0#ZI#${Math.floor(hash(run.key) * 900000)}#TA#0#DA#${compact(dep).slice(2, 8)}#1S#${run.stops[0].id}#1T#${compact(run.stops[0].dep).slice(8)}#LS#${run.stops.at(-1).id}#LT#${compact(run.stops.at(-1).arr).slice(8)}#PU#80#RT#1#CA#${c.kurz}#ZE#${run.number}#ZB#${c.kurz}  ${run.number}#PC#${c.product === "ICE" ? 0 : c.product === "EC_IC" ? 1 : 3}#FR#${run.stops[0].id}#FT#${compact(run.stops[0].dep).slice(8)}#TO#${run.stops.at(-1).id}#TT#${compact(run.stops.at(-1).arr).slice(8)}#`,
		verkehrsmittel: {
			name,
			kurzText: c.kurz,
			mittelText: name,
			langText: c.line ? `${name} (${run.number})` : name,
			nummer: String(run.number),
			produktGattung: c.product,
			richtung: c.dir,
			typ: "PUBLICTRANSPORT",
		},
		halte,
		auslastungsInfos: c.product === "REGIONAL" ? undefined : LOAD(run.key),
	};
};
const serializeJourney = (journey, req) => {
	const first = journey[0], last = journey.at(-1);
	const dep = first.run.stops[first.fi].dep, arr = last.run.stops[last.ti].arr;
	const fromId = first.run.stops[first.fi].id, toId = last.run.stops[last.ti].id;
	const amount = priceFor(journey, req);
	return {
		kontext: `¶HKI¶T$${locId(fromId)}$${locId(toId)}$${compact(dep)}$${compact(arr)}$${journey.map((l) => `${l.run.c.kurz}  ${l.run.number}`).join("$")}$$1$$$$$$¶KC¶#VE#2#CF#100#CA#0#CM#0#SICT#0#AM#16465#AM2#0#RT#7#¶KRCC¶#VE#1#`,
		verbindungsAbschnitte: journey.map(serializeLeg),
		umstiegeAnzahl: journey.length - 1,
		reiseDauer: (arr - dep) / 1000,
		angebotsPreis: amount === undefined ? undefined : { betrag: amount, waehrung: "EUR" },
		hasTeilpreis: false,
		angebotsInformationen: [],
	};
};

// ---------- HTTP ----------
const readBody = (req) =>
	new Promise((resolve) => {
		let b = "";
		req.on("data", (c) => (b += c));
		req.on("end", () => {
			try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); }
		});
	});
const send = (res, status, obj, headers = {}) => {
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
	res.end(JSON.stringify(obj));
};

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, "http://localhost");
	try {
		// bahn.de: resolve a shared vbid
		let m = url.pathname.match(/^\/web\/api\/angebote\/verbindung\/([\w-]+)$/);
		if (m && req.method === "GET") {
			const trip = TRIP_BY_VBID.get(m[1]);
			if (!trip) return send(res, 404, { code: "VERBINDUNG_NICHT_GEFUNDEN" });
			return send(res, 200, {
				hinfahrtRecon: trip.recon,
				hinfahrtDatum: iso(trip.depMs).slice(0, 19),
				startOrt: trip.fromSt.name,
				zielOrt: trip.toSt.name,
				klasse: "KLASSE_2",
				reisende: [{ typ: "ERWACHSENER", anzahl: 1, alter: [], ermaessigungen: [{ art: "KEINE_ERMAESSIGUNG", klasse: "KLASSENLOS" }] }],
			}, { "Set-Cookie": `JSESSIONID=${trip.vbid.slice(0, 8).toUpperCase()}1C3B; Path=/; Secure; HttpOnly` });
		}
		if (url.pathname === "/web/api/angebote/recon" && req.method === "POST") {
			const body = await readBody(req);
			const trip = TRIP_BY_RECON.get(body.ctxRecon);
			if (!trip) return send(res, 400, { code: "RECON_FEHLGESCHLAGEN" });
			return send(res, 200, {
				verbindungen: [{
					verbindungsAbschnitte: trip.legs.map(({ run, fi, ti }) => ({
						halte: run.stops.slice(fi, ti + 1).map((s) => ({ id: locId(s.id), name: STATIONS[s.id].name })),
					})),
				}],
			});
		}
		// vendo mobile API: journey search
		if (url.pathname === "/mob/angebote/fahrplan" && req.method === "POST") {
			const body = await readBody(req);
			const w = body.reiseHin?.wunsch || {};
			const fromId = (w.abgangsLocationId || "").match(/L=(\d+)/)?.[1]?.replace(/^0+/, "");
			const toId = (w.zielLocationId || "").match(/L=(\d+)/)?.[1]?.replace(/^0+/, "");
			const when = Date.parse(w.zeitWunsch?.reiseDatum);
			if (!STATIONS[fromId] || !STATIONS[toId] || Number.isNaN(when)) {
				return send(res, 200, { verbindungen: [], verbindungReference: {} });
			}
			const journeys = searchJourneys(fromId, toId, when);
			// a little latency, like the real API
			await new Promise((r) => setTimeout(r, 120 + Math.floor(Math.random() * 250)));
			return send(res, 200, {
				verbindungen: journeys.map((j) => serializeJourney(j, body)),
				verbindungReference: { earlier: "¶GP¶0¶", later: "¶GP¶1¶" },
			}, { "Content-Type": "application/x.db.vendo.mob.verbindungssuche.v9+json" });
		}
		send(res, 404, { error: "not stubbed", path: url.pathname });
	} catch (e) {
		console.error(e);
		send(res, 500, { error: String(e) });
	}
});
server.listen(PORT, "127.0.0.1", () => console.log(`[db-stub] listening on http://127.0.0.1:${PORT} (${TRIPS.length} saved trips)`));
