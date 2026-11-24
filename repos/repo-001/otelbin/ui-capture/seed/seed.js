// Seeds OTelBin short links through the app's own POST /s/new endpoint.
// Usage: node seed/seed.js http://localhost:5409   (app + stubs must be running)
const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");
const appDir = path.resolve(__dirname, "..", "..", "packages", "otelbin");
const appRequire = createRequire(path.join(appDir, "package.json"));
const ts = appRequire("typescript");

// Use the app's own jsurl2 serializer so URLs are byte-identical to what the UI produces.
const src = fs.readFileSync(path.join(appDir, "src/lib/urlState/jsurl2.ts"), "utf8");
const js = ts.transpileModule(src, {
	compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const { stringify } = mod.exports;

const base = process.argv[2] || "http://localhost:5409";
const publicOrigin = process.env.PUBLIC_ORIGIN || "http://localhost:4409";
const configs = require("./configs");

(async () => {
	const links = {};
	for (const c of configs) {
		const usp = new URLSearchParams();
		usp.set("config", stringify(c.config));
		if (c.distro) usp.set("distro", stringify(c.distro));
		if (c.distroVersion) usp.set("distroVersion", stringify(c.distroVersion));
		if (c.env) usp.set("env", stringify(c.env));
		const longURL = `${publicOrigin}/?#${usp.toString()}`;
		const res = await fetch(`${base}/s/new`, { method: "POST", body: longURL });
		if (!res.ok) throw new Error(`${c.key}: ${res.status} ${await res.text()}`);
		const { shortLink } = await res.json();
		links[c.key] = { path: new URL(shortLink).pathname, hash: "#" + usp.toString() };
		console.log(`${c.key.padEnd(34)} ${new URL(shortLink).pathname}`);
	}
	fs.writeFileSync(path.join(__dirname, "links.json"), JSON.stringify(links, null, 2));
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
