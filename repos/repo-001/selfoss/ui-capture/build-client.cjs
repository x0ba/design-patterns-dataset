// Equivalent of `npm run build` in client/ (parcel build index.html --dist-dir ../public/ --public-url ./),
// but with Parcel's FSCache instead of LMDB, which can't open its lock in the sandbox.
const path = require('path');
const clientDir = path.resolve(__dirname, '../client');
const req = (m) => require(require.resolve(m, { paths: [clientDir] }));
const { default: Parcel } = req('@parcel/core');
const { FSCache } = req('@parcel/cache');
const { NodeFS } = req('@parcel/fs');
// Match `parcel build`: the CLI defaults NODE_ENV to production and passes it as env.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.chdir(clientDir);
(async () => {
  const fs = new NodeFS();
  const cache = new FSCache(fs, path.join(__dirname, 'cache/parcel'));
  const bundler = new Parcel({
    entries: path.join(clientDir, 'index.html'),
    defaultConfig: req.resolve ? require.resolve('@parcel/config-default', { paths: [clientDir] }) : '@parcel/config-default',
    mode: 'production',
    env: { NODE_ENV: process.env.NODE_ENV },
    additionalReporters: [{ packageName: '@parcel/reporter-cli', resolveFrom: clientDir }],
    cache,
    shouldDisableCache: false,
    defaultTargetOptions: { distDir: path.resolve(clientDir, '../public'), publicUrl: './' },
  });
  const { bundleGraph, buildTime } = await bundler.run();
  console.log(`Built ${bundleGraph.getBundles().length} bundles in ${buildTime}ms`);
})().catch((e) => { console.error(e); if (e.diagnostics) console.error(JSON.stringify(e.diagnostics, null, 2)); process.exit(1); });
