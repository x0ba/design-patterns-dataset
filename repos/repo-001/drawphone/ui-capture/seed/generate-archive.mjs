// Generates .ui-capture/seed/archive.json: months of past Drawphone games as the
// app saves them on a device (client/archive.js -> {date, chains}), where each
// chain is {owner, id, links:[{type, data, player}]} and drawings are
// "data:image/svg+xml;base64,<fabric.js toSVG()>" exactly like client/screen/game.js.
//
// usage: node .ui-capture/seed/generate-archive.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

// ---------- deterministic rng ----------
let seed = 20260317;
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// ---------- shape helpers (0..100 space) ----------
const arc = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 20) => {
    const p = [];
    for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return p;
};
const circ = (cx, cy, r, n) => arc(cx, cy, r, r, 0, Math.PI * 2, n || 22);
const line = (...pts) => pts;
const rect = (x, y, w, h) => [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
    [x, y + 0.5],
];
const S = (p, c, w) => ({ p, c, w });

const BLACK = "rgb(0,0,0)";
const RED = "rgb(199,24,24)";
const GREEN = "rgb(16,172,16)";
const BLUE = "rgb(26,121,175)";
const YELLOW = "rgb(242,201,26)";
const ORANGE = "rgb(240,133,22)";
const BROWN = "rgb(122,74,33)";
const PINK = "rgb(236,110,173)";
const PURPLE = "rgb(128,62,170)";
const GREY = "rgb(120,120,120)";

