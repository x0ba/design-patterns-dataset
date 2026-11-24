// Local launcher for Drawphone used by .ui-capture/start.sh.
//
// Mirrors server/bin/www.js, but mounts a few local stubs in front of the real
// Express app so nothing leaves localhost:
//   * rocketcrab.com party flow (Join Party / Start Party) -> /__stub/rocketcrab/*
//   * rocketcrab rocket/crab icons                       -> /__stub/rocketcrab/*.svg
//   * Google Fonts css (Mukta / Inconsolata)              -> /__stub/fonts/*
//   * Google Analytics analytics.js                       -> /__stub/google-analytics/analytics.js
//   * Shutterstock / 123RF image search used by bots      -> local SVG "stock photo" stub
//   * ml5 (DoodleNet/MobileNet) model download for bot guesses -> server-side stub guess
//   * drawphone.tannerkrewson.com/archive link            -> local /archive
// It also seeds the browser-side archive (IndexedDB "DrawphoneDatabase", the
// same Dexie schema the app uses) once per browser before the app bundle runs.
import http from "http";
import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";

import app from "../server/app.js";
import PlayerAI from "../server/app/player-ai.js";
import AIGuessQueue from "../server/app/ai-guess-queue.js";
import { openFriendsLobby, FRIENDS_CODE } from "./friends-lobby.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const port = parseInt(process.env.PORT || "4468", 10);

const assets = JSON.parse(
    fs.readFileSync(path.join(root, "webpack-assets.json"), "utf8")
);
const mainJs = assets.main.js;
const mainCss = assets.main.css;

// ---------- integration-boundary stubs ----------

// Bots "draw" by fetching a stock image for their word. Point them at a local stub.
const stockUrl = (word) =>
    `/__stub/stock-images/${encodeURIComponent(word)}.svg`;
PlayerAI.findImageOnShutterstock = async (word) => stockUrl(word);
PlayerAI.findImageOn123RF = async (word) => stockUrl(word);
PlayerAI.getRandomImage = async () => stockUrl("mystery");

// Bots "guess" by asking a connected browser to run ml5 (which downloads models
// from the internet). Offline, answer like the app's own fallback: a word from the pack.
AIGuessQueue.prototype.distributeWork = function () {
    while (this.workQueue.length > 0) {
        const { next } = this.workQueue.shift();
        setTimeout(
            () => next({ link: { type: "word", data: this.getRandomWord() } }),
            1500 + Math.random() * 2500
        );
    }
};

// ---------- outer app ----------
const outer = express();
const stubDir = path.join(here, "stub-assets");
const seedDir = path.join(here, "seed");

