// Local stand-ins for the two backend services OTelBin talks to server-side:
//
//  1. Upstash Redis REST API   -> http://localhost:$STUB_PORT/redis
//     (short links + rate limiting). File-backed so seeded short links persist.
//  2. OTelBin validation API (AWS API Gateway + Lambda running real collectors)
//                              -> http://localhost:$STUB_PORT/validation/...
//     Serves the repo's own supported-distributions.json and validates configs
//     with a rule-based approximation of `otelcol validate`, returning the same
//     {message, error, path} payload the Lambda returns.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const repoRoot = path.resolve(__dirname, "..", "..");
const appRequire = createRequire(path.join(repoRoot, "packages", "otelbin", "package.json"));
const YAML = appRequire("yaml");

const PORT = Number(process.env.STUB_PORT || 4411);
const DATA_FILE = process.env.REDIS_DATA_FILE || path.join(__dirname, "..", "data", "redis.json");
const distributions = JSON.parse(
	fs.readFileSync(
		path.join(repoRoot, "packages", "otelbin-validation", "src", "assets", "supported-distributions.json"),
		"utf8"
	)
);

// ---------------------------------------------------------------- redis ----
let store = {};
try {
	store = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
	store = {};
}
let saveTimer = null;
function persist() {
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
		fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 1));
	}, 50);
}

function runCommand(cmd) {
	const [name, ...args] = cmd;
	switch (String(name).toLowerCase()) {
		case "get":
			return store[args[0]] ?? null;
		case "set":
			store[args[0]] = String(args[1]);
			persist();
			return "OK";
		case "del": {
			let n = 0;
			for (const k of args) if (k in store) (delete store[k], n++);
			persist();
			return n;
		}
		case "exists":
			return args.filter((k) => k in store).length;
		case "keys": {
			const re = new RegExp("^" + String(args[0]).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
			return Object.keys(store).filter((k) => re.test(k));
		}
		case "ping":
			return "PONG";
		case "eval":
		case "evalsha":
			// @upstash/ratelimit sliding window script returns the remaining tokens.
			return 39;
		case "script":
			return "0b0b9a1f4c2d3e5f6a7b8c9d0e1f2a3b4c5d6e7f";
		default:
			// analytics counters (zincrby, hincrby, expire, ...) — accept silently
			return 0;
	}
}

function encode(value, b64) {
	if (!b64) return value;
	if (typeof value === "string") return Buffer.from(value).toString("base64");
	if (Array.isArray(value)) return value.map((v) => encode(v, b64));
	return value;
}

function handleRedis(req, res, body, subPath) {
	const b64 = String(req.headers["upstash-encoding"] || "").toLowerCase() === "base64";
	let parsed;
	try {
		parsed = JSON.parse(body || "null");
	} catch {
		return send(res, 400, { error: "ERR failed to parse command" });
	}
	if (subPath === "/pipeline" || subPath === "/multi-exec") {
		return send(
			res,
			200,
			parsed.map((c) => ({ result: encode(runCommand(c), b64) }))
		);
	}
	if (!Array.isArray(parsed)) {
		// GET /redis/get/key style
		const parts = subPath.split("/").filter(Boolean).map(decodeURIComponent);
		parsed = parts;
	}
	return send(res, 200, { result: encode(runCommand(parsed), b64) });
}

// ----------------------------------------------------------- validation ----
const CORE = {
	receivers: ["otlp", "nop"],
	processors: ["batch", "memory_limiter"],
	exporters: ["debug", "nop", "otlp", "otlphttp"],
	connectors: ["forward"],
	extensions: ["memory_limiter", "zpages"],
};
// The core *distribution* (otelcol) ships more than the core repo.
const OTELCOL = {
	receivers: [...CORE.receivers, "hostmetrics", "jaeger", "kafka", "opencensus", "prometheus", "zipkin"],
	processors: [
		...CORE.processors,
		"attributes",
		"filter",
		"probabilistic_sampler",
		"resource",
		"span",
	],
	exporters: [...CORE.exporters, "file", "kafka", "opencensus", "prometheus", "prometheusremotewrite", "zipkin"],
	connectors: [...CORE.connectors],
	extensions: [...CORE.extensions, "health_check", "pprof"],
};
const ADOT = {
	receivers: ["otlp", "awsecscontainermetrics", "awsxray", "jaeger", "prometheus", "statsd", "zipkin", "kafka", "filelog"],
	processors: [
		"batch",
		"memory_limiter",
		"attributes",
		"resource",
		"resourcedetection",
		"filter",
		"metricstransform",
		"probabilistic_sampler",
		"span",
		"cumulativetodelta",
		"deltatorate",
		"groupbytrace",
		"tail_sampling",
		"k8sattributes",
		"transform",
	],
	exporters: [
		"awsxray",
		"awsemf",
		"awscloudwatchlogs",
		"awss3",
		"debug",
		"file",
		"kafka",
		"logging",
		"otlp",
		"otlphttp",
		"prometheus",
		"prometheusremotewrite",
		"loadbalancing",
	],
	connectors: ["forward", "spanmetrics"],
	extensions: ["health_check", "pprof", "zpages", "sigv4auth", "ecs_observer", "awsproxy", "file_storage"],
};

function knownTypes(distro) {
	switch (distro) {
		case "otelcol-core":
			return OTELCOL;
		case "adot":
			return ADOT;
		default:
			return null; // contrib & splunk ship (nearly) everything
	}
}

function substituteEnv(config, env) {
	return config.replace(/\$\$|\$\{([^}]*)\}/g, (m, inner) => {
		if (m === "$$") return "$";
		let expr = inner;
		if (expr.startsWith("env:")) expr = expr.slice(4);
		else if (/^[A-Za-z][A-Za-z0-9+.-]+:/.test(expr)) return m;
		const [name, def] = expr.split(":-");
		return env[name] ?? def ?? "";
	});
}

