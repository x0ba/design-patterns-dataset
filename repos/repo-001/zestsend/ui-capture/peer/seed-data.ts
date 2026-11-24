// Seed content for the remote participant ("Mira", a designer at a small
// studio) who has been working with the viewer on the Harbor Line ferry app
// 2.3 release. Everything here is sent through the app's own channels:
// chat messages, file offers, and the shared Yjs document / canvas.
import * as Y from "yjs";

export type ChatLine = { from: "peer"; text: string };

const peer = (text: string): ChatLine => ({ from: "peer", text });

export const chatScript: ChatLine[] = [
  peer("morning! back in the room — the old one timed out overnight"),
  peer("ok so where we left off: hero copy is locked, icons are not"),
  peer("I re-exported the hero at 2x and 3x, sending in a sec"),
  peer("homepage-hero_final_v4.png is the real final. ignore v3, it still had the old ferry silhouette 🙃"),
  peer("also Dana from Harbor Line replied to the redlines"),
  peer("tl;dr they accept clause 7 (support window) but want the payment terms back to net-30 instead of net-45. I think that's fine? we can live with net-30 if the deposit stays at 40%"),
  peer("contract_redline (1).docx — sorry about the filename, Word did that"),
  peer("can you sanity check section 4.2 before I send it back? I don't trust myself with the indemnity wording"),
  peer("re: release notes — I dropped the PDF in too. it's the version marketing approved on Thursday"),
  peer("one thing: they want \"real-time departures\" not \"live departures\" everywhere. I fixed the PDF but the app strings still say live"),
  peer("strings live in i18n/en.json → `departures.live_badge` and `departures.header_subtitle`"),
  peer("ok"),
  peer("screenshots zip is the full App Store set — 6.7\", 6.5\", 5.5\" and iPad 12.9\". Android ones are still rendering on my machine, the emulator is being slow"),
  peer("👍"),
  peer("lol the emulator just crashed. Android set tomorrow morning then"),
  peer("I recorded Wednesday's standup since you were out — standup-2026-11-12.m4a. the interesting part is around 14:30 when Theo explains the offline timetable cache"),
  peer("short version: timetables get cached for 72h, and if the device is offline longer than that we show the \"schedule may be outdated\" banner instead of hiding departures entirely"),
  peer("which honestly is the right call. people on the island ferry lose signal halfway across"),
  peer("invoice for October is attached too (Q4_invoice_LNT-0419.xlsx). they paid September already, this one is due the 30th"),
  peer("wait, the 28th. it's net-30 from the 29th of last month… whatever, end of month"),
  peer("I put a launch checklist in the shared doc tab, tick things off as you go"),
  peer("and I sketched the new onboarding flow on the canvas — 3 screens, the arrows are the swipe direction. the red circle is the bit I'm unsure about (location permission prompt timing)"),
  peer("my gut says ask for location AFTER they pick a home terminal, not on screen 1. asking on first launch tanked our opt-in rate on the 2.1 beta (31% vs 58% when we asked contextually)"),
  peer("brand-tokens.json has the updated palette. the teal changed from #1FA9A0 to #17968E for contrast on white, everything else is the same"),
  peer("walkthrough video is big (onboarding-walkthrough.mp4), no rush on that one, it's just for the store preview"),
  peer("photo from the dock shoot too — IMG_4821.HEIC, the one with the gangway. could be a nice empty-state illustration reference"),
  peer("brb, lunch"),
  peer("back"),
  peer("did the hero come through ok? the PNG is 3.4MB which is a lot, I can run it through squoosh if you want a webp"),
  peer("also Theo asked if we can ship 2.3 on the 24th instead of the 21st, because of the App Store review backlog before Thanksgiving. I said probably, let me know if that breaks anything on your side"),
  peer("ok going to dig into the Android screenshots again. ping me here if anything's off with the files"),
];

type SharedFile = { bytes: () => Uint8Array; mimeType: string; name: string };

function filler(size: number, seed: number): () => Uint8Array {
  return () => {
    const data = new Uint8Array(size);
    let state = seed >>> 0 || 1;
    for (let index = 0; index < size; index += 4) {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      data[index] = state & 0xff;
      if (index + 1 < size) data[index + 1] = (state >>> 8) & 0xff;
      if (index + 2 < size) data[index + 2] = (state >>> 16) & 0xff;
      if (index + 3 < size) data[index + 3] = (state >>> 24) & 0xff;
    }
    return data;
  };
}

