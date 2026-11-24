// Preloaded with `node --import` (via NODE_OPTIONS) so that every `import 'node-llama-cpp'`
// in the catai server resolves to the local offline LLM stub instead of the native bindings.
import {register} from 'node:module';
register('./hooks.mjs', import.meta.url);
