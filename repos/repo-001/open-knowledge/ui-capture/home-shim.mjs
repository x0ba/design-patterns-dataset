import os from 'node:os';
import { readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const realUserInfo = os.userInfo;
os.userInfo = (options) => {
  const info = realUserInfo(options);
  return process.env.HOME ? { ...info, homedir: process.env.HOME } : info;
};
syncBuiltinESMExports();

const stubDir = new URL('./stubs/', import.meta.url);
const stubRoutes = new Map([
  ['https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json', 'acp-registry.json'],
]);
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
  const file = url ? stubRoutes.get(url) : undefined;
  if (file) {
    return new Response(readFileSync(new URL(file, stubDir)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return realFetch(input, init);
};
