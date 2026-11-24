import type { Clip } from '../types';
import { formatDateLong, formatTime } from './time';

/**
 * Memo-ready citation for a saved quote. The timestamp is the start of the transcript
 * segment the quote came from, so the segment range is given as well.
 */
export function formatCitation(clip: Clip): string {
  const timing =
    clip.tEnd > clip.t
      ? `at ${formatTime(clip.t)} (segment ${formatTime(clip.t)}–${formatTime(clip.tEnd)})`
      : `at ${formatTime(clip.t)}`;
  return [
    `"${clip.quote}"`,
    `— ${clip.speakerName}, ${clip.speakerTitle}, ${clip.companyName} (${clip.ticker}), ${clip.quarter} earnings call, recorded ${formatDateLong(clip.callDate)}, ${timing}.`,
  ].join(' ');
}

export function clipsToMarkdown(clips: Clip[]): string {
  const lines = ['# Callroom saved quotes', ''];
  for (const clip of clips) {
    lines.push(`## ${clip.companyName} (${clip.ticker}) · ${clip.quarter} · ${formatTime(clip.t)}`, '');
    lines.push(`> ${clip.quote}`, '');
    lines.push(`Source: ${formatCitation(clip).replace(/^"[^"]*" — /, '')}`, '');
    if (clip.note) lines.push(`Note: ${clip.note}`, '');
  }
  return lines.join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or contexts where the async clipboard API is blocked.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  }
}
