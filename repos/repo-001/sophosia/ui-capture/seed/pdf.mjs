// Tiny text-only PDF writer used to give seeded papers a real, readable PDF.
// Letter pages, Helvetica / Helvetica-Bold, word-wrapped. Returns the bytes
// and the position of every line so highlights can be placed on real text.
const W = 612;
const H = 792;
const MARGIN = 72;

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "-");
}

function wrap(text, size) {
  const maxChars = Math.floor((W - 2 * MARGIN) / (size * 0.5));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/**
 * blocks: [{text, size?, bold?, gap?}]
 */
export function makePdf(blocks, { header = "" } = {}) {
  const pages = [[]];
  const lineIndex = [];
  let y = H - MARGIN;
  for (const b of blocks) {
    const size = b.size || 10.5;
    const lead = size * 1.38;
    y -= b.gap ?? size * 0.6;
    for (const line of wrap(b.text, size)) {
      if (y - lead < MARGIN) {
        pages.push([]);
        y = H - MARGIN;
      }
      y -= lead;
      pages[pages.length - 1].push({ x: MARGIN, y, size, bold: !!b.bold, text: line });
      lineIndex.push({
        page: pages.length,
        text: line,
        // percentages of page, top-left origin (Sophosia's legacy Rect)
        left: (MARGIN / W) * 100,
        top: ((H - y - size) / H) * 100,
        width: ((line.length * size * 0.5) / W) * 100,
        height: ((size * 1.25) / H) * 100,
      });
    }
  }

  const objs = [];
  const add = (s) => {
    objs.push(s);
    return objs.length;
  };
  const catalog = add(null);
  const pagesObj = add(null);
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontB = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids = [];
  pages.forEach((lines, i) => {
    let s = "";
    if (header) s += `BT /F1 8 Tf 0.4 g ${MARGIN} ${H - 40} Td (${esc(header)}) Tj ET\n`;
    s += `BT /F1 8 Tf 0.4 g ${W / 2 - 4} 40 Td (${i + 1}) Tj ET\n`;
    for (const l of lines)
      s += `BT /${l.bold ? "F2" : "F1"} ${l.size} Tf 0 g ${l.x} ${l.y.toFixed(2)} Td (${esc(l.text)}) Tj ET\n`;
    const content = add(`<< /Length ${Buffer.byteLength(s, "latin1")} >>\nstream\n${s}endstream`);
    const page = add(
      `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> >> /Contents ${content} 0 R >>`
    );
    kids.push(page);
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { bytes: Buffer.from(out, "latin1"), lines: lineIndex, pageCount: pages.length };
}