// ---------- doodles ----------
const D = {
    house: () => [
        S(rect(25, 45, 50, 40)),
        S(line([20, 47], [50, 18], [80, 47])),
        S(rect(44, 63, 13, 22), BROWN),
        S(rect(31, 52, 9, 9), BLUE),
        S(rect(61, 52, 9, 9), BLUE),
        S(line([65, 30], [65, 20], [71, 20], [71, 36])),
    ],
    cat: () => [
        S(circ(50, 40, 18)),
        S(line([36, 29], [38, 14], [46, 23])),
        S(line([55, 23], [63, 14], [64, 29])),
        S(circ(43, 38, 2, 8)),
        S(circ(57, 38, 2, 8)),
        S(line([47, 46], [50, 49], [53, 46])),
        S(line([30, 44], [44, 46])),
        S(line([56, 46], [71, 44])),
        S(arc(50, 74, 20, 17, Math.PI * 1.15, Math.PI * 3.85)),
        S(line([69, 80], [82, 70], [84, 55])),
    ],
    dog: () => [
        S(arc(50, 40, 17, 16)),
        S(arc(32, 42, 6, 14, -Math.PI / 2, Math.PI * 1.5), BROWN),
        S(arc(68, 42, 6, 14, -Math.PI / 2, Math.PI * 1.5), BROWN),
        S(circ(44, 37, 2, 8)),
        S(circ(56, 37, 2, 8)),
        S(circ(50, 46, 3, 10)),
        S(arc(50, 50, 6, 4, 0, Math.PI, 8)),
        S(line([46, 55], [50, 62], [54, 55]), PINK),
        S(arc(50, 78, 22, 14, Math.PI, Math.PI * 2)),
        S(line([28, 78], [72, 78])),
    ],
    sun: () => {
        const s = [S(circ(50, 50, 17), YELLOW)];
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            s.push(
                S(
                    line(
                        [50 + Math.cos(a) * 23, 50 + Math.sin(a) * 23],
                        [50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36]
                    ),
                    ORANGE
                )
            );
        }
        s.push(S(circ(44, 46, 1.5, 6)), S(circ(56, 46, 1.5, 6)), S(arc(50, 53, 7, 5, 0.2, Math.PI - 0.2, 8)));
        return s;
    },
    tree: () => [
        S(line([45, 90], [46, 58], [44, 52]), BROWN),
        S(line([55, 90], [54, 58], [57, 52]), BROWN),
        S(arc(50, 38, 26, 22), GREEN),
        S(arc(38, 46, 12, 9, 0.5, 3.5, 10), GREEN),
        S(line([38, 90], [62, 90]), GREEN),
    ],
    car: () => [
        S(line([12, 66], [14, 52], [30, 50], [38, 36], [64, 36], [74, 50], [88, 54], [88, 66], [76, 66])),
        S(line([60, 66], [38, 66])),
        S(line([22, 66], [12, 66])),
        S(circ(30, 68, 8), BLACK),
        S(circ(68, 68, 8), BLACK),
        S(line([41, 40], [37, 49], [54, 49], [54, 40], [41, 40]), BLUE),
        S(line([58, 40], [58, 49], [70, 49], [63, 40], [58, 40]), BLUE),
    ],
    fish: () => [
        S(arc(45, 50, 26, 15)),
        S(line([70, 50], [88, 36], [86, 64], [70, 50])),
        S(circ(30, 46, 2.5, 8)),
        S(arc(38, 50, 6, 10, -1.2, 1.2, 8)),
        S(line([14, 30], [16, 26])),
        S(circ(18, 22, 3, 8), BLUE),
        S(circ(24, 13, 2, 8), BLUE),
    ],
    bird: () => [
        S(arc(48, 54, 22, 14)),
        S(circ(70, 40, 9)),
        S(line([78, 39], [88, 42], [78, 44]), ORANGE),
        S(circ(72, 38, 1.2, 6)),
        S(line([40, 52], [52, 40], [58, 54])),
        S(line([26, 52], [12, 46], [14, 58], [26, 58])),
        S(line([44, 68], [44, 80], [40, 84])),
        S(line([52, 68], [52, 80], [56, 84])),
    ],
    boat: () => [
        S(line([15, 62], [85, 62], [74, 78], [26, 78], [15, 62]), BROWN),
        S(line([50, 62], [50, 15])),
        S(line([50, 18], [74, 54], [50, 54]), RED),
        S(line([8, 85], [20, 81], [32, 86], [44, 81], [56, 86], [68, 81], [80, 86], [92, 82]), BLUE),
    ],
    rocket: () => [
        S(line([40, 72], [40, 35], [50, 12], [60, 35], [60, 72], [40, 72])),
        S(circ(50, 40, 6), BLUE),
        S(line([40, 58], [28, 74], [40, 70])),
        S(line([60, 58], [72, 74], [60, 70])),
        S(line([43, 74], [46, 88], [50, 80], [54, 90], [57, 74]), ORANGE),
        S(circ(18, 20, 1, 6)),
        S(circ(80, 26, 1, 6)),
        S(circ(76, 84, 1, 6)),
    ],
    pizza: () => [
        S(line([50, 88], [18, 22], [82, 22], [50, 88])),
        S(arc(50, 22, 33, 7, Math.PI, Math.PI * 2, 14), BROWN),
        S(circ(42, 36, 5), RED),
        S(circ(60, 34, 5), RED),
        S(circ(51, 55, 5), RED),
        S(line([36, 45], [38, 47])),
        S(line([60, 48], [62, 46])),
    ],
    hotdog: () => [
        S(arc(50, 52, 38, 13), BROWN),
        S(arc(50, 50, 40, 9, 0, Math.PI * 2, 22), RED),
        S(line([16, 48], [24, 44], [32, 50], [40, 44], [48, 50], [56, 44], [64, 50], [72, 44], [82, 48]), YELLOW),
    ],
    snowman: () => [
        S(circ(50, 72, 18)),
        S(circ(50, 44, 13)),
        S(circ(50, 22, 9)),
        S(line([42, 13], [58, 13], [56, 2], [44, 2], [42, 13])),
        S(line([50, 22], [62, 24], [50, 25]), ORANGE),
        S(line([38, 44], [20, 34], [16, 30])),
        S(line([62, 44], [80, 34], [84, 30])),
        S(circ(50, 64, 1.5, 6)),
        S(circ(50, 74, 1.5, 6)),
    ],
    flower: () => {
        const s = [S(line([50, 52], [50, 92]), GREEN), S(arc(40, 76, 9, 4, 0, Math.PI * 2, 10), GREEN)];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            s.push(S(arc(50 + Math.cos(a) * 13, 36 + Math.sin(a) * 13, 8, 8, 0, Math.PI * 2, 12), PINK));
        }
        s.push(S(circ(50, 36, 6), YELLOW));
        return s;
    },
    guitar: () => [
        S(arc(42, 70, 16, 14)),
        S(arc(55, 52, 11, 10)),
        S(circ(46, 64, 4)),
        S(line([52, 58], [80, 18])),
        S(line([56, 61], [84, 21])),
        S(rect(79, 10, 9, 10), BROWN),
    ],
    mug: () => [
        S(line([28, 32], [30, 82], [66, 82], [68, 32])),
        S(arc(48, 32, 20, 5)),
        S(arc(70, 56, 10, 12, -Math.PI / 2, Math.PI / 2, 10)),
        S(line([40, 24], [44, 16], [40, 8]), GREY),
        S(line([52, 24], [56, 16], [52, 8]), GREY),
    ],
    phone: () => [
        S(rect(32, 12, 36, 74)),
        S(rect(36, 20, 28, 54), BLUE),
        S(circ(50, 80, 2.5, 8)),
    ],
    hat: () => [
        S(arc(50, 70, 36, 8)),
        S(line([32, 69], [34, 30], [66, 30], [68, 69])),
        S(arc(50, 30, 16, 4)),
        S(line([33, 60], [67, 60]), RED),
    ],
    star: () => {
        const p = [];
        for (let i = 0; i <= 10; i++) {
            const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
            const r = i % 2 ? 15 : 36;
            p.push([50 + Math.cos(a) * r, 52 + Math.sin(a) * r]);
        }
        return [S(p, YELLOW)];
    },
    moon: () => [
        S(arc(50, 50, 30, 30, Math.PI * 0.35, Math.PI * 1.65, 20).concat(arc(62, 50, 24, 26, Math.PI * 1.55, Math.PI * 0.45, 16)), YELLOW),
        S(circ(84, 20, 1.3, 6)),
        S(circ(16, 80, 1.3, 6)),
        S(circ(80, 76, 1.3, 6)),
    ],
    umbrella: () => [
        S(arc(50, 45, 36, 26, Math.PI, Math.PI * 2, 18).concat([[14, 45], [26, 41], [38, 45], [50, 41], [62, 45], [74, 41], [86, 45]]), PURPLE),
        S(line([50, 45], [50, 80]).concat(arc(44, 80, 6, 6, 0, Math.PI, 8))),
        S(line([20, 60], [18, 66])),
        S(line([80, 62], [78, 68])),
        S(line([68, 78], [66, 84])),
    ],
    icecream: () => [
        S(line([34, 46], [50, 90], [66, 46]), ORANGE),
        S(line([40, 56], [60, 52])),
        S(arc(50, 38, 17, 15, Math.PI * 0.95, Math.PI * 2.05, 18), PINK),
        S(circ(50, 18, 4), RED),
    ],
    apple: () => [
        S(arc(50, 56, 26, 27), RED),
        S(line([50, 32], [52, 18]), BROWN),
        S(arc(60, 22, 8, 4, 0, Math.PI * 2, 10), GREEN),
    ],
    ghost: () => [
        S(arc(50, 40, 24, 24, Math.PI, Math.PI * 2, 16).concat([[74, 80], [66, 74], [58, 82], [50, 74], [42, 82], [34, 74], [26, 80], [26, 40]])),
        S(arc(42, 40, 3, 5, 0, Math.PI * 2, 8)),
        S(arc(58, 40, 3, 5, 0, Math.PI * 2, 8)),
        S(arc(50, 54, 4, 5, 0, Math.PI * 2, 8)),
    ],
    snake: () => [
        S(line([12, 78], [26, 66], [40, 76], [54, 64], [64, 52], [56, 40], [44, 34], [50, 22], [66, 18], [78, 24]), GREEN),
        S(line([16, 84], [28, 74], [42, 84], [58, 72], [70, 54], [62, 36], [52, 32], [56, 26], [66, 26], [80, 30]), GREEN),
        S(circ(72, 22, 1.2, 6)),
        S(line([82, 28], [90, 28], [94, 25]), RED),
        S(line([90, 28], [94, 31]), RED),
    ],
    spider: () => {
        const s = [S(circ(50, 54, 13)), S(circ(50, 36, 7)), S(line([50, 2], [50, 29]), GREY)];
        for (let i = 0; i < 4; i++) {
            const y = 46 + i * 6;
            s.push(S(line([39, y], [24, y - 10 + i * 3], [16, y + 6])));
            s.push(S(line([61, y], [76, y - 10 + i * 3], [84, y + 6])));
        }
        s.push(S(circ(47, 35, 1, 6), RED), S(circ(53, 35, 1, 6), RED));
        return s;
    },
    robot: () => [
        S(rect(34, 16, 32, 24)),
        S(rect(30, 44, 40, 34)),
        S(circ(43, 26, 3, 8), RED),
        S(circ(57, 26, 3, 8), RED),
        S(line([42, 34], [58, 34])),
        S(line([50, 16], [50, 8])),
        S(circ(50, 6, 2, 8)),
        S(line([30, 50], [16, 62], [18, 70])),
        S(line([70, 50], [84, 62], [82, 70])),
        S(line([40, 78], [40, 92])),
        S(line([60, 78], [60, 92])),
        S(rect(42, 52, 16, 10), BLUE),
    ],
    castle: () => [
        S(line([16, 88], [16, 30], [22, 30], [22, 36], [28, 36], [28, 30], [34, 30], [34, 50], [66, 50], [66, 30], [72, 30], [72, 36], [78, 36], [78, 30], [84, 30], [84, 88], [16, 88]), GREY),
        S(arc(50, 74, 8, 12, Math.PI, Math.PI * 2, 10).concat([[58, 88], [42, 88], [42, 74]]), BROWN),
        S(line([25, 30], [25, 14]), BLACK),
        S(line([25, 14], [36, 18], [25, 22]), RED),
    ],
    mountain: () => [
        S(line([4, 84], [34, 30], [52, 58], [68, 38], [96, 84], [4, 84]), GREY),
        S(line([26, 44], [34, 30], [42, 44], [37, 41], [32, 46], [26, 44])),
        S(circ(80, 18, 8), ORANGE),
    ],
    cloud: () => [
        S(arc(32, 46, 14, 12, Math.PI * 0.5, Math.PI * 1.6, 10).concat(arc(52, 34, 18, 16, Math.PI * 1.1, Math.PI * 1.95, 10), arc(70, 46, 14, 12, Math.PI * 1.4, Math.PI * 2.5, 10), [[32, 58]]), BLUE),
        S(line([34, 68], [30, 78]), BLUE),
        S(line([50, 68], [46, 80]), BLUE),
        S(line([66, 68], [62, 78]), BLUE),
    ],
    octopus: () => {
        const s = [S(arc(50, 36, 22, 20, Math.PI, Math.PI * 2, 16).concat([[72, 50], [28, 50], [28, 36]]), PURPLE)];
        for (let i = 0; i < 6; i++) {
            const x = 30 + i * 8;
            s.push(S(line([x, 50], [x - 4, 62], [x + 3, 72], [x - 2, 84]), PURPLE));
        }
        s.push(S(circ(42, 36, 2.5, 8)), S(circ(58, 36, 2.5, 8)));
        return s;
    },
    elephant: () => [
        S(arc(56, 56, 26, 18)),
        S(circ(28, 44, 12)),
        S(line([20, 50], [16, 68], [12, 80], [18, 82])),
        S(arc(36, 42, 8, 12, -1.8, 1.8, 10)),
        S(circ(24, 40, 1.5, 6)),
        S(line([40, 70], [40, 86], [48, 86], [48, 72])),
        S(line([66, 72], [66, 86], [74, 86], [74, 70])),
        S(line([82, 54], [88, 62])),
    ],
    airplane: () => [
        S(arc(50, 50, 38, 7)),
        S(line([46, 46], [34, 18], [42, 18], [60, 46])),
        S(line([46, 54], [34, 82], [42, 82], [60, 54])),
        S(line([14, 48], [8, 36], [14, 36], [20, 46])),
        S(circ(70, 49, 2, 8), BLUE),
        S(circ(78, 49, 2, 8), BLUE),
    ],
    balloon: () => [
        S(arc(50, 36, 18, 22), RED),
        S(line([47, 58], [50, 62], [53, 58]), RED),
        S(line([50, 62], [46, 72], [54, 80], [48, 92])),
        S(arc(44, 28, 5, 7, Math.PI * 1.1, Math.PI * 1.6, 6)),
    ],
    bee: () => [
        S(arc(50, 56, 22, 15), YELLOW),
        S(line([44, 42], [44, 70])),
        S(line([54, 42], [54, 70])),
        S(arc(40, 32, 9, 12, 0, Math.PI * 2, 12), BLUE),
        S(arc(58, 30, 9, 12, 0, Math.PI * 2, 12), BLUE),
        S(circ(32, 52, 1.5, 6)),
        S(line([72, 56], [80, 56])),
        S(line([20, 70], [16, 66], [12, 72], [8, 66]), GREY),
    ],
    cookie: () => [
        S(arc(50, 50, 32, 31), BROWN),
        S(circ(38, 38, 3, 8)),
        S(circ(60, 34, 3, 8)),
        S(circ(52, 54, 3, 8)),
        S(circ(36, 62, 3, 8)),
        S(circ(66, 62, 3, 8)),
    ],
    eye: () => [
        S(arc(50, 50, 36, 18, Math.PI, Math.PI * 2, 14).concat(arc(50, 50, 36, 18, 0, Math.PI, 14))),
        S(circ(50, 50, 12), BLUE),
        S(circ(50, 50, 4, 8)),
        S(line([30, 36], [26, 28])),
        S(line([42, 33], [40, 24])),
        S(line([56, 33], [58, 24])),
        S(line([70, 36], [74, 28])),
    ],
    bridge: () => [
        S(line([4, 50], [96, 50])),
        S(line([4, 56], [96, 56])),
        S(arc(30, 80, 22, 22, Math.PI, Math.PI * 2, 12)),
        S(arc(74, 80, 22, 22, Math.PI, Math.PI * 2, 12)),
        S(line([4, 86], [16, 82], [30, 88], [46, 82], [60, 88], [76, 82], [96, 86]), BLUE),
    ],
    snail: () => [
        S(arc(52, 52, 20, 20, 0, Math.PI * 2, 20).concat(arc(52, 54, 13, 12, 0, Math.PI * 1.6, 12), arc(50, 54, 6, 6, Math.PI * 1.6, Math.PI * 3, 8)), ORANGE),
        S(line([14, 74], [86, 74], [86, 70], [74, 62])),
        S(line([20, 74], [18, 56], [14, 44])),
        S(line([22, 64], [26, 46])),
        S(circ(14, 42, 2, 6)),
        S(circ(26, 44, 2, 6)),
    ],
    turtle: () => [
        S(arc(50, 56, 28, 18, Math.PI, Math.PI * 2, 16).concat([[22, 58], [78, 58]]), GREEN),
        S(line([38, 42], [44, 56])),
        S(line([62, 42], [56, 56])),
        S(line([40, 46], [60, 46])),
        S(circ(84, 52, 7)),
        S(circ(86, 50, 1, 6)),
        S(line([30, 58], [28, 68], [36, 68], [38, 58])),
        S(line([62, 58], [64, 68], [72, 68], [70, 58])),
        S(line([22, 56], [14, 60])),
    ],
    cactus: () => [
        S(line([42, 88], [42, 22]).concat(arc(50, 22, 8, 8, Math.PI, Math.PI * 2, 8), [[58, 88]]), GREEN),
        S(line([42, 56], [30, 56], [28, 36], [34, 36], [36, 50], [42, 50]), GREEN),
        S(line([58, 46], [70, 46], [72, 30], [66, 30], [64, 40], [58, 40]), GREEN),
        S(line([30, 88], [70, 88], [64, 96], [36, 96], [30, 88]), ORANGE),
    ],
    lightbulb: () => [
        S(arc(50, 38, 22, 22, Math.PI * 0.75, Math.PI * 2.25, 20).concat([[58, 70], [42, 70], [42, 58]]), YELLOW),
        S(rect(42, 70, 16, 12), GREY),
        S(line([44, 74], [56, 74])),
        S(line([44, 78], [56, 78])),
        S(line([46, 56], [46, 44], [50, 48], [54, 44], [54, 56])),
        S(line([16, 30], [8, 26])),
        S(line([84, 30], [92, 26])),
        S(line([50, 8], [50, 2])),
    ],
    key: () => [
        S(circ(28, 50, 13), YELLOW),
        S(circ(28, 50, 4, 8)),
        S(line([41, 50], [88, 50], [88, 60], [82, 60], [82, 54], [76, 54], [76, 62], [70, 62], [70, 54]), YELLOW),
    ],
    crown: () => [
        S(line([20, 70], [16, 30], [34, 50], [50, 24], [66, 50], [84, 30], [80, 70], [20, 70]), YELLOW),
        S(circ(50, 58, 4), RED),
        S(circ(34, 60, 3), BLUE),
        S(circ(66, 60, 3), BLUE),
    ],
    ladder: () => {
        const s = [S(line([34, 8], [30, 92]), BROWN), S(line([66, 8], [70, 92]), BROWN)];
        for (let y = 18; y < 92; y += 12) s.push(S(line([33, y], [67, y]), BROWN));
        return s;
    },
    bed: () => [
        S(line([10, 40], [10, 84])),
        S(line([90, 56], [90, 84])),
        S(line([10, 70], [90, 70])),
        S(rect(14, 56, 76, 14), BLUE),
        S(arc(24, 52, 9, 5)),
        S(line([10, 84], [10, 90])),
        S(line([16, 46], [20, 42], [24, 46])),
    ],
    glasses: () => [
        S(circ(30, 50, 14)),
        S(circ(70, 50, 14)),
        S(arc(50, 50, 6, 4, Math.PI, Math.PI * 2, 6)),
        S(line([16, 48], [6, 40])),
        S(line([84, 48], [94, 40])),
    ],
    banana: () => [
        S(arc(48, 30, 36, 46, Math.PI * 0.2, Math.PI * 0.85, 14).concat(arc(48, 26, 30, 40, Math.PI * 0.85, Math.PI * 0.2, 14)), YELLOW),
        S(line([76, 62], [82, 58]), BROWN),
    ],
    carrot: () => [
        S(line([40, 30], [56, 90], [62, 30], [40, 30]), ORANGE),
        S(line([46, 46], [52, 46])),
        S(line([50, 62], [56, 62])),
        S(line([50, 30], [42, 12])),
        S(line([52, 30], [52, 10]), GREEN),
        S(line([54, 30], [64, 14]), GREEN),
    ],
    stickman: () => [
        S(circ(50, 20, 9)),
        S(line([50, 29], [50, 60])),
        S(line([30, 40], [50, 36], [70, 40])),
        S(line([38, 84], [50, 60], [62, 84])),
        S(arc(50, 22, 4, 3, 0.2, Math.PI - 0.2, 6)),
    ],
    bike: () => [
        S(circ(26, 66, 15)),
        S(circ(74, 66, 15)),
        S(line([26, 66], [42, 42], [66, 42], [74, 66])),
        S(line([42, 42], [52, 66], [66, 42])),
        S(line([40, 36], [46, 36])),
        S(line([64, 42], [62, 32], [70, 30])),
    ],
    trex: () => [
        S(line([20, 84], [26, 60], [16, 52], [24, 40], [34, 30], [52, 28], [62, 32], [64, 40], [50, 42], [46, 50], [62, 58], [84, 62], [94, 70], [70, 72], [56, 70], [52, 84]), GREEN),
        S(circ(52, 33, 1.5, 6)),
        S(line([46, 50], [52, 54], [54, 50])),
        S(line([54, 40], [56, 38], [58, 40])),
    ],
    volcano: () => [
        S(line([8, 88], [38, 34], [62, 34], [92, 88], [8, 88]), BROWN),
        S(line([38, 34], [44, 44], [50, 36], [56, 46], [62, 34]), RED),
        S(line([46, 30], [40, 14]), ORANGE),
        S(line([50, 30], [52, 8]), ORANGE),
        S(line([54, 30], [64, 16]), ORANGE),
        S(arc(50, 8, 12, 5), GREY),
    ],
};

