// Install-time only: local CONNECT relay that adds credentials from HTTPS_PROXY (yarn 3 drops them).
const http = require('http'), net = require('net');
const up = new URL(process.env.HTTPS_PROXY);
const auth = 'Basic ' + Buffer.from(decodeURIComponent(up.username) + ':' + decodeURIComponent(up.password)).toString('base64');
const srv = http.createServer((req, res) => { res.writeHead(405); res.end(); });
srv.on('connect', (req, cSock, head) => {
  const s = net.connect(+up.port, up.hostname, () => {
    s.write(`CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\nProxy-Authorization: ${auth}\r\n\r\n`);
    let buf = Buffer.alloc(0);
    const onData = (d) => {
      buf = Buffer.concat([buf, d]);
      const i = buf.indexOf('\r\n\r\n');
      if (i < 0) return;
      s.removeListener('data', onData);
      cSock.write(buf.slice(0, i + 4));
      const rest = buf.slice(i + 4); if (rest.length) cSock.write(rest);
      if (head && head.length) s.write(head);
      s.pipe(cSock); cSock.pipe(s);
    };
    s.on('data', onData);
  });
  s.on('error', () => cSock.destroy()); cSock.on('error', () => s.destroy());
});
srv.listen(+process.argv[2] || 18999, '127.0.0.1');