const KINDS = ["receivers", "processors", "exporters", "connectors", "extensions"];
const SINGULAR = {
	receivers: "receiver",
	processors: "processor",
	exporters: "exporter",
	connectors: "connector",
	extensions: "extension",
};

function validate(distro, rawConfig, env) {
	const invalid = (error, pathArr) => ({
		...(pathArr ? { path: pathArr } : {}),
		message: "The provided configuration is invalid",
		error,
	});
	let doc;
	try {
		doc = YAML.parse(substituteEnv(rawConfig || "", env || {}));
	} catch (e) {
		return invalid(`cannot unmarshal the configuration: yaml: ${String(e.message).split("\n")[0]}`);
	}
	if (!doc || typeof doc !== "object" || Object.keys(doc).length === 0) {
		return invalid("the provided configuration is empty");
	}

	const types = knownTypes(distro);
	for (const kind of KINDS) {
		const section = doc[kind] || {};
		for (const id of Object.keys(section)) {
			const type = id.split("/")[0];
			if (types && !types[kind].includes(type)) {
				return invalid(
					`error decoding '${kind}': unknown type: "${type}" for id: "${id}" (valid values: [${[...types[kind]]
						.sort()
						.join(" ")}])`
				);
			}
		}
	}

	const service = doc.service || {};
	for (const ext of service.extensions || []) {
		if (!doc.extensions || !(ext in doc.extensions)) {
			return invalid(`service::extensions: references extension "${ext}" which is not configured`, [
				"service",
				"extensions",
			]);
		}
	}
	const pipelines = service.pipelines || {};
	if (Object.keys(pipelines).length === 0) {
		return invalid("service must have at least one pipeline");
	}
	for (const [pipeline, def] of Object.entries(pipelines)) {
		for (const [field, kind] of [
			["receivers", "receivers"],
			["processors", "processors"],
			["exporters", "exporters"],
		]) {
			for (const id of (def && def[field]) || []) {
				const inKind = doc[kind] && id in doc[kind];
				const asConnector = field !== "processors" && doc.connectors && id in doc.connectors;
				if (!inKind && !asConnector) {
					return invalid(
						`service::pipelines::${pipeline}: references ${SINGULAR[kind]} "${id}" which is not configured`,
						["service", "pipelines", pipeline]
					);
				}
			}
		}
		if (!def || !def.receivers || def.receivers.length === 0) {
			return invalid(`service::pipelines::${pipeline}: must have at least one receiver`, [
				"service",
				"pipelines",
				pipeline,
			]);
		}
		if (!def.exporters || def.exporters.length === 0) {
			return invalid(`service::pipelines::${pipeline}: must have at least one exporter`, [
				"service",
				"pipelines",
				pipeline,
			]);
		}
	}

	for (const [id, cfg] of Object.entries(doc.exporters || {})) {
		const type = id.split("/")[0];
		if ((type === "otlp" || type === "otlphttp") && !(cfg && (cfg.endpoint || cfg.traces_endpoint))) {
			return invalid(`exporters::${id}: requires a non-empty "endpoint"`, ["exporters", id]);
		}
	}
	for (const [id, cfg] of Object.entries(doc.receivers || {})) {
		const type = id.split("/")[0];
		if (type === "prometheus" && !(cfg && cfg.config && cfg.config.scrape_configs) && !(cfg && cfg.target_allocator)) {
			return invalid(`receivers::${id}: no Prometheus scrape_configs or target_allocator set`, ["receivers", id]);
		}
	}
	for (const [id, cfg] of Object.entries(doc.processors || {})) {
		const type = id.split("/")[0];
		if (type === "memory_limiter" && !(cfg && (cfg.limit_mib || cfg.limit_percentage))) {
			return invalid(`processors::${id}: 'limit_mib' or 'limit_percentage' must be greater than zero`, [
				"processors",
				id,
			]);
		}
	}
	return { message: "Configuration is valid" };
}

