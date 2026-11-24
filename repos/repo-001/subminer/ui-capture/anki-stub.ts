// Minimal local AnkiConnect stub (JSON-RPC on 127.0.0.1:$ANKI_STUB_PORT).
// Answers notesInfo/guiBrowse/deckNames etc. from the notes the seed "mined" (data/anki-notes.json).
import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.env.ANKI_STUB_PORT ?? 18765);
const notes: Array<{ noteId: number; [k: string]: unknown }> = JSON.parse(
  fs.readFileSync(path.join(import.meta.dir, 'data', 'anki-notes.json'), 'utf8'),
);
const byId = new Map(notes.map((n) => [n.noteId, n]));

Bun.serve({
  port,
  hostname: '127.0.0.1',
  async fetch(req) {
    const body = (await req.json().catch(() => ({}))) as { action?: string; params?: Record<string, unknown> };
    const ok = (result: unknown) => Response.json({ result, error: null });
    switch (body.action) {
      case 'version':
        return ok(6);
      case 'notesInfo': {
        const ids = (body.params?.notes as number[]) ?? [];
        return ok(ids.map((id) => byId.get(id) ?? {}));
      }
      case 'guiBrowse':
        return ok(((body.params?.query as string) ?? '').startsWith('nid:') ? [Number(String(body.params?.query).slice(4)) + 1] : []);
      case 'deckNames':
        return ok(['Default', 'Mining', 'Mining::Anime', 'Kaishi 1.5k']);
      case 'modelNames':
        return ok(['Basic', 'Lapis', 'Kaishi 1.5k']);
      case 'findNotes':
        return ok(notes.map((n) => n.noteId));
      default:
        return ok(null);
    }
  },
});
console.log(`AnkiConnect stub on http://127.0.0.1:${port}`);
