// Local stand-in for https://www.google.com/s2/favicons?domain=...&sz=32.
// Returns a deterministic SVG "site icon" (brand-ish color + initial) per domain.
import http from "node:http";

const port = Number(process.env.FAVICON_PORT || 4435);
const known = {
  "blog.cloudflare.com": ["#F38020", "C"], "github.blog": ["#24292F", "G"], "news.ycombinator.com": ["#FF6600", "Y"],
  "arstechnica.com": ["#FF4E00", "a"], "www.theverge.com": ["#5200FF", "V"], "lwn.net": ["#FFCC00", "L"],
  "simonwillison.net": ["#2B5797", "S"], "jvns.ca": ["#E2508D", "J"], "go.dev": ["#00ADD8", "Go"],
  "blog.rust-lang.org": ["#000000", "R"], "www.smashingmagazine.com": ["#E85C33", "S"], "css-tricks.com": ["#FF7A18", "*"],
  "danluu.com": ["#444444", "D"], "martinfowler.com": ["#2F6DB5", "M"], "www.quantamagazine.org": ["#5D2E8C", "Q"],
  "xkcd.com": ["#96A8C8", "x"], "www.nasa.gov": ["#0B3D91", "N"], "www.seriouseats.com": ["#C8102E", "S"],
  "kottke.org": ["#2E7D32", "k"], "www.atlasobscura.com": ["#1F3A3D", "A"], "daringfireball.net": ["#4A525A", "★"],
  "stratechery.com": ["#F28C28", "S"], "www.bbc.co.uk": ["#BB1919", "B"], "www.economist.com": ["#E3120B", "E"],
  "krebsonsecurity.com": ["#1A1A1A", "K"], "www.schneier.com": ["#7A1F1F", "S"], "overreacted.io": ["#D23669", "O"],
  "www.joshwcomeau.com": ["#6E5BFF", "J"], "rachelbythebay.com": ["#3B6E8F", "R"], "pluralistic.net": ["#C0392B", "P"],
  "www.anandtech.com": ["#1E73BE", "A"], "www.raspberrypi.com": ["#C51A4A", "R"], "hackaday.com": ["#1A1A1A", "H"],
  "sspai.com": ["#D71A1B", "少"], "www.ruanyifeng.com": ["#3A7BD5", "阮"],
};
function color(domain) {
  let h = 0; for (const c of domain) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 55% 45%)`;
}
http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const domain = (url.searchParams.get("domain") || "").toLowerCase();
  const [bg, letter] = known[domain] || [color(domain), (domain.replace(/^www\./, "")[0] || "?").toUpperCase()];
  const fg = bg === "#FFCC00" || bg === "#96A8C8" ? "#111" : "#fff";
  const fs = letter.length > 1 ? 13 : 19;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${bg}"/><text x="16" y="17" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="${fs}" fill="${fg}" text-anchor="middle" dominant-baseline="central">${letter}</text></svg>`;
  res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400", "access-control-allow-origin": "*" });
  res.end(svg);
}).listen(port, () => console.log(`favicon stub on :${port}`));
