// Minimal local SMTP server standing in for a real mail provider.
// Accepts any message (no TLS/auth), saves it as .eml in ../data/outbox, replies like Postfix.
import net from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const port = Number(process.argv[2] || 2525);
const outbox = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "outbox");
mkdirSync(outbox, { recursive: true });
let n = 0;
net.createServer((sock) => {
  let buf = "", inData = false, data = [], from = "", to = [];
  const say = (s) => sock.write(s + "\r\n");
  say("220 mail.brightwater.local ESMTP Postfix");
  sock.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (inData) {
        if (line === ".") {
          inData = false;
          const id = `${Date.now().toString(36)}${(n++).toString(36)}`.toUpperCase();
          writeFileSync(join(outbox, `${id}.eml`), `X-Stub-From: ${from}\r\nX-Stub-To: ${to.join(", ")}\r\n` + data.join("\r\n"));
          console.log(`[smtp-stub] queued ${id} from=${from} to=${to.join(",")}`);
          say(`250 2.0.0 Ok: queued as ${id}`); data = []; to = [];
        } else data.push(line.startsWith("..") ? line.slice(1) : line);
        continue;
      }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO") { say("250-mail.brightwater.local"); say("250-SIZE 52428800"); say("250-8BITMIME"); say("250 SMTPUTF8"); }
      else if (cmd === "HELO") say("250 mail.brightwater.local");
      else if (cmd === "MAIL") { from = line.slice(10).trim(); say("250 2.1.0 Ok"); }
      else if (cmd === "RCPT") { to.push(line.slice(8).trim()); say("250 2.1.5 Ok"); }
      else if (cmd === "DATA") { inData = true; say("354 End data with <CR><LF>.<CR><LF>"); }
      else if (cmd === "RSET") { data = []; to = []; say("250 2.0.0 Ok"); }
      else if (cmd === "NOOP") say("250 2.0.0 Ok");
      else if (cmd === "QUIT") { say("221 2.0.0 Bye"); sock.end(); }
      else if (cmd === "AUTH") say("235 2.7.0 Authentication successful");
      else say("502 5.5.2 Error: command not recognized");
    }
  });
  sock.on("error", () => {});
}).listen(port, "127.0.0.1", () => console.log(`[smtp-stub] listening on 127.0.0.1:${port}`));
