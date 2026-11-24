// Build wrapper used only for the local capture: the repo's own rsbuild config
// plus a pre-entry that points the MapTiler SDK at the local stub.
import { mergeRsbuildConfig } from '@rsbuild/core';
import base from '../rsbuild.config';

export default mergeRsbuildConfig(base, {
  source: { preEntry: ['./.ui-capture/maptiler-offline.ts'] },
  output: { distPath: { root: '.ui-capture/web' }, sourceMap: { js: false, css: false } },
});