const textFile = (text: string) => () => new TextEncoder().encode(text);

export const sharedFiles: SharedFile[] = [
  { name: "homepage-hero_final_v4.png", mimeType: "image/png", bytes: filler(3_412_877, 11) },
  { name: "contract_redline (1).docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: filler(214_306, 12) },
  { name: "Harborline_2.3_release-notes.pdf", mimeType: "application/pdf", bytes: filler(1_846_120, 13) },
  { name: "app-store-screenshots.zip", mimeType: "application/zip", bytes: filler(24_617_993, 14) },
  { name: "standup-2026-11-12.m4a", mimeType: "audio/mp4", bytes: filler(7_904_415, 15) },
  { name: "Q4_invoice_LNT-0419.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes: filler(46_208, 16) },
  {
    name: "brand-tokens.json",
    mimeType: "application/json",
    bytes: textFile(JSON.stringify({
      color: {
        teal: { 500: "#17968E", 600: "#127A73", 100: "#D7F2EF" },
        navy: { 900: "#0B1E33", 700: "#1D3A57" },
        sand: { 50: "#FBF7F0", 200: "#EFE3CF" },
        signal: { warning: "#F2A93B", danger: "#D9534F", ok: "#3BA272" },
      },
      radius: { sm: 6, md: 10, lg: 16, pill: 999 },
      font: { display: "Lastoria", body: "Inter", mono: "JetBrains Mono" },
    }, null, 2)),
  },
  { name: "onboarding-walkthrough.mp4", mimeType: "video/mp4", bytes: filler(58_204_160, 17) },
  { name: "IMG_4821.HEIC", mimeType: "image/heic", bytes: filler(2_731_548, 18) },
];

// ---------------------------------------------------------------------------
// Shared document (Tiptap / y-prosemirror XML in the "default" fragment)

type Inline = string | [string, Record<string, unknown>];

function text(parts: Inline[]): Y.XmlText {
  const node = new Y.XmlText();
  let offset = 0;
  for (const part of parts) {
    const [value, marks] = typeof part === "string" ? [part, undefined] : part;
    node.insert(offset, value, marks);
    offset += value.length;
  }
  return node;
}

function element(name: string, children: (Y.XmlElement | Y.XmlText)[], attrs: Record<string, string | number | boolean> = {}): Y.XmlElement {
  const node = new Y.XmlElement(name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value as string);
  node.insert(0, children);
  return node;
}

const p = (...parts: Inline[]) => element("paragraph", [text(parts)]);
const h = (level: number, value: string) => element("heading", [text([value])], { level });
const task = (checked: boolean, ...parts: Inline[]) => element("taskItem", [p(...parts)], { checked });
const li = (...parts: Inline[]) => element("listItem", [p(...parts)]);
const bold = (value: string): Inline => [value, { bold: true }];
const code = (value: string): Inline => [value, { code: true }];
const link = (value: string, href: string): Inline => [value, { link: { href, target: "_blank", rel: "noopener noreferrer nofollow", class: "zest-collaboration-link" } }];

export function buildDocument(doc: Y.Doc): void {
  const fragment = doc.getXmlFragment("default");
  fragment.insert(0, [
    h(1, "Harbor Line 2.3 — launch checklist"),
    p("Target store submission: ", bold("Fri Nov 21"), " (Theo asked about moving to Mon Nov 24 — pending). Owner for anything unassigned: whoever touches it last 🙂"),
    h(2, "Before submission"),
    element("taskList", [
      task(true, "Hero copy signed off by Harbor Line marketing (Dana, Thu)"),
      task(true, "Release notes PDF — approved version in Files"),
      task(false, "Replace \"live departures\" → \"real-time departures\" in ", code("i18n/en.json"), " and ", code("i18n/es.json")),
      task(false, "Icons: final export of the 12 terminal glyphs at 24/32/48"),
      task(true, "App Store screenshots (iOS, all 4 sizes)"),
      task(false, "Play Store screenshots — emulator keeps crashing, retry Tue"),
      task(false, "Store preview video: trim walkthrough to 29s, no audio"),
      task(true, "Offline timetable cache: 72h TTL + \"schedule may be outdated\" banner"),
      task(false, "QA pass on iPhone SE (2nd gen) — the departure board clips at 320pt"),
      task(false, "Location permission moved after home-terminal picker (see canvas)"),
    ]),
    h(2, "Contract / admin"),
    element("bulletList", [
      li("Payment terms back to ", bold("net-30"), ", deposit stays 40%"),
      li("Clause 7 (90-day support window) accepted as-is"),
      li("Section 4.2 indemnity wording — needs a second read before we reply"),
      li("October invoice LNT-0419: €6,840.00, due end of month"),
    ]),
    h(2, "Notes from Wednesday standup"),
    p("Theo: timetables are fetched from the GTFS feed every 15 min while the app is open; the background refresh is ", bold("best effort only"), " on iOS, so we should not promise it in the store copy."),
    element("blockquote", [p("If the device has been offline for more than 72 hours we keep showing departures but grey them out and show the banner. Hiding everything was the #1 complaint in 2.1 reviews.")]),
    p("Opt-in numbers from the 2.1 beta: location permission on first launch → 31%; asked after choosing a home terminal → 58%."),
    element("codeBlock", [text(["\"departures\": {\n  \"live_badge\": \"Real-time\",\n  \"header_subtitle\": \"Real-time departures from {terminal}\"\n}"])], { language: "json" }),
    h(2, "Links"),
    element("bulletList", [
      li(link("Figma — Harbor Line 2.3", "https://www.figma.com/file/harborline-2-3")),
      li(link("TestFlight build 2.3 (418)", "https://testflight.apple.com/join/hbl23")),
      li("Staging API: ", code("https://staging.api.harborline.example/v2")),
    ]),
    p(""),
  ]);
}

// ---------------------------------------------------------------------------
// Shared canvas: onboarding flow sketch, in the 16000 × 9000 world space.

type Point = [number, number];

function jitter(seed: number) {
  let state = seed;
  return (amount: number) => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return ((state / 2_147_483_648) - 0.5) * amount;
  };
}

function line(from: Point, to: Point, steps = 14, wobble = 10, seed = 1): Point[] {
  const noise = jitter(seed);
  const points: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    points.push([from[0] + (to[0] - from[0]) * t + noise(wobble), from[1] + (to[1] - from[1]) * t + noise(wobble)]);
  }
  return points;
}

