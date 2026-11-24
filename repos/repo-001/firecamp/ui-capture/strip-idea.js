// The sandbox forbids creating some dotfiles (.idea/, .vscode/, .gitmodules, .gitconfig, shell rc files...).
// A few npm tarballs ship such IDE/VCS metadata; drop those entries from the pnpm store index so they are not linked.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'cache/pnpm-store/v3/files');
const bad = /(^|\/)(\.idea\/|\.vscode\/|\.gitmodules$|\.gitconfig$|\.bashrc$|\.zshrc$|\.profile$|\.bash_profile$|\.mcp\.json$|\.ripgreprc$)/;
const quick = /\.idea\/|\.vscode\/|\.gitmodules|\.gitconfig|\.bashrc|\.zshrc|\.profile|\.bash_profile|\.mcp\.json|\.ripgreprc/;
let n = 0;
for (const d of fs.readdirSync(root)) {
  const dir = path.join(root, d);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('-index.json')) continue;
    const p = path.join(dir, f);
    const txt = fs.readFileSync(p, 'utf8');
    if (!quick.test(txt)) continue;
    const j = JSON.parse(txt);
    let ch = false;
    for (const k of Object.keys(j.files)) if (bad.test(k)) { delete j.files[k]; ch = true; }
    if (ch) { fs.writeFileSync(p, JSON.stringify(j)); n++; }
  }
}
console.log('stripped', n);
