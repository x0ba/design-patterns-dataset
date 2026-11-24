// Generates a realistic, long-lived Excalidraw working canvas
// ("Ledgerline — platform planning") as a standard .excalidraw file.
// The app loads it through its own `#url=` scene import path.
//
// usage: node generate-scene.mjs <out.excalidraw>
import fs from "node:fs";

const out = process.argv[2];
if (!out) {
  throw new Error("usage: node generate-scene.mjs <out.excalidraw>");
}

// ---------------------------------------------------------------- helpers
let rngState = 20260417;
const rand = () => {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
};
const randInt = () => Math.floor(rand() * 2 ** 31);
let idCounter = 0;
const nid = (p = "el") =>
  `${p}-${(idCounter++).toString(36)}-${randInt().toString(36).slice(0, 5)}`;

// timestamps spread over ~7 months of use
const T0 = Date.parse("2026-04-14T09:12:00Z");
const T1 = Date.parse("2026-11-16T17:40:00Z");
const at = (iso) => Date.parse(iso);

const elements = [];
const files = {};

const COLORS = {
  ink: "#1e1e1e",
  grey: "#868e96",
  red: "#e03131",
  green: "#2f9e44",
  blue: "#1971c2",
  violet: "#6741d9",
  orange: "#e8590c",
  teal: "#0c8599",
  yellowBg: "#ffec99",
  greenBg: "#b2f2bb",
  redBg: "#ffc9c9",
  blueBg: "#a5d8ff",
  violetBg: "#d0bfff",
  orangeBg: "#ffd8a8",
  greyBg: "#e9ecef",
  tealBg: "#99e9f2",
  pinkBg: "#fcc2d7",
};

const base = (type, props, when) => {
  const ts = when ?? T0 + Math.floor(rand() * (T1 - T0));
  return {
    id: nid(type.slice(0, 2)),
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: COLORS.ink,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: randInt(),
    version: 2 + Math.floor(rand() * 40),
    versionNonce: randInt(),
    isDeleted: false,
    boundElements: null,
    updated: ts,
    created: ts - Math.floor(rand() * 1000 * 60 * 60 * 24 * 3),
    link: null,
    locked: false,
    ...props,
  };
};

// rough text metrics (the app keeps stored dimensions; centred labels are
// rendered relative to their own centre so small errors don't show)
const CHAR_W = { 5: 0.56, 6: 0.53, 8: 0.6, 2: 0.52 };
const LINE_H = { 5: 1.25, 6: 1.35, 8: 1.25, 2: 1.15 };
const measure = (text, fontSize, fontFamily) => {
  const lines = text.split("\n");
  const w = Math.max(...lines.map((l) => l.length)) * fontSize * CHAR_W[fontFamily];
  return {
    width: Math.max(4, Math.round(w)),
    height: Math.round(lines.length * fontSize * LINE_H[fontFamily]),
  };
};
const wrap = (text, maxChars) =>
  text
    .split("\n")
    .map((para) => {
      const words = para.split(" ");
      const lines = [];
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length > maxChars && cur) {
          lines.push(cur);
          cur = w;
        } else {
          cur = (cur + " " + w).trim();
        }
      }
      lines.push(cur);
      return lines.join("\n");
    })
    .join("\n");

const push = (el) => {
  elements.push(el);
  return el;
};

const text = (x, y, str, o = {}) => {
  const fontSize = o.fontSize ?? 20;
  const fontFamily = o.fontFamily ?? 5;
  const m = measure(str, fontSize, fontFamily);
  return push(
    base(
      "text",
      {
        x,
        y,
        ...m,
        text: str,
        originalText: str,
        fontSize,
        fontFamily,
        textAlign: o.textAlign ?? "left",
        verticalAlign: "top",
        containerId: null,
        autoResize: true,
        lineHeight: LINE_H[fontFamily],
        strokeColor: o.color ?? COLORS.ink,
        frameId: o.frameId ?? null,
        groupIds: o.groupIds ?? [],
        angle: o.angle ?? 0,
        opacity: o.opacity ?? 100,
        link: o.link ?? null,
      },
      o.when,
    ),
  );
};

// shape with optional centred label
const shape = (type, x, y, w, h, o = {}) => {
  const el = push(
    base(
      type,
      {
        x,
        y,
        width: w,
        height: h,
        strokeColor: o.stroke ?? COLORS.ink,
        backgroundColor: o.bg ?? "transparent",
        fillStyle: o.fill ?? "solid",
        strokeStyle: o.strokeStyle ?? "solid",
        strokeWidth: o.strokeWidth ?? 2,
        roughness: o.roughness ?? 1,
        roundness:
          type === "rectangle" && o.round !== false
            ? { type: 3 }
            : type === "diamond"
            ? { type: 2 }
            : type === "ellipse"
            ? null
            : null,
        frameId: o.frameId ?? null,
        groupIds: o.groupIds ?? [],
        opacity: o.opacity ?? 100,
        link: o.link ?? null,
        angle: o.angle ?? 0,
        boundElements: [],
      },
      o.when,
    ),
  );
  if (o.label) {
    const fontSize = o.fontSize ?? 20;
    const fontFamily = o.fontFamily ?? 5;
    const pad = type === "diamond" ? w * 0.22 : type === "ellipse" ? w * 0.16 : 10;
    const maxChars = Math.max(
      6,
      Math.floor((w - pad * 2) / (fontSize * CHAR_W[fontFamily])),
    );
    const str = o.noWrap ? o.label : wrap(o.label, maxChars);
    const m = measure(str, fontSize, fontFamily);
    const align = o.align ?? "center";
    const t = push(
      base(
        "text",
        {
          x: align === "left" ? x + pad : x + w / 2 - m.width / 2,
          y: o.valign === "top" ? y + pad : y + h / 2 - m.height / 2,
          ...m,
          text: str,
          originalText: o.label,
          fontSize,
          fontFamily,
          textAlign: align,
          verticalAlign: o.valign ?? "middle",
          containerId: el.id,
          autoResize: true,
          lineHeight: LINE_H[fontFamily],
          strokeColor: o.labelColor ?? o.stroke ?? COLORS.ink,
          frameId: o.frameId ?? null,
          groupIds: o.groupIds ?? [],
          angle: o.angle ?? 0,
        },
        el.updated,
      ),
    );
    el.boundElements.push({ type: "text", id: t.id });
  }
  return el;
};
const rect = (...a) => shape("rectangle", ...a);
const ellipse = (...a) => shape("ellipse", ...a);
const diamond = (...a) => shape("diamond", ...a);

