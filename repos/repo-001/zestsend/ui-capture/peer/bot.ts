// Remote participant for local UI capture. It runs ZestSend's own client
// session code (NativeWebRTCSession, FileTransferManager, Yjs provider) in Node
// so that a browser opening the room connects to a live peer with history.
import "./env";
import * as Y from "yjs";

import { NativeWebRTCSession } from "../../src/client/lib/webrtc";
import { FileTransferManager } from "../../src/client/lib/file-transfer";
import { P2PCollaborationProvider } from "../../src/client/lib/p2p-collaboration";
import { chatScript, buildDocument, buildCanvas, sharedFiles } from "./seed-data";

const roomId = process.env.ZEST_ROOM ?? "2468";
const log = (...args: unknown[]) => console.log(`[peer ${roomId}]`, ...args);

// Persistent shared state: survives the browser reloading/rejoining.
const seedDoc = new Y.Doc();
buildDocument(seedDoc);
buildCanvas(seedDoc);
const seedState = Y.encodeStateAsUpdate(seedDoc);

let session: NativeWebRTCSession | null = null;
let provider: P2PCollaborationProvider | null = null;
let files: FileTransferManager | null = null;
let replayTimers: ReturnType<typeof setTimeout>[] = [];
let generation = 0;
let lastError = "";
let lastStatus = "";
let lastRoute = "";

function clearReplay() {
  for (const timer of replayTimers) clearTimeout(timer);
  replayTimers = [];
}

function replayHistory(active: NativeWebRTCSession, gen: number) {
  clearReplay();
  let delay = 600;
  chatScript.forEach((line, index) => {
    if (line.from !== "peer") return;
    replayTimers.push(setTimeout(() => {
      if (gen !== generation) return;
      active.sendChatMessage(`peer-${gen}-${index}`, line.text);
    }, delay));
    delay += 45;
  });
  sharedFiles.forEach((file, index) => {
    replayTimers.push(setTimeout(() => {
      if (gen !== generation || !files) return;
      const blob = new File([file.bytes()], file.name, { type: file.mimeType, lastModified: Date.now() });
      files.offerFile(blob, `file-${gen}-${index}`);
    }, delay + 200 + index * 60));
  });
}

function start() {
  generation += 1;
  const gen = generation;
  provider?.destroy();
  void files?.dispose();
  clearReplay();

  const manager = new FileTransferManager({
    onError: (id, message) => log("file error", id, message),
    onOffer: () => undefined,
    onUpdate: (snapshot) => {
      if (snapshot.state === "complete" || snapshot.state === "error") log("file", snapshot.name, snapshot.state);
    },
    sendBulk: (data) => session?.sendBulk(data) ?? false,
    sendControl: (message) => session?.sendControlMessage(message) ?? false,
  });
  files = manager;

  const active: NativeWebRTCSession = new NativeWebRTCSession(
    roomId,
    () => undefined,
    () => {
      log("peer connected");
      manager.onTransportReady();
      replayHistory(active, gen);
    },
    (message) => { if (message !== lastError) log("error:", message); lastError = message; },
    () => log("room full"),
    () => { log("peer left; waiting for the next participant"); clearReplay(); },
    (route) => { manager.setConnectionRoute(route); if (route !== lastRoute) log("route", route); lastRoute = route; },
    (message) => {
      log("chat from browser:", message.text);
      active.markChatMessageRead(message.id);
    },
    () => undefined,
    () => undefined,
    () => undefined,
    (status) => {
      const line = `${status.state} sig=${status.signalingState} p2p=${status.p2pState} seat=${status.seatState} ${status.detail ?? ""}`;
      if (process.env.ZEST_DEBUG && line !== lastStatus) log("status", line);
      lastStatus = line;
    },
    () => { log("new participant replaced the previous one"); clearReplay(); },
  );
  session = active;
  active.attachFileTransferManager(manager);

  provider = new P2PCollaborationProvider(active);
  Y.applyUpdate(provider.document, seedState);
  provider.awareness.setLocalStateField("user", { color: "#F472B6", name: "Mira" });
  provider.awareness.setLocalStateField("canvas", { color: "#F472B6", name: "Mira" });
  active.connect();
}

start();
process.on("SIGTERM", () => { session?.close(); process.exit(0); });
process.on("SIGINT", () => { session?.close(); process.exit(0); });