// ---------- concepts: surface words + what a drawing is often mistaken for ----------
// starts: prompts the word pack / players come up with that get drawn as this doodle
// guesses: how people type it; confusions: concepts a guesser drifts to
const C = {
    house: { starts: ["house", "haunted house", "cabin", "dog house", "barn"], guesses: ["house", "home", "a house", "cottage", "barn", "haunted house"], confusions: ["castle", "bed"] },
    cat: { starts: ["cat", "kitten", "lion", "grumpy cat"], guesses: ["cat", "kitty", "Cat", "kitten", "cat?", "fox", "angry cat"], confusions: ["dog", "ghost"] },
    dog: { starts: ["dog", "puppy", "hot dog stand", "beagle"], guesses: ["dog", "puppy", "doggo", "bear", "sad dog", "beagle"], confusions: ["cat", "elephant"] },
    sun: { starts: ["sun", "sunshine", "summer", "hot"], guesses: ["sun", "sunny", "the sun", "happy sun", "summer", "SUNSHINE"], confusions: ["flower", "star"] },
    tree: { starts: ["tree", "forest", "oak", "camping"], guesses: ["tree", "a tree", "broccoli", "forest", "bush"], confusions: ["cloud", "flower"] },
    car: { starts: ["car", "minivan", "road trip", "taxi", "traffic"], guesses: ["car", "truck", "minivan", "road trip", "uber", "racecar"], confusions: ["bike", "boat"] },
    fish: { starts: ["fish", "goldfish", "shark", "fishing", "Nemo"], guesses: ["fish", "goldfish", "nemo", "fishy", "shark", "a fish blowing bubbles"], confusions: ["bird", "airplane"] },
    bird: { starts: ["bird", "chicken", "duck", "parrot", "twitter"], guesses: ["bird", "duck", "chicken", "pigeon", "birb", "rubber duck"], confusions: ["fish", "airplane"] },
    boat: { starts: ["boat", "sailboat", "pirate ship", "cruise", "Titanic"], guesses: ["boat", "sailboat", "pirate ship", "sailing", "ship"], confusions: ["hat", "car"] },
    rocket: { starts: ["rocket", "space", "astronaut", "blast off"], guesses: ["rocket", "rocket ship", "spaceship", "blast off", "NASA", "space"], confusions: ["carrot", "lightbulb"] },
    pizza: { starts: ["pizza", "pepperoni", "pizza party", "Italy"], guesses: ["pizza", "pepperoni pizza", "pizza slice", "PIZZA", "nachos"], confusions: ["icecream", "cookie"] },
    hotdog: { starts: ["hot dog", "sausage", "hamburger", "barbecue"], guesses: ["hot dog", "hotdog", "sausage", "taco", "submarine sandwich", "weiner"], confusions: ["banana", "boat"] },
    snowman: { starts: ["snowman", "winter", "Frosty", "snow day"], guesses: ["snowman", "frosty", "olaf", "winter", "snow man"], confusions: ["stickman", "robot"] },
    flower: { starts: ["flower", "garden", "rose", "spring", "Mother's Day"], guesses: ["flower", "flowers", "daisy", "spring", "a flower", "sunflower"], confusions: ["sun", "tree"] },
    guitar: { starts: ["guitar", "rock band", "music", "violin", "concert"], guesses: ["guitar", "violin", "ukulele", "music", "rock and roll", "cello"], confusions: ["key", "snail"] },
    mug: { starts: ["coffee", "mug", "tea party", "hot chocolate", "Monday"], guesses: ["coffee", "mug", "hot chocolate", "tea", "coffee cup", "morning"], confusions: ["hat", "phone"] },
    phone: { starts: ["phone", "iPhone", "texting", "selfie", "TikTok"], guesses: ["phone", "iphone", "cell phone", "texting", "tablet", "door"], confusions: ["ladder", "robot"] },
    hat: { starts: ["hat", "top hat", "magician", "Abraham Lincoln", "wedding"], guesses: ["hat", "top hat", "magic hat", "lincoln", "fancy hat", "magician"], confusions: ["mug", "castle"] },
    star: { starts: ["star", "superstar", "Christmas", "shooting star"], guesses: ["star", "starfish", "superstar", "gold star", "Christmas star"], confusions: ["sun", "crown"] },
    moon: { starts: ["moon", "night", "bedtime", "werewolf", "banana"], guesses: ["moon", "night", "goodnight moon", "banana", "crescent", "night time"], confusions: ["banana", "bed"] },
    umbrella: { starts: ["umbrella", "rain", "Seattle", "storm"], guesses: ["umbrella", "rain", "rainy day", "parasol", "mushroom"], confusions: ["cloud", "octopus"] },
    icecream: { starts: ["ice cream", "dessert", "summer", "sundae", "cone"], guesses: ["ice cream", "icecream", "ice cream cone", "dessert", "gelato", "snow cone"], confusions: ["carrot", "balloon"] },
    apple: { starts: ["apple", "teacher", "fruit", "Snow White", "doctor"], guesses: ["apple", "cherry", "tomato", "fruit", "red apple", "teacher"], confusions: ["balloon", "cookie"] },
    ghost: { starts: ["ghost", "Halloween", "boo", "haunted", "bedsheet"], guesses: ["ghost", "boo", "halloween", "spooky", "casper", "jellyfish"], confusions: ["octopus", "cloud"] },
    snake: { starts: ["snake", "python", "worm", "slither"], guesses: ["snake", "worm", "python", "noodle", "squiggle", "eel"], confusions: ["trex", "carrot"] },
    spider: { starts: ["spider", "Spider-Man", "bug", "web", "itsy bitsy spider"], guesses: ["spider", "spiderman", "bug", "tarantula", "ant", "eek"], confusions: ["octopus", "sun"] },
    robot: { starts: ["robot", "computer", "AI", "Wall-E", "machine"], guesses: ["robot", "robots", "AI", "computer", "terminator", "android"], confusions: ["phone", "snowman"] },
    castle: { starts: ["castle", "king", "princess", "Disneyland", "knight"], guesses: ["castle", "fort", "disney castle", "palace", "sandcastle"], confusions: ["crown", "house"] },
    mountain: { starts: ["mountain", "hiking", "Colorado", "ski trip", "camping"], guesses: ["mountain", "mountains", "hiking", "volcano", "camping", "alps"], confusions: ["volcano", "pizza"] },
    cloud: { starts: ["cloud", "rain", "weather", "storm", "the cloud"], guesses: ["cloud", "rain", "rain cloud", "weather", "storm", "sad cloud"], confusions: ["umbrella", "tree"] },
    octopus: { starts: ["octopus", "squid", "ocean", "jellyfish", "kraken"], guesses: ["octopus", "squid", "jellyfish", "kraken", "octopi"], confusions: ["spider", "ghost"] },
    elephant: { starts: ["elephant", "zoo", "Dumbo", "circus", "mammoth"], guesses: ["elephant", "dumbo", "zoo", "mammoth", "anteater", "elefant"], confusions: ["dog", "turtle"] },
    airplane: { starts: ["airplane", "vacation", "airport", "jet lag", "pilot"], guesses: ["airplane", "plane", "jet", "vacation", "airport", "flying"], confusions: ["fish", "bird"] },
    balloon: { starts: ["balloon", "birthday", "party", "Up", "helium"], guesses: ["balloon", "birthday", "party", "red balloon", "cherry", "lollipop"], confusions: ["apple", "icecream"] },
    bee: { starts: ["bee", "honey", "bumblebee", "buzz", "spelling bee"], guesses: ["bee", "bumblebee", "buzz", "wasp", "honey bee", "bug"], confusions: ["fish", "spider"] },
    cookie: { starts: ["cookie", "cookie monster", "baking", "Grandma"], guesses: ["cookie", "cookies", "chocolate chip cookie", "pizza", "pancake", "moon?"], confusions: ["pizza", "apple"] },
    eye: { starts: ["eye", "eyeball", "staring contest", "spy", "wink"], guesses: ["eye", "eyeball", "staring", "watching you", "spy", "I see you"], confusions: ["fish", "sun"] },
    bridge: { starts: ["bridge", "Golden Gate", "river", "San Francisco"], guesses: ["bridge", "golden gate bridge", "river", "tunnel", "roller coaster"], confusions: ["boat", "ladder"] },
    snail: { starts: ["snail", "slow", "escargot", "slime"], guesses: ["snail", "slug", "slow", "escargot", "cinnamon roll"], confusions: ["turtle", "cookie"] },
    turtle: { starts: ["turtle", "ninja turtle", "tortoise", "beach"], guesses: ["turtle", "tortoise", "ninja turtle", "slow", "taco?"], confusions: ["snail", "hotdog"] },
    cactus: { starts: ["cactus", "desert", "Arizona", "cowboy", "Mexico"], guesses: ["cactus", "desert", "succulent", "arizona", "plant"], confusions: ["tree", "carrot"] },
    lightbulb: { starts: ["lightbulb", "idea", "Edison", "electricity", "genius"], guesses: ["lightbulb", "light bulb", "idea", "light", "electricity", "genius"], confusions: ["balloon", "rocket"] },
    key: { starts: ["key", "lock", "locked out", "secret", "house key"], guesses: ["key", "keys", "lock", "locked out", "secret"], confusions: ["guitar", "glasses"] },
    crown: { starts: ["crown", "queen", "king", "Burger King", "royalty"], guesses: ["crown", "king", "queen", "royalty", "princess", "Burger King"], confusions: ["castle", "star"] },
    ladder: { starts: ["ladder", "climbing", "train tracks", "career"], guesses: ["ladder", "train tracks", "railroad", "climbing", "stairs"], confusions: ["bridge", "phone"] },
    bed: { starts: ["bed", "sleep", "nap", "bunk bed", "Monday morning"], guesses: ["bed", "sleep", "sleeping", "nap", "couch", "hospital"], confusions: ["car", "house"] },
    glasses: { starts: ["glasses", "nerd", "Harry Potter", "optometrist"], guesses: ["glasses", "harry potter", "nerd", "sunglasses", "goggles", "bike"], confusions: ["bike", "eye"] },
    banana: { starts: ["banana", "monkey", "smoothie", "minion"], guesses: ["banana", "bananas", "moon", "smile", "boat"], confusions: ["moon", "hotdog"] },
    carrot: { starts: ["carrot", "bunny", "Easter", "vegetables"], guesses: ["carrot", "carrots", "veggies", "bunny", "parsnip"], confusions: ["icecream", "rocket"] },
    stickman: { starts: ["person", "dad", "teacher", "jumping jacks", "selfie"], guesses: ["person", "man", "stick figure", "dad", "me", "jumping jacks", "happy guy"], confusions: ["snowman", "robot"] },
    bike: { starts: ["bike", "bicycle", "Tour de France", "commute"], guesses: ["bike", "bicycle", "motorcycle", "cycling", "glasses"], confusions: ["glasses", "car"] },
    trex: { starts: ["dinosaur", "T-Rex", "Jurassic Park", "museum", "Godzilla"], guesses: ["dinosaur", "t rex", "T-Rex", "dino", "godzilla", "dragon", "alligator"], confusions: ["snake", "elephant"] },
    volcano: { starts: ["volcano", "Hawaii", "lava", "eruption", "science fair"], guesses: ["volcano", "lava", "eruption", "hawaii", "fire mountain"], confusions: ["mountain", "pizza"] },
};
const conceptKeys = Object.keys(C);
for (const k of conceptKeys) if (!D[k]) throw new Error("missing doodle " + k);

