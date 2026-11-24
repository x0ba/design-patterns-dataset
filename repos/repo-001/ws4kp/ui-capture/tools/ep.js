const { spawn } = require('child_process'); const path = require('path');
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '../stub/server.js')], { env: { ...process.env, PORT: '5477' }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 700));
  for (const u of process.argv.slice(2)) {
    const url = u.startsWith('/') ? 'http://localhost:5477' + u : 'http://localhost:5477/cors/?u=' + encodeURIComponent(u);
    const r = await fetch(url); const b = Buffer.from(await r.arrayBuffer());
    console.log('=== ' + r.status + ' ' + r.headers.get('content-type') + ' ' + b.length + ' ' + u);
    console.log(/image/.test(r.headers.get('content-type')) ? '(binary)' : b.toString().slice(0, +process.env.N || 3000));
  }
  srv.kill();
})();
