// Minimal static server with SPA fallback (used only for local seeding/verification)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] || 'out'); const port = +(process.argv[3] || process.env.PORT || 5466);
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.mp3':'audio/mpeg','.opus':'audio/ogg','.woff2':'font/woff2','.txt':'text/plain','.ico':'image/x-icon','.jpg':'image/jpeg'};
http.createServer((req,res)=>{ let p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(root,p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root,'index.html');
  res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res);
}).listen(port,()=>console.log('serving',root,'on',port));
