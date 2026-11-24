import { useCallback, useMemo, useState } from 'react';
import type { Decision } from '../types';

const OVERLAY_KEY = 'tapcard-assist:northgate-2026-03:decisions:v1';

/** `null` means the reviewer cleared a decision that the seed file had set. */
type Overlay = Record<string, Decision | null>;

function readOverlay(): Overlay {
  try {
    const raw = window.localStorage.getItem(OVERLAY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Overlay) : {};
  } catch {
    return {};
  }
}

function writeOverlay(next: Overlay) {
  try {
    if (Object.keys(next).length === 0) window.localStorage.removeItem(OVERLAY_KEY);
    else window.localStorage.setItem(OVERLAY_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, quota). Decisions then last for this page view only.
  }
}

/**
 * Reviewer decisions. The seed file holds decisions made before this session;
 * the overlay holds changes made in this browser. Effective = seed + overlay.
 */
export function useDecisions(seed: Record<string, Decision>) {
  const [overlay, setOverlay] = useState<Overlay>(readOverlay);

  const decisions = useMemo(() => {
    const out: Record<string, Decision> = { ...seed };
    for (const [id, d] of Object.entries(overlay)) {
      if (d) out[id] = d;
      else delete out[id];
    }
    return out;
  }, [seed, overlay]);

  const setDecision = useCallback((ids: string[], d: Decision | null) => {
    setOverlay((prev) => {
      const next: Overlay = { ...prev };
      for (const id of ids) next[id] = d;
      writeOverlay(next);
      return next;
    });
  }, []);

  const resetLocalChanges = useCallback(() => {
    setOverlay({});
    writeOverlay({});
  }, []);

  return { decisions, setDecision, resetLocalChanges, hasLocalChanges: Object.keys(overlay).length > 0 };
}

const DRAFT_KEY = 'tapcard-assist:instructions:draft:v1';

export function loadDraft(fallback: string): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveDraft(text: string) {
  try {
    window.localStorage.setItem(DRAFT_KEY, text);
  } catch {
    // ignore; the draft stays in the editor for this page view
  }
}
