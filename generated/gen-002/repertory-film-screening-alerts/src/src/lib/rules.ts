import type { Cinema, Film, Format, Rules, Verdict } from "../types";
import { PRINT_FORMATS } from "../types";

export const QUIET_HOURS_LABEL = "11:00 p.m. to 7:00 a.m.";

/** What the service does today: every wanted-film screening alerts you. */
export const CURRENT_RULES: Rules = {
  mode: "everything",
  unseenOnly: false,
  printFormats: [...PRINT_FORMATS],
  soldThreshold: 70,
  mutedSeries: [],
  roundupDay: "Sunday",
  roundupTime: "08:00",
};

/** The filter Jonah described: interrupt for prints and nearly sold-out shows of films he hasn't seen. */
export const PROPOSED_RULES: Rules = {
  mode: "filtered",
  unseenOnly: true,
  printFormats: [...PRINT_FORMATS],
  soldThreshold: 85,
  mutedSeries: ["Witching Hour Late Shows"],
  roundupDay: "Sunday",
  roundupTime: "08:00",
};

export function percentSold(sold: number, seats: number): number {
  return Math.round((sold / seats) * 100);
}

/**
 * Decides whether one screening event interrupts or goes to the roundup.
 * Order matters: muted series first, then seen films, then print formats, then sold-out.
 */
export function verdict(
  film: Film,
  format: Format,
  sold: number,
  seats: number,
  series: string | null,
  rules: Rules,
): Verdict {
  if (rules.mode === "everything") {
    return { route: "interrupt", reason: "Alerts on every wanted-film screening" };
  }
  if (series && rules.mutedSeries.includes(series)) {
    return { route: "roundup", reason: `Muted series: ${series}` };
  }
  if (film.seen && rules.unseenOnly) {
    return { route: "roundup", reason: "Already seen" };
  }
  if (rules.printFormats.includes(format)) {
    return { route: "interrupt", reason: `${format} print` };
  }
  const pct = percentSold(sold, seats);
  if (pct >= rules.soldThreshold) {
    return { route: "interrupt", reason: `${pct}% sold` };
  }
  return {
    route: "roundup",
    reason: format === "DCP" ? "Digital, not a print" : `Under ${rules.soldThreshold}% sold`,
  };
}

export function verdictFor(film: Film, cinema: Cinema, format: Format, sold: number, series: string | null, rules: Rules) {
  return verdict(film, format, sold, cinema.seats, series, rules);
}