// side anchor helpers -> fixed points
const SIDES = {
  r: [1, 0.5],
  l: [0, 0.5],
  t: [0.5, 0],
  b: [0.5, 1],
};
const anchor = (el, side, gap = 6) => {
  const [fx, fy] = SIDES[side];
  const dx = side === "r" ? gap : side === "l" ? -gap : 0;
  const dy = side === "b" ? gap : side === "t" ? -gap : 0;
  return [el.x + el.width * fx + dx, el.y + el.height * fy + dy];
};

const arrow = (from, fromSide, to, toSide, o = {}) => {
  const [sx, sy] = Array.isArray(from) ? from : anchor(from, fromSide);
  const [ex, ey] = Array.isArray(to) ? to : anchor(to, toSide);
  let pts = [[0, 0]];
  if (o.via) {
    for (const [vx, vy] of o.via) {
      pts.push([vx - sx, vy - sy]);
    }
  }
  pts.push([ex - sx, ey - sy]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const a = push(
    base(
      "arrow",
      {
        x: sx,
        y: sy,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: pts,
        lastCommittedPoint: null,
        startArrowhead: o.startArrowhead ?? null,
        endArrowhead: o.endArrowhead === undefined ? "arrow" : o.endArrowhead,
        startBinding: Array.isArray(from)
          ? null
          : { elementId: from.id, fixedPoint: SIDES[fromSide], mode: "orbit" },
        endBinding: Array.isArray(to)
          ? null
          : { elementId: to.id, fixedPoint: SIDES[toSide], mode: "orbit" },
        elbowed: false,
        roundness: o.via ? { type: 2 } : null,
        strokeColor: o.stroke ?? COLORS.ink,
        strokeStyle: o.strokeStyle ?? "solid",
        strokeWidth: o.strokeWidth ?? 2,
        frameId: o.frameId ?? null,
        groupIds: o.groupIds ?? [],
        boundElements: [],
      },
      o.when,
    ),
  );
  if (!Array.isArray(from)) {
    from.boundElements.push({ type: "arrow", id: a.id });
  }
  if (!Array.isArray(to)) {
    to.boundElements.push({ type: "arrow", id: a.id });
  }
  if (o.label) {
    const fontSize = o.fontSize ?? 16;
    const m = measure(o.label, fontSize, 5);
    const mid = pts[Math.floor(pts.length / 2)];
    const prev = pts[Math.floor(pts.length / 2) - 1] ?? [0, 0];
    const cx = sx + (pts.length === 2 ? (pts[0][0] + pts[1][0]) / 2 : mid[0]);
    const cy = sy + (pts.length === 2 ? (pts[0][1] + pts[1][1]) / 2 : mid[1]);
    void prev;
    const t = push(
      base(
        "text",
        {
          x: cx - m.width / 2,
          y: cy - m.height / 2,
          ...m,
          text: o.label,
          originalText: o.label,
          fontSize,
          fontFamily: 5,
          textAlign: "center",
          verticalAlign: "middle",
          containerId: a.id,
          autoResize: true,
          lineHeight: 1.25,
          strokeColor: o.stroke ?? COLORS.ink,
          frameId: o.frameId ?? null,
          groupIds: o.groupIds ?? [],
        },
        a.updated,
      ),
    );
    a.boundElements.push({ type: "text", id: t.id });
  }
  return a;
};

const line = (x, y, pts, o = {}) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return push(
    base(
      "line",
      {
        x,
        y,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: pts,
        lastCommittedPoint: null,
        startArrowhead: null,
        endArrowhead: null,
        startBinding: null,
        endBinding: null,
        strokeColor: o.stroke ?? COLORS.ink,
        strokeStyle: o.strokeStyle ?? "solid",
        strokeWidth: o.strokeWidth ?? 2,
        roughness: o.roughness ?? 1,
        frameId: o.frameId ?? null,
        groupIds: o.groupIds ?? [],
        polygon: false,
      },
      o.when,
    ),
  );
};

