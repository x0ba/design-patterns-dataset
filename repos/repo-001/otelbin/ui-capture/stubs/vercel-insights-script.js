/* Local stand-in for Vercel Web Analytics' /_vercel/insights/script.js.
 * Drains the window.vaq queue that @vercel/analytics sets up, and reports page
 * views / custom events to /_vercel/insights/{view,event} like the real script. */
(function () {
	var script = document.currentScript;
	var endpoint = (script && script.dataset.endpoint) || "/_vercel/insights";
	var beforeSend = null;
	function send(kind, payload) {
		var body = Object.assign({ o: location.href, ts: Date.now(), r: document.referrer || "" }, payload);
		if (beforeSend) {
			body = beforeSend(Object.assign({ type: kind === "view" ? "pageview" : "event", url: body.o }, body));
			if (!body) return;
		}
		try {
			fetch(endpoint + "/" + kind, {
				method: "POST",
				keepalive: true,
				headers: { "Content-Type": "text/plain" },
				body: JSON.stringify(body),
			}).catch(function () {});
		} catch (e) {}
	}
	function handle(args) {
		var cmd = args[0];
		if (cmd === "beforeSend") beforeSend = args[1];
		else if (cmd === "event") send("event", { en: args[1] && args[1].name, ed: args[1] && args[1].data });
		else if (cmd === "pageview") send("view", { o: (args[1] && args[1].path) || location.href });
	}
	var queue = window.vaq || [];
	window.va = function () {
		handle(Array.prototype.slice.call(arguments));
	};
	queue.forEach(handle);
	window.vaq = [];
	if (!(script && script.dataset.disableAutoTrack)) send("view", {});
})();