// custom first words written by players ("Players write first word" mode)
const CUSTOM_FIRSTS = [
    ["Marcus's minivan", "car"],
    ["grandpa falling asleep at dinner", "bed"],
    ["the time Dev lost his keys in Tahoe", "key"],
    ["Priya's sourdough starter", "cookie"],
    ["our landlord", "stickman"],
    ["tax season", "stickman"],
    ["Hannah's cat Mochi", "cat"],
    ["Maya's road trip playlist", "car"],
    ["the Costco hot dog", "hotdog"],
    ["Jordan in a tiny hat", "hat"],
    ["moving day", "house"],
    ["dentist appointment", "eye"],
    ["Monday morning", "mug"],
    ["the haunted Airbnb", "ghost"],
    ["ski trip 2026", "mountain"],
    ["Omar's fantasy football team", "crown"],
    ["the work Christmas party", "star"],
    ["when the wifi goes out", "phone"],
    ["Zoe's new bike", "bike"],
    ["camping in the rain", "umbrella"],
    ["Lucas trying to cook", "volcano"],
    ["Kenji's houseplants", "cactus"],
    ["a very smart idea", "lightbulb"],
    ["King of the backyard", "crown"],
    ["that spider in the shower", "spider"],
    ["beach day!!", "sun"],
];

