import type { ReactNode } from "react";

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function toneForDisposition(kind: "complete" | "deficient" | "disqualifying"): Tone {
  return kind === "complete" ? "ok" : kind === "deficient" ? "warn" : "bad";
}
