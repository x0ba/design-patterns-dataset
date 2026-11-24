// Verification helper: electron shot.cjs <baseUrl> <outDir> <path1> [path2...]
// Logs in as the demo user through the app's API, then screenshots each path at 1440x900.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const [base, outDir, ...paths] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { offscreen: false } });
  const logs = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 2) logs.push(message); });
  await win.loadURL(base + '/login');
  const r = await win.webContents.executeJavaScript(`(async () => {
    const t = await (await fetch('/api/csrf-token', {credentials: 'include'})).json();
    const res = await fetch('/api/auth/login', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': t.token}, body: JSON.stringify({email: 'priya.raman@example.com', password: 'ikuyo-demo-2026'})});
    return res.status;
  })()`);
  console.log('login', r);
  for (const [i, p] of paths.entries()) {
    await win.loadURL(base + p);
    await new Promise((res) => setTimeout(res, 5000));
    const img = await win.webContents.capturePage();
    const f = `${outDir}/shot-${i}.png`;
    fs.writeFileSync(f, img.toPNG());
    console.log('saved', f, p, await win.webContents.executeJavaScript('location.pathname'));
  }
  console.log('console errors:', logs.slice(0, 15).join('\n'));
  app.quit();
});