// joke / lazy guesses people sometimes type
const JOKE_GUESSES = ["idk", "???", "no clue lol", "a potato", "my ex", "modern art", "abstract feelings", "sorry", "help"];

// ---------- players ----------
const ME = "Sam";
const CORE = ["Maya", "Jordan", "Priya", "Dev", "Hannah", "Lucas"];
const EXTENDED = ["Omar", "Tess", "Kenji", "Zoe", "Marcus", "rosie", "Ben K", "Aunt Linda", "Grandpa Joe", "nate!!", "Ellie 🌸", "Theo", "Carmen", "Ravi", "big mike", "Lena"];
// some players draw with lots of color, some are messy
const style = {};
for (const n of [ME, ...CORE, ...EXTENDED]) {
    style[n] = { color: rnd() < 0.55, mess: 0.6 + rnd() * 1.6, width: pick([3, 4, 4, 5, 5, 6, 8]) };
}
style["Grandpa Joe"].mess = 3.2;
style["Ellie 🌸"].color = true;
style["big mike"].width = 12;
style["Lena"].width = 3;

// ---------- svg rendering like fabric.js toSVG ----------
const f = (n) => Math.round(n * 1000) / 1000;
function renderDrawing(conceptKey, artist, size) {
    const st = style[artist] || { color: false, mess: 1, width: 4 };
    const strokes = D[conceptKey]();
    const scale = size / 100;
    // whole-drawing offset/scale (people don't center perfectly)
    const zoom = 0.8 + rnd() * 0.25;
    const ox = (rnd() - 0.5) * 10 + 50 * (1 - zoom);
    const oy = (rnd() - 0.5) * 10 + 50 * (1 - zoom);
    let out = "";
    // occasionally skip a detail stroke (lazy/quick drawers)
    const keep = strokes.filter((s, i) => i < 2 || !chance(0.08 * st.mess));
    for (const s of keep) {
        const sx = (rnd() - 0.5) * 1.6 * st.mess;
        const sy = (rnd() - 0.5) * 1.6 * st.mess;
        const pts = [];
        for (let i = 0; i < s.p.length; i++) {
            const [x, y] = s.p[i];
            // densify segments so they look hand-drawn
            const next = s.p[i + 1];
            const steps = next ? Math.max(1, Math.round(Math.hypot(next[0] - x, next[1] - y) / 6)) : 1;
            for (let k = 0; k < steps; k++) {
                const t = k / steps;
                const px = next ? x + (next[0] - x) * t : x;
                const py = next ? y + (next[1] - y) * t : y;
                pts.push([
                    (ox + (px + sx) * zoom + (rnd() - 0.5) * 0.9 * st.mess) * scale,
                    (oy + (py + sy) * zoom + (rnd() - 0.5) * 0.9 * st.mess) * scale,
                ]);
            }
        }
        if (pts.length < 2) continue;
        const color = st.color && s.c ? s.c : BLACK;
        const w = s.w || st.width;
        let d = `M ${f(pts[0][0])} ${f(pts[0][1])} Q ${f(pts[0][0])} ${f(pts[0][1])} `;
        for (let i = 1; i < pts.length - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2;
            const my = (pts[i][1] + pts[i + 1][1]) / 2;
            d += `${f(mx)} ${f(my)} Q ${f(pts[i][0])} ${f(pts[i][1])} `;
        }
        const last = pts[pts.length - 1];
        d += `${f(last[0])} ${f(last[1])} L ${f(last[0])} ${f(last[1])}`;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        out += `<g transform="matrix(1 0 0 1 ${f(cx)} ${f(cy)})"  >\n<path style="stroke: ${color}; stroke-width: ${w}; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: round; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;"  transform=" translate(${f(-cx)}, ${f(-cy)})" d="${d}" stroke-linecap="round" />\n</g>\n`;
    }
    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xml:space="preserve">
<desc>Created with Fabric.js 4.6.0</desc>
<defs>
</defs>
${out}</svg>`;
    return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

// ---------- guessing ----------
function messUp(word) {
    const r = rnd();
    if (r < 0.06) return word.toUpperCase();
    if (r < 0.12 && word.length > 4) {
        const i = ri(1, word.length - 2);
        return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2); // typo swap
    }
    if (r < 0.17) return word + "?";
    if (r < 0.2) return word + "!!";
    if (r < 0.26) return word[0].toUpperCase() + word.slice(1);
    return word;
}
function guessFor(conceptKey, guesser) {
    const c = C[conceptKey];
    const r = rnd();
    const skill = 1 / (style[guesser]?.mess || 1);
    if (r < 0.025) return { word: pick(JOKE_GUESSES), concept: pick(conceptKeys) };
    if (r < 0.5 + 0.12 * skill) return { word: messUp(pick(c.guesses)), concept: conceptKey };
    const other = pick(c.confusions);
    return { word: messUp(pick(C[other].guesses)), concept: other };
}

// ---------- games ----------
const sizes = [510, 510, 540, 540, 350, 375, 414, 390];
const playerSize = {};
const sizeOf = (name) => (playerSize[name] ||= pick(sizes));

function makeGame(date, players, { wordFirst, turnLimit, pack }) {
    const json = players.map((name, i) => ({ name, id: i + 1, isHost: i === 0, isConnected: true, isAi: false }));
    const n = json.length;
    const chains = json.map((owner, ci) => {
        const links = [];
        let concept;
        if (wordFirst) {
            links.push({ player: owner, data: false, type: "first-word" });
            let word;
            if (chance(0.6)) {
                [word, concept] = pick(CUSTOM_FIRSTS);
            } else {
                concept = pick(conceptKeys);
                word = pick(C[concept].starts);
            }
            links.push({ player: owner, data: word, type: "word" });
        } else {
            concept = pick(conceptKeys);
            const starts = C[concept].starts;
            const word = pack === "Animals" ? starts[0] : pick(starts);
            links.push({ player: owner, data: word, type: "word" });
        }
        // same length rule as server/app/round.js start(): every chain ends on a word
        let target = turnLimit + (wordFirst ? 0 : 1);
        if (target % 2 === 0) target--;
        // following players in seat order
        // (with a pack word, the owner draws it first; with a written word, the next player draws)
        let seat = wordFirst ? ci : (ci - 1 + n) % n;
        while (links.length - (wordFirst ? 1 : 0) < target) {
            seat = (seat + 1) % n;
            const p = json[seat];
            const last = links[links.length - 1];
            if (last.type === "word") {
                links.push({ player: p, data: renderDrawing(concept, p.name, sizeOf(p.name)), type: "drawing" });
            } else {
                const g = guessFor(concept, p.name);
                concept = g.concept;
                links.push({ player: p, data: g.word, type: "word" });
            }
        }
        return { owner, links, id: ci };
    });
    return { date: date.toISOString(), chains };
}

// sessions: game nights spread over ~8 months, 1–4 rounds each
const games = [];
const start = new Date("2026-03-14T19:30:00-07:00");
const end = new Date("2026-11-15T22:00:00-08:00");
let t = new Date(start);
const packs = ["Simple words (recommended)", "Simple words (recommended)", "Advanced words", "Animals"];
while (t < end) {
    // game nights mostly Fri/Sat evenings, sometimes a weekday lunch at work
    const lunch = chance(0.18);
    const day = new Date(t);
    day.setHours(lunch ? 12 : ri(19, 21), ri(0, 59), 0, 0);
    let group;
    if (lunch) {
        group = [ME, ...shuffle(["Omar", "Tess", "Kenji", "Carmen", "Ravi", "Lena", "big mike"]).slice(0, ri(3, 5))];
    } else if (chance(0.15)) {
        group = [ME, "Aunt Linda", "Grandpa Joe", "Ellie 🌸", "nate!!", "rosie", ...shuffle(["Maya", "Theo"]).slice(0, ri(0, 2))];
    } else {
        group = [ME, ...shuffle(CORE).slice(0, ri(3, 6)), ...shuffle(EXTENDED).slice(0, ri(0, 2))];
    }
    // host isn't always me
    group = chance(0.4) ? group : [group[1], ME, ...group.slice(2)];
    const rounds = lunch ? ri(1, 2) : ri(1, 4);
    const wordFirstNight = chance(0.35);
    const pack = pick(packs);
    let when = new Date(day);
    let roster = group.slice();
    for (let r = 0; r < rounds; r++) {
        if (r > 0 && chance(0.3) && roster.length > 4) roster = roster.filter((p, i) => i < 2 || !chance(0.2)); // someone left
        const turnLimit = Math.min(roster.length, chance(0.3) ? ri(4, roster.length) : roster.length);
        games.push(makeGame(when, roster, { wordFirst: wordFirstNight ? chance(0.8) : chance(0.1), turnLimit, pack }));
        when = new Date(when.getTime() + ri(9, 22) * 60000);
    }
    // next session in 2–12 days
    t = new Date(day.getTime() + ri(2, 12) * 86400000);
}

const outFile = path.join(here, "archive.json");
fs.writeFileSync(outFile, JSON.stringify(games));
const links = games.reduce((a, g) => a + g.chains.reduce((b, c) => b + c.links.length, 0), 0);
console.log(`wrote ${games.length} games, ${games.reduce((a, g) => a + g.chains.length, 0)} chains, ${links} links, ${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB`);