// freehand scribbles
const freedraw = (x, y, pts, o = {}) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return push(
    base(
      "freedraw",
      {
        x,
        y,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: pts,
        pressures: [],
        simulatePressure: true,
        lastCommittedPoint: null,
        strokeColor: o.stroke ?? COLORS.red,
        strokeWidth: o.strokeWidth ?? 2,
        roughness: 0,
        frameId: o.frameId ?? null,
      },
      o.when,
    ),
  );
};
const circleScribble = (cx, cy, rx, ry, o) => {
  const pts = [];
  const turns = 1.12;
  const n = 46;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 * turns - 0.4;
    const wob = 1 + (rand() - 0.5) * 0.05;
    pts.push([
      Math.round((Math.cos(t) * rx * wob + rx) * 10) / 10,
      Math.round((Math.sin(t) * ry * wob + ry) * 10) / 10,
    ]);
  }
  return freedraw(cx - rx, cy - ry, pts, o);
};
const tick = (x, y, s, o) =>
  freedraw(
    x,
    y,
    [
      [0, s * 0.5],
      [s * 0.15, s * 0.65],
      [s * 0.3, s * 0.85],
      [s * 0.38, s * 0.95],
      [s * 0.5, s * 0.7],
      [s * 0.7, s * 0.35],
      [s * 0.9, s * 0.08],
      [s, 0],
    ],
    o,
  );
const underline = (x, y, w, o) => {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    pts.push([Math.round((w * i) / 14), Math.round(Math.sin(i * 0.9) * 2 + i * 0.3)]);
  }
  return freedraw(x, y, pts, o);
};

const frame = (x, y, w, h, name, when) =>
  push(
    base(
      "frame",
      {
        x,
        y,
        width: w,
        height: h,
        name,
        strokeColor: "#bbb",
        roughness: 0,
        strokeWidth: 2,
      },
      when,
    ),
  );

const group = () => nid("g");

// ======================================================================
// 0. Board title + legend (top-left, outside frames)
// ======================================================================
text(0, -260, "Ledgerline · Platform planning board", {
  fontSize: 44,
  when: at("2026-04-14T09:15:00Z"),
});
text(
  2,
  -200,
  "owner: Maya Okafor (platform eng) — shared with Priya, Tomás, Jun, Elif\nlast big cleanup: Oct 31 · old stuff lives in the \"Archive\" frame at the bottom",
  { fontSize: 18, color: COLORS.grey, when: at("2026-10-31T16:02:00Z") },
);

// ======================================================================
// 1. Architecture frame
// ======================================================================
{
  const FX = 0;
  const FY = 0;
  const f = frame(FX, FY, 1500, 980, "Payments platform — architecture (as of Oct)", at("2026-04-15T10:00:00Z"));
  const o = { frameId: f.id };
  const svc = (x, y, label, bg, extra = {}) =>
    rect(FX + x, FY + y, 210, 84, { ...o, bg, label, fontSize: 20, ...extra });

  const web = svc(60, 70, "Web dashboard\n(Next.js)", COLORS.blueBg);
  const mobile = svc(320, 70, "Mobile apps\niOS / Android", COLORS.blueBg);
  const partners = svc(580, 70, "Partner API\nclients", COLORS.greyBg, { strokeStyle: "dashed" });

  const gw = rect(FX + 180, FY + 250, 560, 70, {
    ...o,
    bg: COLORS.violetBg,
    label: "API gateway (Kong) — rate limits, mTLS for partners",
    fontSize: 20,
  });
  arrow(web, "b", gw, "t", { ...o });
  arrow(mobile, "b", gw, "t", { ...o });
  arrow(partners, "b", gw, "t", { ...o, strokeStyle: "dashed" });

  const auth = svc(40, 420, "auth-svc\n(OIDC, sessions)", COLORS.yellowBg);
  const pay = svc(300, 420, "payments-svc", COLORS.yellowBg);
  const ledger = svc(560, 420, "ledger-svc\n(double entry)", COLORS.yellowBg);
  const notif = svc(820, 420, "notifications", COLORS.yellowBg);

  arrow(gw, "b", auth, "t", { ...o });
  arrow(gw, "b", pay, "t", { ...o });
  arrow(gw, "b", ledger, "t", { ...o });

  const kafka = ellipse(FX + 430, FY + 600, 300, 90, {
    ...o,
    bg: COLORS.orangeBg,
    label: "Kafka\npayments.events",
    fontSize: 20,
  });
  arrow(pay, "b", kafka, "t", { ...o, label: "PaymentCaptured" });
  arrow(kafka, "r", notif, "b", {
    ...o,
    via: [[FX + 925, FY + 645]],
    label: "consume",
  });
  arrow(ledger, "b", kafka, "t", { ...o, startArrowhead: "arrow", endArrowhead: "arrow" });

  const pg = rect(FX + 300, FY + 790, 210, 100, {
    ...o,
    bg: COLORS.tealBg,
    label: "Postgres 16\nprimary",
  });
  const replica = rect(FX + 560, FY + 790, 210, 100, {
    ...o,
    bg: COLORS.tealBg,
    strokeStyle: "dashed",
    label: "read replica\n(reporting)",
  });
  arrow(pg, "r", replica, "l", { ...o, strokeStyle: "dotted", label: "WAL" });
  arrow(auth, "b", pg, "l", { ...o, via: [[FX + 145, FY + 840]] });
  const redis = rect(FX + 40, FY + 620, 210, 70, {
    ...o,
    bg: COLORS.redBg,
    label: "Redis (idempotency keys)",
    fontSize: 18,
  });
  arrow(pay, "l", redis, "t", { ...o, via: [[FX + 145, FY + 462]], strokeStyle: "dashed" });

  // external providers
  const ext = rect(FX + 1110, FY + 180, 340, 520, {
    ...o,
    bg: "transparent",
    strokeStyle: "dashed",
    stroke: COLORS.grey,
  });
  text(FX + 1130, FY + 196, "external", { ...o, fontSize: 18, color: COLORS.grey });
  const stripe = rect(FX + 1170, FY + 250, 220, 80, {
    ...o,
    bg: COLORS.greyBg,
    label: "Stripe (cards, 3DS)",
    fontSize: 18,
  });
  const plaid = rect(FX + 1170, FY + 380, 220, 80, {
    ...o,
    bg: COLORS.greyBg,
    label: "Plaid (bank linking)",
    fontSize: 18,
  });
  const sendgrid = rect(FX + 1170, FY + 510, 220, 80, {
    ...o,
    bg: COLORS.greyBg,
    label: "Twilio / SendGrid",
    fontSize: 18,
  });
  void ext;
  arrow(pay, "r", stripe, "l", {
    ...o,
    via: [[FX + 900, FY + 360], [FX + 1060, FY + 290]],
    label: "charges + webhooks",
    startArrowhead: "arrow",
  });
  arrow(auth, "t", plaid, "l", {
    ...o,
    via: [[FX + 145, FY + 380], [FX + 1060, FY + 420]],
    strokeStyle: "dashed",
  });
  arrow(notif, "r", sendgrid, "l", { ...o });

  // callouts
  text(FX + 830, FY + 790, "⚠ replica lag spikes during\nmonth-end close (see INC-212)", {
    ...o,
    fontSize: 18,
    color: COLORS.red,
    when: at("2026-09-02T14:21:00Z"),
  });
  circleScribble(FX + 665, FY + 840, 135, 72, { ...o, when: at("2026-09-02T14:22:00Z") });
  text(FX + 60, FY + 920, "TODO: draw the fraud scoring path (risk-svc) once Elif's RFC lands", {
    ...o,
    fontSize: 18,
    color: COLORS.violet,
    when: at("2026-10-08T11:00:00Z"),
  });
}