function rect(x: number, y: number, width: number, height: number, seed: number, radius = 0): Point[] {
  if (!radius) {
    return [
      ...line([x, y], [x + width, y], 16, 10, seed),
      ...line([x + width, y], [x + width, y + height], 22, 10, seed + 1),
      ...line([x + width, y + height], [x, y + height], 16, 10, seed + 2),
      ...line([x, y + height], [x, y + 8], 22, 10, seed + 3),
    ];
  }
  const points: Point[] = [];
  const corners: [number, number, number][] = [
    [x + width - radius, y + radius, -Math.PI / 2],
    [x + width - radius, y + height - radius, 0],
    [x + radius, y + height - radius, Math.PI / 2],
    [x + radius, y + radius, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let index = 0; index <= 8; index += 1) {
      const angle = start + (index / 8) * (Math.PI / 2);
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
  }
  points.push(points[0]!);
  return points;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, seed: number, turns = 1.08): Point[] {
  const noise = jitter(seed);
  const points: Point[] = [];
  const steps = 48;
  for (let index = 0; index <= steps * turns; index += 1) {
    const angle = (index / steps) * Math.PI * 2 - 0.4;
    points.push([cx + Math.cos(angle) * (rx + noise(30)), cy + Math.sin(angle) * (ry + noise(30))]);
  }
  return points;
}

function scribble(x: number, y: number, width: number, seed: number, amplitude = 40): Point[] {
  const noise = jitter(seed);
  const points: Point[] = [];
  const steps = Math.max(8, Math.round(width / 60));
  for (let index = 0; index <= steps; index += 1) {
    points.push([x + (width * index) / steps, y + Math.sin(index * 1.3 + seed) * amplitude + noise(20)]);
  }
  return points;
}

function arrow(from: Point, to: Point, seed: number): Point[][] {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const head = 170;
  const left: Point = [to[0] - head * Math.cos(angle - 0.45), to[1] - head * Math.sin(angle - 0.45)];
  const right: Point = [to[0] - head * Math.cos(angle + 0.45), to[1] - head * Math.sin(angle + 0.45)];
  return [line(from, to, 24, 14, seed), [left, to, right]];
}

function check(x: number, y: number, size: number): Point[] {
  return [[x, y], [x + size * 0.35, y + size * 0.4], [x + size, y - size * 0.55]];
}

export function buildCanvas(doc: Y.Doc): void {
  const strokes = doc.getArray<Y.Map<unknown>>("zestsend-canvas-strokes");
  const author = 4_120_771_903; // the remote participant's (Mira's) Yjs client id at drawing time
  const viewer = 2_981_004_117; // strokes the viewer added in the earlier session
  let count = 0;
  const add = (points: Point[], color: string, size: number, by = author, deleted = false) => {
    const stroke = new Y.Map<unknown>();
    const flat = new Y.Array<number>();
    flat.insert(0, points.flatMap(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
    stroke.set("id", `stroke-${(count += 1).toString(36)}-${by.toString(36)}`);
    stroke.set("author", by);
    stroke.set("color", color);
    stroke.set("size", size);
    stroke.set("deleted", deleted);
    stroke.set("points", flat);
    strokes.push([stroke]);
  };

  const ink = "#E2E8F0";
  const teal = "#2DD4BF";
  const sky = "#38BDF8";
  const red = "#FB7185";
  const amber = "#FBBF24";
  const screens = [1700, 6300, 10900];

  doc.transact(() => {
    // Title scribble + underline
    add(scribble(1700, 900, 3600, 3, 55), ink, 48);
    add(line([1650, 1200], [5600, 1180], 30, 14, 4), teal, 40);

    screens.forEach((left, index) => {
      const top = 1700;
      add(rect(left, top, 3000, 5900, 10 + index, 260), ink, 44);           // phone frame
      add(line([left + 1150, top + 260], [left + 1850, top + 260], 8, 6, 20 + index), ink, 36); // notch
      add(rect(left + 300, top + 650, 2400, 1700, 30 + index), sky, 34);     // hero / illustration box
      add(scribble(left + 380, top + 2750, 2000, 40 + index, 30), ink, 30);   // headline text
      add(scribble(left + 380, top + 3150, 1700, 50 + index, 22), "#94A3B8", 24);
      add(scribble(left + 380, top + 3450, 1900, 60 + index, 22), "#94A3B8", 24);
      add(rect(left + 400, top + 4800, 2200, 480, 70 + index, 200), teal, 38); // primary button
      for (let dot = 0; dot < 3; dot += 1) {
        add(ellipse(left + 1250 + dot * 260, top + 5550, 40, 40, 80 + index * 3 + dot, 1.05), dot === index ? teal : "#94A3B8", 30);
      }
    });

    // screen 1: illustration cross
    add(line([2000, 2350], [4700, 4050], 18, 18, 101), "#475569", 24);
    add(line([4700, 2350], [2000, 4050], 18, 18, 102), "#475569", 24);
    // screen 2: terminal picker list
    for (let row = 0; row < 4; row += 1) {
      add(rect(6600, 2350 + row * 400, 2400, 300, 110 + row, 60), row === 1 ? teal : "#94A3B8", 26);
    }
    // screen 3: map pin
    add(ellipse(12400, 3000, 380, 380, 120), amber, 40);
    add(line([12400, 3380], [12400, 3900], 10, 8, 121), amber, 40);

    // swipe arrows between screens
    for (const stroke of arrow([4900, 4600], [6100, 4600], 130)) add(stroke, sky, 44);
    for (const stroke of arrow([9500, 4600], [10700, 4600], 131)) add(stroke, sky, 44);

    // red circle: location permission timing
    add(ellipse(12400, 3600, 1900, 1500, 140, 1.15), red, 52);
    add(scribble(13700, 1300, 1500, 141, 35), red, 34);
    add(line([14100, 1450], [13500, 2150], 12, 10, 142), red, 34);

    // viewer's annotations from the earlier session
    add(check(6500, 8350, 420), teal, 56, viewer);
    add(scribble(7100, 8250, 1600, 150, 28), "#A3E635", 30, viewer);
    add(ellipse(3200, 8250, 900, 260, 151), "#A3E635", 30, viewer, true); // erased
    add(scribble(10900, 8250, 2600, 152, 26), "#C084FC", 28, viewer);
  });
}
