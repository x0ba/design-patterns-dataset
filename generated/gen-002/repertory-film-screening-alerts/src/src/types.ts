export type Format = "70mm" | "35mm" | "16mm" | "DCP";

export const FORMATS: Format[] = ["70mm", "35mm", "16mm", "DCP"];
export const PRINT_FORMATS: Format[] = ["70mm", "35mm", "16mm"];

export interface Cinema {
  id: string;
  name: string;
  seats: number;
  formats: Format[];
}

export interface Film {
  id: string;
  title: string;
  year: number;
  director: string;
  seen: boolean;
  mustSeeOnFilm: boolean;
  runtime?: number;
}

export interface SalesPoint {
  date: string; // YYYY-MM-DD
  sold: number;
}

export interface Screening {
  id: string;
  filmId: string;
  cinemaId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h
  format: Format;
  sold: number;
  series: string | null;
  price: number;
  sales?: SalesPoint[];
}

export type AlertType = "new" | "selling" | "last" | "upgrade";

export const ALERT_LABEL: Record<AlertType, string> = {
  new: "New screening",
  selling: "Selling fast",
  last: "Last showing",
  upgrade: "Format upgrade",
};

/** One alert the service sent (or would have sent). Capacity comes from the cinema. */
export interface AlertEvent {
  id: string;
  at: string; // YYYY-MM-DDTHH:MM
  type: AlertType;
  filmId: string;
  cinemaId: string;
  format: Format;
  date: string;
  time: string;
  sold: number;
  series: string | null;
}

export type Mode = "everything" | "filtered";

export interface Rules {
  /** "everything" = current behaviour: every wanted-film screening alerts. */
  mode: Mode;
  /** Only interrupt for films not yet seen. */
  unseenOnly: boolean;
  /** Print formats that interrupt. */
  printFormats: Format[];
  /** Percent sold at or above which an unseen film interrupts. Also the selling-fast trigger. */
  soldThreshold: number;
  /** Series that never interrupt. */
  mutedSeries: string[];
  roundupDay: string;
  roundupTime: string;
}

export interface Decision {
  choice: "none" | "buy-sat" | "wait-sun";
}

export interface Verdict {
  route: "interrupt" | "roundup";
  reason: string;
}