// ======================================================================
// 2. Q4 roadmap frame (swimlanes on a timeline)
// ======================================================================
{
  const FX = 1700;
  const FY = 0;
  const W = 1900;
  const f = frame(FX, FY, W, 980, "Q4 2026 roadmap", at("2026-09-22T09:30:00Z"));
  const o = { frameId: f.id };
  const months = ["October", "November", "December"];
  const colW = 520;
  const left = FX + 260;
  // month header + today marker
  months.forEach((m, i) => {
    text(left + i * colW + 10, FY + 50, m, { ...o, fontSize: 28 });
    line(left + i * colW, FY + 40, [[0, 0], [0, 900]], {
      ...o,
      stroke: "#ced4da",
      strokeStyle: "dashed",
      strokeWidth: 1,
    });
  });
  // "today" = Nov 17
  const todayX = left + colW + Math.round((16 / 30) * colW);
  line(todayX, FY + 90, [[0, 0], [0, 860]], { ...o, stroke: COLORS.red, strokeWidth: 2 });
  text(todayX + 8, FY + 92, "today", { ...o, fontSize: 16, color: COLORS.red });

  const lanes = [
    { name: "Platform", y: 140 },
    { name: "Payments", y: 340 },
    { name: "Risk & compliance", y: 540 },
    { name: "Growth", y: 740 },
  ];
  lanes.forEach((l) => {
    rect(FX + 30, FY + l.y, W - 60, 180, {
      ...o,
      bg: "#f8f9fa",
      stroke: "#dee2e6",
      strokeWidth: 1,
      roughness: 0,
    });
    text(FX + 50, FY + l.y + 16, l.name, { ...o, fontSize: 22 });
  });

  const STATUS = {
    done: { bg: COLORS.greenBg, stroke: COLORS.green },
    progress: { bg: COLORS.yellowBg, stroke: "#f08c00" },
    risk: { bg: COLORS.redBg, stroke: COLORS.red },
    todo: { bg: "#ffffff", stroke: COLORS.grey },
    cut: { bg: COLORS.greyBg, stroke: COLORS.grey },
  };
  // day offset (0..91) -> x
  const dx = (d) => left + Math.round((d / 30.5) * colW);
  const items = [
    // lane, startDay, endDay, row, label, status
    [0, 1, 26, 0, "Postgres 14 → 16 upgrade", "done"],
    [0, 20, 58, 1, "Move CI to self-hosted runners", "progress"],
    [0, 45, 88, 0, "Multi-region read path (eu-west-1)", "todo"],
    [0, 62, 85, 1, "Kafka 3.7 + tiered storage", "todo"],
    [1, 3, 30, 0, "Retry webhooks on 5xx w/ backoff", "done"],
    [1, 25, 52, 1, "Idempotency keys v2 (Redis → PG)", "risk"],
    [1, 40, 75, 0, "Checkout v3 rollout (10% → 100%)", "progress"],
    [1, 70, 90, 1, "Refund API GA", "todo"],
    [2, 0, 35, 0, "PCI DSS 4.0 evidence collection", "done"],
    [2, 30, 61, 1, "Fraud scoring v1 (shadow mode)", "progress"],
    [2, 58, 90, 0, "SOC 2 Type II audit window", "todo"],
    [3, 5, 28, 0, "Referral credits experiment", "cut"],
    [3, 18, 50, 1, "Saved cards on mobile", "done"],
    [3, 47, 80, 0, "Invoice reminders (email + SMS)", "progress"],
  ];
  items.forEach(([lane, s, e, row, label, st]) => {
    const y = FY + lanes[lane].y + 56 + row * 60;
    const x = dx(s);
    const w = dx(e) - x;
    const S = STATUS[st];
    const el = rect(x, y, w, 48, {
      ...o,
      bg: S.bg,
      stroke: S.stroke,
      label: st === "cut" ? `${label} — cut` : label,
      fontSize: 16,
      noWrap: true,
      strokeStyle: st === "todo" ? "dashed" : "solid",
      opacity: st === "cut" ? 60 : 100,
    });
    void el;
  });
  // legend
  const lgX = FX + W - 330;
  const lgY = FY + 30;
  const legend = [
    ["done", "shipped"],
    ["progress", "in progress"],
    ["risk", "at risk / blocked"],
    ["todo", "not started"],
    ["cut", "cut"],
  ];
  const lg = group();
  legend.forEach(([k, lbl], i) => {
    const xx = lgX + (i % 3) * 105;
    const yy = lgY + Math.floor(i / 3) * 36;
    rect(xx, yy, 22, 22, {
      ...o,
      bg: STATUS[k].bg,
      stroke: STATUS[k].stroke,
      strokeWidth: 1,
      groupIds: [lg],
    });
    text(xx + 28, yy + 1, lbl, { ...o, fontSize: 14, groupIds: [lg] });
  });
  text(dx(25) + 20, FY + 445, "blocked on Redis\ncluster migration ↓", {
    ...o,
    fontSize: 16,
    color: COLORS.red,
    when: at("2026-11-10T10:30:00Z"),
  });
}

