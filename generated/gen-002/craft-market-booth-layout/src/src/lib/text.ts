/** Splits a booth name into at most `maxLines` lines of about `maxChars` characters, ending with an ellipsis if cut. */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let idx = 0;
  while (idx < words.length && lines.length < maxLines) {
    let line = words[idx++];
    while (idx < words.length && (line + ' ' + words[idx]).length <= maxChars) {
      line += ' ' + words[idx++];
    }
    lines.push(line);
  }
  if (idx < words.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last) + '…';
  }
  return lines;
}