const rewriteHtml = (html) =>
    html
        .replace(
            "https://www.google-analytics.com/analytics.js",
            "/__stub/google-analytics/analytics.js"
        )
        .replace(/https:\/\/rocketcrab\.com\/rocket\.svg/g, "/__stub/rocketcrab/rocket.svg")
        .replace(/https:\/\/rocketcrab\.com\/crab\.svg/g, "/__stub/rocketcrab/crab.svg")
        .replace(/https:\/\/rocketcrab\.com\/join/g, "/__stub/rocketcrab/join")
        .replace(
            /https:\/\/rocketcrab\.com\/transfer\/drawphone/g,
            "/__stub/rocketcrab/transfer/drawphone"
        )
        .replace(/https:\/\/rocketcrab\.com"/g, '/__stub/rocketcrab/"')
        .replace(/https:\/\/drawphone\.tannerkrewson\.com\/archive/g, "/archive")
        .replace(
            `<script src="${mainJs}"></script>`,
            `<script src="/__stub/seed/dexie.min.js"></script>` +
                `<script src="/__stub/seed/seed-archive.js" data-main="/${mainJs}"></script>`
        );

outer.use((req, res, next) => {
    const send = res.send.bind(res);
    res.send = (body) => {
        if (typeof body === "string" && body.startsWith("<!DOCTYPE html")) {
            body = rewriteHtml(body);
        }
        return send(body);
    };
    next();
});

// bundled css: swap the Google Fonts @import for the local font stub
outer.get(`/${mainCss}`, (req, res) => {
    const css = fs
        .readFileSync(path.join(root, "server/public", mainCss), "utf8")
        .replace(
            /https:\/\/fonts\.googleapis\.com\/css2\?[^")]*/,
            "/__stub/fonts/css2"
        );
    res.type("text/css").send(css);
});

outer.get("/__stub/fonts/css2", (req, res) => {
    const face = (family, weight, file) => `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(/__stub/fonts/files/${file}.woff2) format('woff2');
}\n`;
    res.type("text/css").send(
        face("Inconsolata", 600, "inconsolata-latin-600-normal") +
            face("Mukta", 400, "mukta-latin-400-normal")
    );
});
outer.get("/__stub/fonts/files/:file", (req, res) => {
    const f = path.basename(req.params.file);
    const pkg = f.startsWith("mukta") ? "mukta" : "inconsolata";
    res.sendFile(path.join(stubDir, pkg, "package/files", f));
});

outer.get("/__stub/google-analytics/analytics.js", (req, res) => {
    // analytics.js stand-in: keeps window.ga a no-op queue
    res.type("application/javascript").send(
        "window.ga = window.ga || function(){(window.ga.q=window.ga.q||[]).push(arguments)};"
    );
});

outer.get("/__stub/rocketcrab/rocket.svg", (req, res) =>
    res.sendFile(path.join(stubDir, "rocket.svg"))
);
outer.get("/__stub/rocketcrab/crab.svg", (req, res) =>
    res.sendFile(path.join(stubDir, "crab.svg"))
);

// rocketcrab party stub: rocketcrab creates a Drawphone game via POST /new and
// then loads Drawphone with ?rocketcrab=true&name=..&code=..
const partyPage = (title, withCode) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>rocketcrab (local stub)</title>
<style>body{font-family:sans-serif;max-width:420px;margin:60px auto;text-align:center}
input,button{font-size:18px;padding:8px;margin:6px;width:80%}</style></head><body>
<h2>${title}</h2><p>Local stand-in for rocketcrab.com party lobby</p>
<form method="GET" action="/__stub/rocketcrab/go">
${withCode ? `<input name="code" placeholder="game code" required maxlength="4" autocomplete="off" value="${FRIENDS_CODE}">` : ""}
<input name="name" placeholder="your name" required minlength="3" maxlength="16">
<button type="submit">${withCode ? "Join" : "Start"}</button></form>
<p><a href="/">Back to Drawphone</a></p></body></html>`;
outer.get("/__stub/rocketcrab/join", (req, res) =>
    res.type("html").send(partyPage("Join a party", true))
);
outer.get("/__stub/rocketcrab/transfer/drawphone", (req, res) =>
    res.type("html").send(partyPage("Start a Drawphone party", false))
);
outer.get("/__stub/rocketcrab/", (req, res) => res.redirect("/__stub/rocketcrab/transfer/drawphone"));
outer.get("/__stub/rocketcrab/go", (req, res) => {
    const name = String(req.query.name || "Player").slice(0, 16);
    let code = String(req.query.code || "").toLowerCase().trim();
    if (!code) {
        code = app.drawphone.newGame().code;
    }
    res.redirect(
        `/?rocketcrab=true&name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`
    );
});

// local "stock photo" for bot drawings
outer.get("/__stub/stock-images/:word.svg", (req, res) => {
    const word = String(req.params.word).slice(0, 40).replace(/[<>&"]/g, "");
    let h = 0;
    for (const c of word) h = (h * 31 + c.charCodeAt(0)) % 360;
    res.type("image/svg+xml").send(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},55%,78%)"/><stop offset="1" stop-color="hsl(${(h + 60) % 360},50%,55%)"/></linearGradient></defs>
<rect width="500" height="500" fill="url(#g)"/>
<circle cx="370" cy="130" r="60" fill="hsl(${(h + 30) % 360},80%,88%)" opacity=".8"/>
<path d="M0 380 L140 250 L250 340 L340 270 L500 400 L500 500 L0 500Z" fill="hsl(${(h + 180) % 360},30%,35%)" opacity=".7"/>
<text x="250" y="470" font-family="Helvetica,Arial,sans-serif" font-size="34" text-anchor="middle" fill="#fff" opacity=".85">${word}</text>
</svg>`);
});

// archive seed
outer.get("/__stub/seed/dexie.min.js", (req, res) =>
    res.sendFile(path.join(root, "node_modules/dexie/dist/dexie.min.js"))
);
outer.use("/__stub/seed", express.static(seedDir));

outer.use(app);

const server = http.createServer(outer);
app.io.attach(server, { pingInterval: 15000, pingTimeout: 30000 });
server.listen(port, () => {
    console.log(`Drawphone (local capture setup) on http://localhost:${port}/`);
    openFriendsLobby(app.drawphone, port);
});