// --------------------------------------------------------------- server ----
function send(res, status, obj) {
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(JSON.stringify(obj));
}

http
	.createServer((req, res) => {
		let body = "";
		req.on("data", (c) => (body += c));
		req.on("end", () => {
			const url = new URL(req.url, "http://localhost");
			try {
				if (url.pathname.startsWith("/redis")) {
					return handleRedis(req, res, body, url.pathname.slice("/redis".length));
				}
				// Vercel Web Analytics (normally served by Vercel's edge at /_vercel/insights/*)
				if (url.pathname === "/_vercel/insights/script.js") {
					res.writeHead(200, {
						"Content-Type": "application/javascript; charset=utf-8",
						"Cache-Control": "public, max-age=3600",
					});
					return res.end(fs.readFileSync(path.join(__dirname, "vercel-insights-script.js")));
				}
				if (url.pathname === "/_vercel/insights/view" || url.pathname === "/_vercel/insights/event") {
					res.writeHead(200, { "Content-Type": "text/plain" });
					return res.end("OK");
				}
				if ("/validation/supported-distributions" === url.pathname) {
					return send(res, 200, distributions);
				}
				const m = url.pathname.match(/^\/validation\/([^/]+)\/([^/]+)$/);
				if (m && req.method === "POST") {
					const distro = decodeURIComponent(m[1]);
					const version = decodeURIComponent(m[2]);
					const d = distributions[distro];
					if (!d || !d.releases.some((r) => r.version === version)) {
						return send(res, 404, { message: `Unsupported distribution ${distro}@${version}` });
					}
					const payload = JSON.parse(body || "{}");
					// The Lambda takes ~1s to boot a collector; mimic that latency.
					return setTimeout(() => send(res, 200, validate(distro, payload.config, payload.env)), 700);
				}
				send(res, 404, { message: "Not Found" });
			} catch (e) {
				send(res, 500, { message: String(e) });
			}
		});
	})
	.listen(PORT, "127.0.0.1", () => console.log(`[stubs] redis + validation stub on http://localhost:${PORT}`));
