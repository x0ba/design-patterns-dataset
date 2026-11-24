// Stub for node-fetch: serves feeds from .ui-capture/fixtures instead of the network.
// Uses the real node-fetch Response/FetchError classes so the app sees genuine objects.
import { Response, Headers, FetchError } from "node-fetch";
import { readFile } from "fs/promises";

const FIX = new URL("../fixtures/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", FIX), "utf8"));

export default async function fetch(url) {
  const entry = manifest[String(url)];
  // small, varied latency like real servers
  await new Promise(r => setTimeout(r, entry?.latency ?? 50));
  if (!entry || entry.error) {
    const host = new URL(String(url)).hostname;
    throw new FetchError(`request to ${url} failed, reason: getaddrinfo ENOTFOUND ${host}`, "system", { code: "ENOTFOUND" });
  }
  const body = await readFile(new URL(entry.file, FIX));
  return new Response(body, { status: 200, headers: { "content-type": entry.contentType } });
}
export { Response, Headers, FetchError };
