// Test client standing in for the browser: joins the room, counts chat, collaboration
// state, file offers, and accepts one file to check that bulk data flows.
import "./env";
import * as Y from "yjs";
import { NativeWebRTCSession } from "../../src/client/lib/webrtc";
import { P2PCollaborationProvider } from "../../src/client/lib/p2p-collaboration";

const room = process.env.ZEST_ROOM ?? "2468";
let chats = 0; const offers: string[] = []; let bulkBytes = 0; let accepted = false;
const session: NativeWebRTCSession = new NativeWebRTCSession(room, () => {}, () => console.log("probe connected"), (e) => {}, () => console.log("room full"), () => {}, () => {},
  () => { chats += 1; }, () => {}, () => {}, () => {});
session.attachFileTransferManager({
  handleControl(message: any) {
    if (message.type === "FILE_OFFER") {
      offers.push(`${message.name} (${message.size})`);
      if (!accepted && message.name.endsWith(".docx")) { accepted = true; session.sendControlMessage({ type: "FILE_ACCEPT", transferId: message.transferId, credit: 4 * 1_048_576, completedBlocks: [] }); }
    }
  },
  handleSegment(data: ArrayBuffer) { bulkBytes += data.byteLength; },
  setConnectionRoute() {},
} as any);
const provider = new P2PCollaborationProvider(session);
session.connect();
setTimeout(() => {
  const doc = provider.document;
  console.log(JSON.stringify({ chats, offers, bulkBytes, docChars: doc.getXmlFragment("default").toString().length, strokes: doc.getArray("zestsend-canvas-strokes").length }, null, 1));
  session.close(); setTimeout(() => process.exit(0), 700);
}, Number(process.env.PROBE_MS ?? 14000));