// ======================================================================
// 3. Sprint board (kanban)
// ======================================================================
{
  const FX = 0;
  const FY = 1200;
  const f = frame(FX, FY, 1700, 1180, "Sprint 47 board (Nov 10 – Nov 21)", at("2026-11-10T08:45:00Z"));
  const o = { frameId: f.id };
  const cols = ["Backlog", "In progress", "In review", "Done ✓"];
  const colW = 400;
  const people = ["MO", "PS", "TR", "JL", "EK", "DV"];
  const tickets = {
    Backlog: [
      ["PAY-1502", "Refund API: partial refunds across multiple captures", "", COLORS.yellowBg],
      ["PAY-1497", "Surface Stripe decline codes in dashboard (do_not_honor etc.)", "", COLORS.yellowBg],
      ["PLAT-388", "Rotate KMS keys for ledger-svc", "security", COLORS.pinkBg],
      ["PLAT-391", "Grafana: alert on replica lag > 30s", "", COLORS.blueBg],
      ["RISK-77", "Velocity rule: >5 cards per device / 24h", "", COLORS.violetBg],
      ["GRO-140", "Invoice reminder copy — needs legal review", "blocked", COLORS.orangeBg],
    ],
    "In progress": [
      ["PAY-1488", "Idempotency keys v2: dual-write to Postgres", "PS", COLORS.yellowBg],
      ["PLAT-379", "Self-hosted runners: cache node_modules between jobs", "TR", COLORS.blueBg],
      ["RISK-71", "Fraud score shadow mode — log only, no blocking", "EK", COLORS.violetBg],
      ["PAY-1490", "Checkout v3: ramp to 25% (flag: checkout_v3_ramp)", "MO", COLORS.yellowBg],
    ],
    "In review": [
      ["PAY-1481", "Webhook retry: jitter + max 8 attempts", "JL", COLORS.yellowBg],
      ["PLAT-384", "pg_upgrade runbook v2", "DV", COLORS.blueBg],
      ["GRO-137", "Saved cards: Android biometric prompt", "JL", COLORS.orangeBg],
    ],
    "Done ✓": [
      ["PAY-1476", "Fix double receipt email on retried capture", "MO", COLORS.greenBg],
      ["PLAT-375", "Postgres 16 cutover (prod) 🎉", "DV", COLORS.greenBg],
      ["RISK-69", "PCI evidence: quarterly ASV scan uploaded", "EK", COLORS.greenBg],
      ["PAY-1479", "Ledger: reconcile job handles DST shift", "PS", COLORS.greenBg],
      ["GRO-133", "Mobile: show last-4 + brand on saved cards", "TR", COLORS.greenBg],
    ],
  };
  cols.forEach((c, i) => {
    const cx = FX + 40 + i * (colW + 15);
    rect(cx, FY + 60, colW, 1080, {
      ...o,
      bg: "#f1f3f5",
      stroke: "#dee2e6",
      strokeWidth: 1,
      roughness: 0,
    });
    text(cx + 18, FY + 76, `${c}  (${tickets[c].length})`, { ...o, fontSize: 24 });
    tickets[c].forEach(([key, title, who, bg], j) => {
      const g = group();
      const cy = FY + 130 + j * 165;
      const card = rect(cx + 18, cy, colW - 36, 145, {
        ...o,
        bg,
        roughness: 0,
        strokeWidth: 1,
        groupIds: [g],
        label: `${key}\n${title}`,
        align: "left",
        valign: "top",
        fontSize: 18,
        when: c === "Done ✓" ? at("2026-11-13T15:00:00Z") : undefined,
      });
      void card;
      if (who && people.includes(who)) {
        ellipse(cx + colW - 70, cy + 100, 34, 34, {
          ...o,
          bg: "#ffffff",
          strokeWidth: 1,
          groupIds: [g],
          label: who,
          fontSize: 12,
          noWrap: true,
          fontFamily: 6,
        });
      } else if (who) {
        text(cx + 30, cy + 112, `#${who}`, {
          ...o,
          fontSize: 14,
          color: who === "blocked" ? COLORS.red : COLORS.violet,
          groupIds: [g],
        });
      }
    });
  });
  tick(FX + 40 + 3 * (colW + 15) + colW - 70, FY + 70, 36, { ...o, stroke: COLORS.green });
}

