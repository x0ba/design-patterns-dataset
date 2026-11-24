/*
 * UI-capture seed loader (not part of Blockbench itself).
 * Injected into out/index.html before the app bundle by build_out.sh.
 *
 * 1. Offline network shim: rewrites requests to Blockbench's online services
 *    (news feed, plugin store CDN, blckbn.ch stats/telemetry, GitHub release API)
 *    to local stub files under ./stub/ so the app runs with no internet.
 * 2. Seeds browser storage the way an established web-app user would have it:
 *    localStorage (settings, color palette, startup count, recent actions, ...)
 *    and the IndexedDB "auto_backups" store that Blockbench uses to keep projects.
 * 3. Restores the backed-up projects through Blockbench's own AutoBackup API
 *    (same as clicking "Recover" on the start screen). Add ?start to the URL
 *    to land on the start screen instead.
 */
(function () {
	const SEED_VERSION = 'bb-seed-7';
	const base = new URL('.', document.currentScript ? document.currentScript.src : location.href).href.replace(/seed\/$/, '');

	// ---------- 1. network shim ----------
	const rules = [
		[/^https:\/\/web\.blockbench\.net\/content\/news\.json/, () => base + 'content/news.json'],
		[/^https:\/\/(?:cdn\.jsdelivr\.net\/gh\/JannisX11\/blockbench-plugins|blckbn\.ch\/cdn)\/plugins\.json/, () => base + 'stub/plugins/plugins.json'],
		[/^https:\/\/(?:cdn\.jsdelivr\.net\/gh\/JannisX11\/blockbench-plugins|blckbn\.ch\/cdn)\/updates\.json/, () => base + 'stub/plugins/updates.json'],
		[/^https:\/\/(?:cdn\.jsdelivr\.net\/gh\/JannisX11\/blockbench-plugins|blckbn\.ch\/cdn)\/plugins\/(.+)$/, m => base + 'stub/plugins/' + m[1].split('?')[0]],
		[/^https:\/\/blckbn\.ch\/api\/stats\/plugins/, () => base + 'stub/blckbn/plugin_stats.json'],
		[/^https:\/\/blckbn\.ch\/api\/event\//, () => base + 'stub/blckbn/ok.json'],
		[/^https:\/\/blckbn\.ch\/api\/models\/([a-z0-9]+)/i, m => base + 'stub/blckbn/models/' + m[1] + '.json'],
		[/^https:\/\/api\.github\.com\/repos\/JannisX11\/blockbench\/releases\/latest/, () => base + 'stub/github/release_latest.json'],
		[/^https:\/\/api\.github\.com\/repos\/JannisX11\/blockbench-plugins\/commits/, () => base + 'stub/github/plugin_commits.json'],
	];
	function rewrite(url) {
		if (typeof url !== 'string') return null;
		for (const [re, fn] of rules) {
			const m = url.match(re);
			if (m) return fn(m);
		}
		return null;
	}
	const origOpen = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function (method, url, ...rest) {
		let target = rewrite(String(url));
		if (target) {
			// static stubs only answer GET
			return origOpen.call(this, 'GET', target, ...rest);
		}
		return origOpen.call(this, method, url, ...rest);
	};
	const origFetch = window.fetch.bind(window);
	window.fetch = function (input, init) {
		let url = typeof input === 'string' ? input : (input && input.url);
		let target = rewrite(url);
		if (target) return origFetch(target, init && init.method && init.method !== 'GET' ? Object.assign({}, init, {method: 'GET', body: undefined}) : init);
		return origFetch(input, init);
	};
	// Plugin store icons are plain <img src="https://cdn.jsdelivr.net/...">
	function fixImg(img) {
		const t = rewrite(img.getAttribute('src'));
		if (t) img.setAttribute('src', t);
	}
	new MutationObserver(records => {
		for (const r of records) {
			if (r.type === 'attributes') { if (r.target.tagName === 'IMG') fixImg(r.target); continue; }
			r.addedNodes.forEach(n => {
				if (n.nodeType !== 1) return;
				if (n.tagName === 'IMG') fixImg(n);
				n.querySelectorAll && n.querySelectorAll('img[src^="https://"]').forEach(fixImg);
			});
		}
	}).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});

	// ---------- 2. storage seed ----------
	function syncGetJSON(path) {
		const x = new XMLHttpRequest();
		origOpen.call(x, 'GET', base + path, false);
		x.send();
		if (x.status !== 200) throw new Error('seed: failed to load ' + path);
		return JSON.parse(x.responseText);
	}

	let seed_promise = Promise.resolve();
	const first_seed = localStorage.getItem('ui_capture_seed') !== SEED_VERSION;
	if (first_seed) {
		try {
			const ls = syncGetJSON('seed/local_storage.json');
			for (const key in ls) {
				localStorage.setItem(key, typeof ls[key] === 'string' ? ls[key] : JSON.stringify(ls[key]));
			}
			const projects = syncGetJSON('seed/projects.json');
			seed_promise = new Promise((resolve) => {
				const req = indexedDB.open('auto_backups', 1);
				req.onupgradeneeded = () => req.result.createObjectStore('projects', {keyPath: 'uuid'});
				req.onsuccess = () => {
					const db = req.result;
					const tx = db.transaction('projects', 'readwrite');
					const store = tx.objectStore('projects');
					store.clear();
					for (const p of projects) store.put({uuid: p.uuid, name: p.name, date: p.date, data: JSON.stringify(p.model)});
					tx.oncomplete = () => { db.close(); localStorage.setItem('ui_capture_seed', SEED_VERSION); resolve(); };
					tx.onerror = () => { db.close(); resolve(); };
				};
				req.onerror = () => resolve();
			});
		} catch (err) {
			console.error(err);
		}
	}

	// ---------- 3. restore session ----------
	if (/[?&#]start\b/.test(location.search + location.hash)) return;
	const t0 = Date.now();
	function tryRestore() {
		const B = window.Blockbench, AB = window.AutoBackup;
		if (!B || !B.setup_successful || !AB || !AB.db || !window.ModelProject) {
			if (Date.now() - t0 < 30000) setTimeout(tryRestore, 100);
			return;
		}
		if (ModelProject.all.length) return;
		seed_promise.then(() => AB.recoverAllBackups(false)).then(() => {
			// Bring the project the user was last working on to the front
			let order = [];
			try { order = syncGetJSON('seed/session.json').focus_order || []; } catch (e) {}
			for (const name of order) {
				const p = ModelProject.all.find(p => p.name === name);
				if (p) { p.select(); break; }
			}
			// Clear "unsaved" markers of restored backups so tabs look like a normal session
			setTimeout(() => {
				ModelProject.all.forEach(p => { p.saved = true; });
				const sec = document.getElementById('recover_backup');
				if (sec) sec.remove();
			}, 300);
		});
	}
	setTimeout(tryRestore, 200);
})();
