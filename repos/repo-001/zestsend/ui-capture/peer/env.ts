// Browser globals required by the app's own WebRTC/file-transfer modules when
// they run inside Node as the "remote participant" of the room.
import { createRequire } from "node:module";

const polyfill = createRequire(import.meta.url)("@roamhq/wrtc") as Record<string, unknown>;

const origin = process.env.ZEST_ORIGIN ?? "http://127.0.0.1:4442";
const g = globalThis as any;

const store = new Map<string, string>();
const sessionStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};

g.window = g;
g.location = new URL(origin);
g.sessionStorage = sessionStorage;
g.addEventListener ??= () => undefined;
g.removeEventListener ??= () => undefined;
g.dispatchEvent ??= () => true;
for (const name of ["MediaStream", "MediaStreamTrack", "RTCDataChannel", "RTCDataChannelEvent", "RTCIceCandidate", "RTCPeerConnection", "RTCPeerConnectionIceEvent", "RTCRtpReceiver", "RTCRtpSender", "RTCRtpTransceiver", "RTCSessionDescription"]) {
  g[name] ??= polyfill[name];
}
// The sending side of FileTransferManager never uses the OPFS receive worker.
g.Worker ??= class {
  onmessage: unknown = null;
  postMessage() {}
  terminate() {}
};
g.MediaStream ??= class {
  private tracks: unknown[] = [];
  getTracks() { return this.tracks; }
  addTrack(track: unknown) { this.tracks.push(track); }
  removeTrack() {}
};
g.requestAnimationFrame ??= (callback: (time: number) => void) => setTimeout(() => callback(Date.now()), 16);
g.cancelAnimationFrame ??= (id: ReturnType<typeof setTimeout>) => clearTimeout(id);