// ======================================================================
// 4. Checkout v3 flow
// ======================================================================
{
  const FX = 1900;
  const FY = 1200;
  const f = frame(FX, FY, 1700, 1180, "Checkout v3 — happy path + 3DS", at("2026-07-21T13:10:00Z"));
  const o = { frameId: f.id, when: at("2026-07-21T13:40:00Z") };
  const start = ellipse(FX + 80, FY + 90, 200, 80, { ...o, bg: COLORS.greenBg, label: "Cart → Pay" });
  const saved = diamond(FX + 380, FY + 60, 240, 140, { ...o, bg: COLORS.yellowBg, label: "saved card?", fontSize: 18 });
  const oneclick = rect(FX + 720, FY + 90, 230, 80, { ...o, bg: COLORS.blueBg, label: "1-click confirm\n(CVC only)", fontSize: 18 });
  const form = rect(FX + 380, FY + 300, 240, 80, { ...o, bg: COLORS.blueBg, label: "Card form\n(Stripe Elements)", fontSize: 18 });
  const create = rect(FX + 720, FY + 300, 230, 80, { ...o, bg: COLORS.yellowBg, label: "create PaymentIntent\n+ idempotency key", fontSize: 16 });
  const tds = diamond(FX + 1050, FY + 270, 240, 140, { ...o, bg: COLORS.yellowBg, label: "3DS required?", fontSize: 18 });
  const challenge = rect(FX + 1060, FY + 500, 220, 80, { ...o, bg: COLORS.orangeBg, label: "3DS challenge\n(iframe modal)", fontSize: 18 });
  const ok = diamond(FX + 1050, FY + 680, 240, 140, { ...o, bg: COLORS.yellowBg, label: "captured?", fontSize: 18 });
  const receipt = rect(FX + 1400, FY + 710, 220, 80, { ...o, bg: COLORS.greenBg, label: "receipt + ledger\nentry", fontSize: 18 });
  const err = rect(FX + 720, FY + 710, 230, 80, { ...o, bg: COLORS.redBg, label: "inline error +\nretry (max 3)", fontSize: 18 });
  arrow(start, "r", saved, "l", o);
  arrow(saved, "r", oneclick, "l", { ...o, label: "yes" });
  arrow(saved, "b", form, "t", { ...o, label: "no" });
  arrow(form, "r", create, "l", o);
  arrow(oneclick, "b", create, "t", o);
  arrow(create, "r", tds, "l", o);
  arrow(tds, "b", challenge, "t", { ...o, label: "yes" });
  arrow(tds, "r", ok, "r", { ...o, label: "no", via: [[FX + 1360, FY + 340], [FX + 1360, FY + 750]] });
  arrow(challenge, "b", ok, "t", o);
  arrow(ok, "r", receipt, "l", { ...o, label: "yes" });
  arrow(ok, "l", err, "r", { ...o, label: "no" });
  arrow(err, "t", form, "b", { ...o, strokeStyle: "dashed", via: [[FX + 835, FY + 560], [FX + 500, FY + 560]] });

  // notes
  rect(FX + 80, FY + 880, 760, 250, {
    ...o,
    bg: "#fff9db",
    roughness: 0,
    strokeWidth: 1,
    label:
      "Open questions (from design review 7/24):\n• do we keep Apple Pay above the card form or as a tab? (Jun: tab)\n• 3DS frictionless rate in EU is ~71% — show spinner, not modal, for frictionless\n• error copy for insufficient_funds vs generic decline\n• Priya: retry must reuse the SAME idempotency key, otherwise double charge risk",
    align: "left",
    valign: "top",
    fontSize: 18,
    noWrap: true,
  });
  text(FX + 900, FY + 900, "metrics to watch during ramp:\n– auth rate (target ≥ 92.5%)\n– p95 checkout latency < 1.8s\n– 3DS abandonment", {
    ...o,
    fontSize: 18,
    color: COLORS.blue,
    when: at("2026-10-20T09:05:00Z"),
  });
  underline(FX + 900, FY + 925, 250, { ...o, stroke: COLORS.blue });
}

// ======================================================================
// 5. Ledger schema (ERD)
// ======================================================================
{
  const FX = 3800;
  const FY = 0;
  const f = frame(FX, FY, 1250, 980, "ledger-svc schema (draft 3)", at("2026-05-06T15:00:00Z"));
  const o = { frameId: f.id };
  const table = (x, y, name, cols, bg) => {
    const h = 50 + cols.length * 26;
    const g = group();
    const head = rect(FX + x, FY + y, 330, 46, {
      ...o,
      bg,
      roughness: 0,
      round: false,
      groupIds: [g],
      label: name,
      fontSize: 20,
      fontFamily: 8,
    });
    const body = rect(FX + x, FY + y + 46, 330, h - 46, {
      ...o,
      bg: "#ffffff",
      roughness: 0,
      round: false,
      groupIds: [g],
      label: cols.join("\n"),
      fontSize: 15,
      fontFamily: 8,
      align: "left",
      valign: "top",
      noWrap: true,
    });
    return { head, body };
  };
  const accounts = table(60, 80, "accounts", [
    "id            uuid  PK",
    "owner_id      uuid  FK → users",
    "currency      char(3)",
    "kind          enum(asset,liability,…)",
    "status        enum(open,frozen,closed)",
    "created_at    timestamptz",
  ], COLORS.tealBg);
  const txns = table(480, 80, "transactions", [
    "id            uuid  PK",
    "external_ref  text  (stripe pi_…)",
    "idempotency   text  UNIQUE",
    "posted_at     timestamptz",
    "description   text",
  ], COLORS.tealBg);
  const entries = table(480, 470, "entries", [
    "id            bigserial PK",
    "transaction_id uuid FK",
    "account_id    uuid FK",
    "amount_minor  bigint  (+/-)",
    "currency      char(3)",
    "-- sum(amount) per txn = 0",
  ], COLORS.tealBg);
  const balances = table(60, 520, "balances (mat. view)", [
    "account_id    uuid",
    "balance_minor bigint",
    "as_of         timestamptz",
  ], COLORS.greyBg);
  arrow(entries.body, "l", accounts.body, "b", { ...o, via: [[FX + 225, FY + 640]], label: "N:1", endArrowhead: "bar", startArrowhead: "triangle" });
  arrow(entries.head, "t", txns.body, "b", { ...o, label: "N:1", endArrowhead: "bar", startArrowhead: "triangle" });
  arrow(balances.head, "t", accounts.body, "b", { ...o, strokeStyle: "dashed", endArrowhead: "arrow" });
  text(FX + 860, FY + 120, "Decisions\n1. amounts in minor units, never floats\n2. entries are append-only\n   (corrections = reversing txn)\n3. FX handled as two txns via\n   clearing account\n4. balances refreshed every 60s,\n   NOT source of truth", {
    ...o,
    fontSize: 17,
    when: at("2026-05-08T10:00:00Z"),
  });
  text(FX + 860, FY + 470, "? partition entries by month\n  once we pass ~500M rows\n  (Jun estimates Q2 2027)", {
    ...o,
    fontSize: 17,
    color: COLORS.orange,
    when: at("2026-08-19T12:30:00Z"),
  });
}

// ======================================================================
// 6. Incident chart (embedded image) + retro notes
// ======================================================================
{
  const FX = 3800;
  const FY = 1200;
  const f = frame(FX, FY, 1250, 1180, "Reliability — retro notes & incident trend", at("2026-10-30T16:00:00Z"));
  const o = { frameId: f.id };

  // bar chart image (as a user would paste a screenshot)
  const data = [
    ["May", 4, 1],
    ["Jun", 6, 2],
    ["Jul", 3, 0],
    ["Aug", 7, 3],
    ["Sep", 5, 1],
    ["Oct", 2, 0],
  ];
  const W = 640;
  const H = 360;
  const bw = 60;
  let bars = "";
  data.forEach(([m, sev3, sev1], i) => {
    const x = 70 + i * 92;
    const h3 = sev3 * 36;
    const h1 = sev1 * 36;
    bars += `<rect x="${x}" y="${300 - h3}" width="${bw}" height="${h3}" fill="#74c0fc"/>`;
    bars += `<rect x="${x}" y="${300 - h3 - h1}" width="${bw}" height="${h1}" fill="#ff8787"/>`;
    bars += `<text x="${x + bw / 2}" y="322" font-size="14" text-anchor="middle" fill="#495057">${m}</text>`;
    bars += `<text x="${x + bw / 2}" y="${292 - h3 - h1}" font-size="13" text-anchor="middle" fill="#212529">${sev3 + sev1}</text>`;
  });
  let grid = "";
  for (let v = 0; v <= 10; v += 2) {
    const y = 300 - v * 36 * 0.75;
    void y;
  }
  for (let v = 0; v <= 8; v += 2) {
    const y = 300 - v * 36;
    grid += `<line x1="55" x2="620" y1="${y}" y2="${y}" stroke="#e9ecef"/>`;
    grid += `<text x="45" y="${y + 4}" font-size="12" text-anchor="end" fill="#868e96">${v}</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/><text x="20" y="28" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" fill="#212529">Incidents by month (payments, 2026)</text><g font-family="Helvetica, Arial, sans-serif">${grid}${bars}</g><rect x="420" y="40" width="12" height="12" fill="#74c0fc"/><text x="438" y="51" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#495057">SEV-2/3</text><rect x="510" y="40" width="12" height="12" fill="#ff8787"/><text x="528" y="51" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#495057">SEV-1</text></svg>`;
  const fileId = "f-incidents-2026-oct-chart";
  const created = at("2026-10-30T16:20:00Z");
  files[fileId] = {
    mimeType: "image/svg+xml",
    id: fileId,
    dataURL: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    created,
    lastRetrieved: created,
  };
  push(
    base(
      "image",
      {
        x: FX + 60,
        y: FY + 80,
        width: W,
        height: H,
        fileId,
        status: "saved",
        scale: [1, 1],
        crop: null,
        frameId: f.id,
        strokeColor: "transparent",
        roundness: null,
      },
      created,
    ),
  );
  text(FX + 60, FY + 455, "source: incident.io export, pasted 10/30", {
    ...o,
    fontSize: 14,
    color: COLORS.grey,
  });

  // retro columns
  const retro = [
    {
      title: "went well 🙂",
      bg: COLORS.greenBg,
      items: [
        "PG16 cutover: 4 min read-only window, zero errors",
        "webhook retries caught 1,284 Stripe 502s during their Oct 21 blip",
        "on-call handoff doc actually used!",
      ],
    },
    {
      title: "didn't go well 😬",
      bg: COLORS.redBg,
      items: [
        "INC-212: replica lag → stale balances shown for 38 min",
        "alert fired in #payments-alerts but nobody acked (muted channel?)",
        "Kafka consumer lag dashboards are still per-partition only",
      ],
    },
    {
      title: "actions",
      bg: COLORS.blueBg,
      items: [
        "[Dmitri] page on replica lag > 30s — PLAT-391",
        "[Maya] balances API reads from primary during close",
        "[Elif] write up INC-212 timeline by Nov 7 ✓",
        "[Jun] consumer-lag rollup panel",
      ],
    },
  ];
  retro.forEach((col, i) => {
    const x = FX + 60 + i * 380;
    const y = FY + 520;
    text(x, y, col.title, { ...o, fontSize: 24 });
    col.items.forEach((it, j) => {
      rect(x, y + 50 + j * 140, 340, 120, {
        ...o,
        bg: col.bg,
        roughness: 1,
        strokeWidth: 1,
        stroke: "#495057",
        label: it,
        fontSize: 17,
        angle: ((j % 2 ? 1 : -1) * (0.5 + rand())) / 100,
      });
    });
  });
  tick(FX + 60 + 2 * 380 + 300, FY + 570 + 2 * 140 + 75, 26, { ...o, stroke: COLORS.green });
  text(FX + 780, FY + 100, "Oct was the quietest month since we\nstarted tracking 🎉\n\n...but INC-212 was the one customers\nactually noticed. Sev count ≠ impact.", {
    ...o,
    fontSize: 18,
    when: at("2026-10-30T16:40:00Z"),
  });
}

// ======================================================================
// 7. Loose scratch area (unframed): interview whiteboard leftovers, 1:1 notes
// ======================================================================
{
  const X = 5300;
  const Y = 0;
  text(X, Y, "scratch", { fontSize: 32, color: COLORS.grey });
  text(X, Y + 60, "1:1 w/ Priya — Nov 12\n- wants to own idempotency v2 end to end ✔\n- interested in staff track, talk to Rosa about\n  scope for H1\n- feedback: design reviews run long, try\n  pre-reads 24h before?", {
    fontSize: 18,
    when: at("2026-11-12T15:30:00Z"),
  });
  const g = group();
  rect(X, Y + 260, 160, 60, { label: "client", groupIds: [g], fontSize: 18 });
  rect(X + 260, Y + 260, 160, 60, { label: "server", groupIds: [g], fontSize: 18 });
  text(X, Y + 340, "sketch for explaining exactly-once to the new hires:\nPOST /charges  Idempotency-Key: 7f3c…\n→ 200 (first)  → 200 cached (replay)  → 409 (param mismatch)", {
    fontSize: 16,
    fontFamily: 8,
    color: COLORS.teal,
    when: at("2026-09-15T13:00:00Z"),
  });
  line(X + 160, Y + 280, [[0, 0], [100, 0]], { groupIds: [g] });
  line(X + 160, Y + 300, [[0, 0], [100, 0]], { groupIds: [g], strokeStyle: "dashed" });
  text(X + 450, Y + 270, "?? retries", { fontSize: 18, color: COLORS.red });
  text(X, Y + 480, "links", { fontSize: 22 });
  text(X, Y + 515, "↗ RFC-031 Idempotency v2", {
    fontSize: 18,
    color: COLORS.blue,
    link: "https://docs.ledgerline.dev/rfc/031-idempotency-v2",
  });
  text(X, Y + 545, "↗ INC-212 postmortem", {
    fontSize: 18,
    color: COLORS.blue,
    link: "https://docs.ledgerline.dev/incidents/INC-212",
  });
  text(X, Y + 575, "↗ Checkout v3 Figma", {
    fontSize: 18,
    color: COLORS.blue,
    link: "https://www.figma.com/file/ledgerline-checkout-v3",
  });
  // a few doodles
  circleScribble(X + 600, Y + 120, 40, 40, { stroke: COLORS.orange });
  text(X + 575, Y + 105, "Q1", { fontSize: 24, color: COLORS.orange });
}

// ======================================================================
// 8. Archive (old, faded content)
// ======================================================================
{
  const FX = 0;
  const FY = 2600;
  const f = frame(FX, FY, 3600, 640, "Archive — Q2/Q3 (kept for reference)", at("2026-04-20T09:00:00Z"));
  const o = { frameId: f.id, opacity: 55 };
  const olds = [
    ["Q2 roadmap (shipped)", ["Stripe Connect payouts", "Apple Pay on web", "Dispute evidence upload", "Ledger v1 backfill"]],
    ["Q3 roadmap", ["PCI DSS 4.0 gap analysis", "Webhook signature v2", "Mobile saved cards (slipped → Q4)", "Read replica for reporting"]],
    ["Hiring loop (filled ✓)", ["Sr. backend — payments", "Staff SRE (offer accepted 8/29)", "EM, Risk (paused)"]],
    ["Vendor eval: KYC", ["Persona — chosen", "Onfido", "Alloy (too pricey)", "build in-house? no."]],
  ];
  olds.forEach(([title, list], i) => {
    const x = FX + 60 + i * 880;
    text(x, FY + 60, title, { ...o, fontSize: 24, when: at("2026-06-30T12:00:00Z") });
    list.forEach((it, j) => {
      rect(x, FY + 110 + j * 115, 380, 90, {
        ...o,
        bg: j === 0 ? COLORS.greenBg : COLORS.greyBg,
        label: it,
        fontSize: 18,
        strokeWidth: 1,
        when: at(`2026-0${5 + (i % 3)}-1${j}T10:00:00Z`),
      });
    });
  });
}

// The #url import opens at scroll 0 / zoom 100%, so place the board title
// and the architecture frame where the first 1440×900 view lands.
for (const el of elements) {
  el.x += 40;
  el.y += 300;
}

// ----------------------------------------------------------------- write
const scene = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: {
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    viewBackgroundColor: "#ffffff",
    lockedMultiSelections: {},
    name: "Ledgerline — platform planning",
    // open on the architecture + roadmap area (fits 1440×900)
    scrollX: 90,
    scrollY: 330,
    zoom: { value: 0.5 },
  },
  files,
};
fs.writeFileSync(out, JSON.stringify(scene, null, 1));
console.log(`wrote ${elements.length} elements, ${Object.keys(files).length} files → ${out}`);
