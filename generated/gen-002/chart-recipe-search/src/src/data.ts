export type Tool = 'matplotlib' | 'ggplot2' | 'D3' | 'Vega-Lite' | 'Observable Plot';
export type Shape = 'daily time series' | 'multi-decade' | 'seasonal' | 'categorical';
export type ThumbKind =
  | 'winterStripes'
  | 'stripes'
  | 'heatmap'
  | 'ribbon'
  | 'ridgeline'
  | 'spiral'
  | 'coldBars'
  | 'snowBars'
  | 'smallMultiples'
  | 'dots'
  | 'freezeRange'
  | 'polar'
  | 'anomalyBars'
  | 'horizon'
  | 'boxplot'
  | 'beeswarm'
  | 'fan'
  | 'histogram'
  | 'snowCalendar'
  | 'line'
  | 'map'
  | 'pyramid'
  | 'monthBars'
  | 'sankey';

export interface ColumnUse {
  expects: string;
  yours: string | null;
  note?: string;
  ok: boolean;
}

export interface Match {
  base: number; // 0–100 fit to the shape of Walter's file
  uses: ColumnUse[];
  winter: 'built-in' | 'one setting' | 'needs rework';
  why: string;
  watch?: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  tool: Tool;
  requires: string[]; // packages / runtimes besides the tool's language
  shapes: Shape[];
  difficulty: 1 | 2 | 3 | 4;
  remakes: number;
  license: string;
  updated: string; // ISO date
  thumb: ThumbKind;
  summary: string;
  sample: { name: string; rows: string; span: string };
  steps: { title: string; mins: number }[];
  missing: string;
  poster: string;
  code: string;
  collections: string[];
  keywords: string;
  remakeExamples?: string[];
  match?: Match;
}

export const USER = {
  handle: 'wpruitt_fargo',
  name: 'Walter Pruitt',
  initials: 'WP',
};

export const FILE = {
  name: 'fargo_daily_1899_2025.csv',
  rows: 46320,
  first: '1899-01-01',
  last: '2025-10-26',
  years: 127,
  winters: 126,
  missingPct: 2.1,
  uploadedAgo: 'just now',
  columns: [
    { name: 'date', type: 'date', detail: '1899-01-01 → 2025-10-26, one row per day', missing: 0 },
    { name: 'tmax_f', type: 'number · °F', detail: '−33 to 114', missing: 1.2 },
    { name: 'tmin_f', type: 'number · °F', detail: '−44 to 83', missing: 1.3 },
    { name: 'prcp_in', type: 'number · inches', detail: '0 to 4.27', missing: 2.6 },
    { name: 'snwd_in', type: 'number · inches', detail: '0 to 39', missing: 5.4 },
  ],
  shapes: [
    { tag: 'daily time series' as Shape, reason: 'one row per calendar day, no gaps longer than 9 days' },
    { tag: 'multi-decade' as Shape, reason: '127 years, 126 complete winters' },
    { tag: 'seasonal' as Shape, reason: 'strong yearly cycle in tmax_f, tmin_f and snwd_in' },
  ],
};

export const RECENT_SEARCHES = [
  'warming stripes but for winter only',
  'many years of daily temperature in one picture',
  'snow depth every day heatmap',
  'winter temperature change over a century',
];

export const COLLECTIONS = [
  {
    id: 'stripes-spirals',
    name: 'Climate stripes and spirals',
    curator: 'ren_okafor',
    count: 48,
    blurb: 'Stripe, spiral and ring charts, from 20-line classics to animated versions.',
    thumbs: ['winterStripes', 'spiral', 'stripes', 'anomalyBars'] as ThumbKind[],
  },
  {
    id: 'seasonal-decades',
    name: 'Seasonal cycle across decades',
    curator: 'marta.vb',
    count: 19,
    blurb: 'Ways to show how the shape of the year has shifted over a long record.',
    thumbs: ['heatmap', 'ribbon', 'polar', 'fan'] as ThumbKind[],
  },
];

// Packages that come along with a standard matplotlib install.
export const BUNDLED = ['numpy', 'Pillow'];

export const SETUP_OPTIONS = [
  { id: 'pandas', label: 'pandas' },
  { id: 'scipy', label: 'SciPy' },
  { id: 'ffmpeg', label: 'ffmpeg (for video)' },
  { id: 'R', label: 'R + ggplot2' },
];

const TOOL_DEFAULT_REQ: Record<Tool, string[]> = {
  matplotlib: ['Python', 'matplotlib'],
  ggplot2: ['R', 'ggplot2'],
  D3: ['JavaScript', 'D3 v7', 'local web server'],
  'Vega-Lite': ['Vega editor (in browser)'],
  'Observable Plot': ['Observable notebook (in browser)'],
};
export { TOOL_DEFAULT_REQ };

/* ---------------------------------------------------------------- code */

const CODE_WINTER_STRIPES = `# Winter-only warming stripes from a daily station record
# Recipe by @e.hollister · CC BY 4.0
# Needs only Python and matplotlib (numpy comes with matplotlib).
import csv
import calendar
from datetime import date
from collections import defaultdict

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import Normalize

CSV_PATH = "fargo_daily_1899_2025.csv"
DATE_COL, TMAX_COL, TMIN_COL = "date", "tmax_f", "tmin_f"
WINTER_MONTHS = (12, 1, 2)       # Dec–Feb; try (11, 12, 1, 2, 3)
MAX_MISSING = 0.10               # skip winters missing >10% of days

# 1. Read daily mean temperature, grouped by winter.
#    December counts toward the FOLLOWING winter: Dec 1950 -> winter 1951.
temps = defaultdict(list)
with open(CSV_PATH, newline="") as f:
    for row in csv.DictReader(f):
        d = date.fromisoformat(row[DATE_COL])
        if d.month not in WINTER_MONTHS:
            continue
        winter = d.year + 1 if d.month == 12 else d.year
        try:
            tmean = (float(row[TMAX_COL]) + float(row[TMIN_COL])) / 2
        except ValueError:       # blank cell = missing value
            continue
        temps[winter].append(tmean)

# 2. Average each winter that has enough days.
years, means = [], []
for w in sorted(temps):
    expected = 31 + 31 + (29 if calendar.isleap(w) else 28)
    if len(temps[w]) < expected * (1 - MAX_MISSING):
        continue                 # e.g. winter 1899 has no December 1898
    years.append(w)
    means.append(np.mean(temps[w]))

anomaly = np.array(means) - np.mean(means)

# 3. One stripe per winter, coloured by how warm it was.
fig = plt.figure(figsize=(18, 6))            # 18 x 6 in poster strip
ax = fig.add_axes([0, 0, 1, 1])
limit = np.abs(anomaly).max()
colors = plt.get_cmap("RdBu_r")(Normalize(-limit, limit)(anomaly))
ax.bar(years, 1, width=1.0, color=colors)
ax.set_xlim(years[0] - 0.5, years[-1] + 0.5)
ax.set_axis_off()

fig.savefig("fargo_winter_stripes.png", dpi=300)
fig.savefig("fargo_winter_stripes.pdf")      # vector copy for the print shop
print(f"{len(years)} winters drawn, {years[0]}–{years[-1]}")
`;

const CODE_COLD_DAYS = `# Days at or below 0°F per winter, with a 30-year normal
# Recipe by @jkowalczyk · CC BY 4.0
import csv
from datetime import date
from collections import defaultdict
import numpy as np
import matplotlib.pyplot as plt

CSV_PATH = "fargo_daily_1899_2025.csv"
DATE_COL, TMIN_COL = "date", "tmin_f"
THRESHOLD_F = 0          # Fargo might prefer -20
SEASON = (11, 12, 1, 2, 3)

cold_days = defaultdict(int)
counted = defaultdict(int)
with open(CSV_PATH, newline="") as f:
    for row in csv.DictReader(f):
        d = date.fromisoformat(row[DATE_COL])
        if d.month not in SEASON:
            continue
        season = d.year + 1 if d.month >= 11 else d.year
        if row[TMIN_COL] == "":
            continue
        counted[season] += 1
        if float(row[TMIN_COL]) <= THRESHOLD_F:
            cold_days[season] += 1

seasons = [s for s in sorted(counted) if counted[s] >= 135]   # ~90% of 151 days
counts = np.array([cold_days[s] for s in seasons])
normal = counts[[s in range(1991, 2021) for s in seasons]].mean()

fig, ax = plt.subplots(figsize=(16, 7))
ax.bar(seasons, counts, width=0.8, color="#4f7cac")
ax.axhline(normal, color="#b4441f", lw=2)
ax.text(seasons[0], normal + 1, f"1991–2020 normal: {normal:.0f} days",
        color="#b4441f", fontsize=13)
ax.set_title("Nights at or below 0°F each winter, Fargo", fontsize=20, loc="left")
ax.spines[["top", "right"]].set_visible(False)
fig.savefig("fargo_cold_nights.png", dpi=300, bbox_inches="tight")
`;

const CODE_SNOW_DAYS = `# Snow on the ground: days with at least 1 inch of snow depth, per winter
# Recipe by @plainsdata · CC BY-SA 4.0
import csv
from datetime import date
from collections import defaultdict
import numpy as np
import matplotlib.pyplot as plt

CSV_PATH = "fargo_daily_1899_2025.csv"
DATE_COL, SNWD_COL = "date", "snwd_in"
MIN_DEPTH_IN = 1.0

snow_days = defaultdict(int)
reported = defaultdict(int)
with open(CSV_PATH, newline="") as f:
    for row in csv.DictReader(f):
        d = date.fromisoformat(row[DATE_COL])
        # A snow season runs July 1 – June 30, labelled by its spring year.
        season = d.year + 1 if d.month >= 7 else d.year
        if row[SNWD_COL] == "":
            continue                     # snow depth is the most often blank column
        reported[season] += 1
        if float(row[SNWD_COL]) >= MIN_DEPTH_IN:
            snow_days[season] += 1

# Snow depth was not recorded every day in early years; drop thin seasons.
seasons = [s for s in sorted(reported) if reported[s] >= 300]
days = np.array([snow_days[s] for s in seasons])

fig, (top, bottom) = plt.subplots(2, 1, figsize=(16, 8), height_ratios=[1, 4],
                                  sharex=True)
top.bar(seasons, 1, width=1, color=plt.cm.Blues(days / days.max()))
top.set_axis_off()
bottom.bar(seasons, days, width=0.8, color="#7aa6c2")
bottom.set_ylabel("days with ≥1 in. snow on the ground")
bottom.spines[["top", "right"]].set_visible(False)
fig.savefig("fargo_snow_days.png", dpi=300, bbox_inches="tight")
`;

const CODE_COLDEST = `# Coldest night of each winter, as dots with a 20-year rolling mean
# Recipe by @sundog_charts · CC0
import csv
from datetime import date
import numpy as np
import matplotlib.pyplot as plt

CSV_PATH = "fargo_daily_1899_2025.csv"
DATE_COL, TMIN_COL = "date", "tmin_f"

coldest = {}
with open(CSV_PATH, newline="") as f:
    for row in csv.DictReader(f):
        if row[TMIN_COL] == "":
            continue
        d = date.fromisoformat(row[DATE_COL])
        winter = d.year + 1 if d.month >= 7 else d.year
        t = float(row[TMIN_COL])
        coldest[winter] = min(t, coldest.get(winter, 999))

years = np.array(sorted(coldest))[1:-1]        # drop the two partial winters
lows = np.array([coldest[y] for y in years])
window = 20
rolling = np.convolve(lows, np.ones(window) / window, mode="valid")

fig, ax = plt.subplots(figsize=(16, 8))
ax.scatter(years, lows, s=36, color="#2166ac", alpha=0.75)
ax.plot(years[window - 1:], rolling, color="#b2182b", lw=3,
        label=f"{window}-winter average")
ax.set_ylabel("°F")
ax.set_title("The coldest night of every winter, Fargo", fontsize=20, loc="left")
ax.legend(frameon=False, fontsize=13)
ax.spines[["top", "right"]].set_visible(False)
fig.savefig("fargo_coldest_nights.png", dpi=300, bbox_inches="tight")
`;

const CODE_POLAR = `# Day-of-year polar plot: each decade's average daily high as a ring
# Recipe by @akiko.n · CC BY 4.0
import csv
import math
from datetime import date
from collections import defaultdict
import numpy as np
import matplotlib.pyplot as plt

CSV_PATH = "fargo_daily_1899_2025.csv"
DATE_COL, TEMP_COL = "date", "tmax_f"

sums = defaultdict(lambda: np.zeros(366))
counts = defaultdict(lambda: np.zeros(366))
with open(CSV_PATH, newline="") as f:
    for row in csv.DictReader(f):
        if row[TEMP_COL] == "":
            continue
        d = date.fromisoformat(row[DATE_COL])
        decade = d.year // 10 * 10
        doy = d.timetuple().tm_yday - 1
        sums[decade][doy] += float(row[TEMP_COL])
        counts[decade][doy] += 1

theta = np.linspace(0, 2 * math.pi, 366, endpoint=False)
fig = plt.figure(figsize=(12, 12))
ax = fig.add_subplot(projection="polar")
ax.set_theta_zero_location("N")
ax.set_theta_direction(-1)
decades = sorted(sums)
cmap = plt.get_cmap("RdBu_r")
for i, dec in enumerate(decades):
    with np.errstate(invalid="ignore"):
        mean = sums[dec] / counts[dec]
    # 15-day smoothing so the rings are readable
    smooth = np.convolve(np.r_[mean[-7:], mean, mean[:7]], np.ones(15) / 15, "valid")
    ax.plot(theta, smooth, color=cmap(i / (len(decades) - 1)), lw=1.6, label=f"{dec}s")
ax.set_xticks(np.linspace(0, 2 * math.pi, 12, endpoint=False))
ax.set_xticklabels(["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])
fig.savefig("fargo_polar_decades.png", dpi=300, bbox_inches="tight")
`;

const CODE_HEATMAP = `# Every day since 1900: year x day-of-year heatmap
# Recipe by @mpls_maps · CC BY 4.0
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("fargo_daily_1899_2025.csv", parse_dates=["date"])
df["tmean"] = (df["tmax_f"] + df["tmin_f"]) / 2
df["doy"] = df["date"].dt.dayofyear
df["year"] = df["date"].dt.year
grid = df.pivot_table(index="year", columns="doy", values="tmean")
grid = grid - grid.mean()                 # anomaly vs. the day's long-term mean

fig, ax = plt.subplots(figsize=(18, 12))
im = ax.imshow(grid, aspect="auto", cmap="RdBu_r", vmin=-30, vmax=30,
               extent=[1, 366, grid.index.max(), grid.index.min()])
fig.colorbar(im, ax=ax, label="°F warmer / colder than usual")
fig.savefig("heatmap.png", dpi=300)
`;

const CODE_RIBBON = `# Daily temperature ribbon with record highs and lows
# Recipe by @tdot_weather · CC BY 4.0
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("fargo_daily_1899_2025.csv", parse_dates=["date"])
df["doy"] = df["date"].dt.dayofyear
normals = df[df.date.dt.year.between(1991, 2020)].groupby("doy")[["tmax_f", "tmin_f"]].mean()
records = df.groupby("doy").agg(rec_hi=("tmax_f", "max"), rec_lo=("tmin_f", "min"))
year = df[df.date.dt.year == 2024].set_index("doy")

fig, ax = plt.subplots(figsize=(18, 8))
ax.fill_between(records.index, records.rec_lo, records.rec_hi, color="#e8e2d6")
ax.fill_between(normals.index, normals.tmin_f, normals.tmax_f, color="#c9bfa9")
ax.vlines(year.index, year.tmin_f, year.tmax_f, color="#5b2a3c", lw=1.4)
# ...steps 5–8 add record markers and annotations
`;

const CODE_RIDGE = `# Winter lows by decade as a ridgeline (joyplot)
# Recipe by @prairieplots · CC BY 4.0
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import gaussian_kde

df = pd.read_csv("fargo_daily_1899_2025.csv", parse_dates=["date"])
winter = df[df.date.dt.month.isin([12, 1, 2])].copy()
winter["decade"] = (winter.date.dt.year // 10) * 10
xs = np.linspace(-45, 45, 300)

fig, ax = plt.subplots(figsize=(10, 14))
for i, (dec, grp) in enumerate(sorted(winter.groupby("decade"), reverse=True)):
    kde = gaussian_kde(grp.tmin_f.dropna())(xs)
    ax.fill_between(xs, i, i + kde * 40, color=plt.cm.RdBu_r(dec / 2030 - 0.95))
`;

const CODE_SPIRAL = `# Animated climate spiral of monthly anomalies
# Recipe by @gridsquare · CC BY 4.0
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, FFMpegWriter

monthly = (pd.read_csv("fargo_daily_1899_2025.csv", parse_dates=["date"])
             .set_index("date")[["tmax_f", "tmin_f"]].mean(axis=1)
             .resample("MS").mean())
anom = monthly - monthly.groupby(monthly.index.month).transform("mean")

fig = plt.figure(figsize=(8, 8), facecolor="black")
ax = fig.add_subplot(projection="polar")
# ...12 more steps: frame function, colour by year, year label, easing,
# saving with FFMpegWriter(fps=30, bitrate=4000)
`;

const CODE_SMALL_MULT = `# One winter per panel, a dozen decades side by side
# Recipe by @lmcnally · CC BY 4.0
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("fargo_daily_1899_2025.csv", parse_dates=["date"])
df["season"] = df.date.dt.year + (df.date.dt.month >= 7)
picks = [1905, 1915, 1925, 1936, 1945, 1955, 1965, 1975, 1985, 1997, 2014, 2024]

fig, axes = plt.subplots(3, 4, figsize=(18, 11), sharey=True)
for ax, season in zip(axes.flat, picks):
    s = df[(df.season == season) & df.date.dt.month.isin([11, 12, 1, 2, 3])]
    ax.fill_between(range(len(s)), s.tmin_f, s.tmax_f, color="#5d86b3")
    ax.set_title(f"{season - 1}–{str(season)[2:]}")
`;

const CODE_FREEZE = `# First and last freeze dates per year, as floating bars
# Recipe by @ozarkplots · CC BY 4.0
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("fargo_daily_1899_2025.csv", parse_dates=["date"])
frost = df[df.tmin_f <= 32]
spring = frost[frost.date.dt.month < 7].groupby(frost.date.dt.year).date.max()
fall = frost[frost.date.dt.month >= 7].groupby(frost.date.dt.year).date.min()
growing = (fall - spring).dt.days

fig, ax = plt.subplots(figsize=(16, 9))
ax.vlines(spring.index, spring.dt.dayofyear, fall.dt.dayofyear, color="#6a9a5b", lw=3)
`;

const R_CODE = (body: string) => `library(tidyverse)
${body}`;

const CODE_R_SNOWCAL = R_CODE(`snow <- read_csv("marquette_daily.csv") |>
  mutate(year = year(DATE), doy = yday(DATE))

ggplot(snow, aes(doy, year, fill = SNWD)) +
  geom_tile() +
  scale_fill_distiller(palette = "Blues", direction = 1, na.value = "grey90") +
  scale_y_reverse() +
  theme_minimal(base_size = 14)`);

const CODE_R_ANOM = R_CODE(`winters <- read_csv("chicago_daily.csv") |>
  filter(month(DATE) %in% c(12, 1, 2)) |>
  mutate(winter = year(DATE) + (month(DATE) == 12)) |>
  group_by(winter) |>
  summarise(tavg = mean((TMAX + TMIN) / 2, na.rm = TRUE)) |>
  mutate(anom = tavg - mean(tavg))

ggplot(winters, aes(winter, anom, fill = anom > 0)) +
  geom_col() +
  scale_fill_manual(values = c("#2166ac", "#b2182b"), guide = "none")`);

const CODE_R_RIDGES = R_CODE(`library(ggridges)
jan <- read_csv("madison_daily.csv") |>
  filter(month(DATE) == 1) |>
  mutate(decade = factor(year(DATE) %/% 10 * 10))

ggplot(jan, aes(TMIN, decade, fill = after_stat(x))) +
  geom_density_ridges_gradient(scale = 2.5) +
  scale_fill_distiller(palette = "RdBu")`);

const CODE_R_CYCLE = R_CODE(`df <- read_csv("omaha_daily.csv") |>
  mutate(period = cut(year(DATE), c(1899, 1930, 1960, 1990, 2025)),
         doy = yday(DATE))

df |> group_by(period, doy) |>
  summarise(lo = quantile(TMAX, .1, na.rm = TRUE),
            hi = quantile(TMAX, .9, na.rm = TRUE)) |>
  ggplot(aes(doy, ymin = lo, ymax = hi, fill = period)) +
  geom_ribbon(alpha = .45)`);

const CODE_R_BOX = R_CODE(`read_csv("sioux_falls_daily.csv") |>
  filter(month(DATE) %in% c(12, 1, 2)) |>
  mutate(decade = factor(year(DATE) %/% 10 * 10)) |>
  ggplot(aes(decade, TMIN)) +
  geom_boxplot(fill = "#cfe0ee", outlier.size = .6) +
  labs(y = "Daily low (°F)", x = NULL)`);

const CODE_R_FAN = R_CODE(`pct <- read_csv("winnipeg_daily.csv") |>
  mutate(doy = yday(DATE)) |>
  group_by(doy) |>
  summarise(across(TMAX, list(p05 = ~quantile(.x, .05, na.rm = TRUE),
                              p25 = ~quantile(.x, .25, na.rm = TRUE),
                              p75 = ~quantile(.x, .75, na.rm = TRUE),
                              p95 = ~quantile(.x, .95, na.rm = TRUE))))
# ...fan layers, then overlay a single year as a line`);

const CODE_PLOT_STRIPES = `// Warming stripes with a season picker — Observable Plot
season = view(Inputs.select(["Winter (DJF)", "Spring", "Summer", "Fall"]))

Plot.plot({
  width: 1200, height: 300, axis: null,
  color: {scheme: "RdBu", reverse: true, type: "diverging"},
  marks: [
    Plot.barX(seasonal(data, season), {x: "year", interval: 1, fill: "anomaly"})
  ]
})`;

const CODE_PLOT_SPIRAL = `// Static climate spiral — Observable Plot
Plot.plot({
  projection: {type: "azimuthal-equidistant", rotate: [0, -90]},
  marks: [
    Plot.line(monthly, {
      x: d => d.month * 30, y: d => 90 - (d.anomaly + 3) * 12,
      z: "year", stroke: "year", curve: "catmull-rom"
    })
  ]
})`;

const CODE_PLOT_FREEZE = `// Freeze-free season length — Observable Plot
Plot.plot({
  y: {label: "Days between last spring and first fall freeze"},
  marks: [
    Plot.dot(seasons, {x: "year", y: "length", fill: "#6a9a5b"}),
    Plot.lineY(seasons, Plot.windowY(15, {x: "year", y: "length", stroke: "#2d5a27"}))
  ]
})`;

const CODE_VEGA_HEAT = `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"url": "boise_daily.csv"},
  "transform": [
    {"timeUnit": "dayofyear", "field": "DATE", "as": "doy"},
    {"timeUnit": "year", "field": "DATE", "as": "year"}
  ],
  "mark": "rect",
  "encoding": {
    "x": {"field": "doy", "timeUnit": "dayofyear", "type": "ordinal"},
    "y": {"field": "year", "timeUnit": "year", "type": "ordinal"},
    "color": {"field": "TMIN", "type": "quantitative", "scale": {"scheme": "blues", "reverse": true}}
  }
}`;

const CODE_VEGA_BEE = `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"url": "winter_means.csv"},
  "mark": {"type": "circle", "size": 70},
  "encoding": {
    "x": {"field": "tavg", "type": "quantitative", "title": "Winter mean (°F)"},
    "yOffset": {"field": "jitter", "type": "quantitative"},
    "color": {"field": "year", "type": "quantitative", "scale": {"scheme": "redblue", "reverse": true}}
  }
}`;

const CODE_VEGA_SNOW = `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"url": "snow_seasons.csv"},
  "mark": "bar",
  "encoding": {
    "y": {"field": "season", "type": "ordinal"},
    "x": {"field": "first_cover", "type": "temporal", "timeUnit": "monthdate"},
    "x2": {"field": "last_cover"}
  }
}`;

const CODE_D3 = (comment: string) => `// ${comment} — D3 v7
const data = await d3.csv("daily.csv", d3.autoType);
const x = d3.scaleUtc(d3.extent(data, d => d.DATE), [margin.left, width - margin.right]);
const y = d3.scaleLinear([-40, 110], [height - margin.bottom, margin.top]);

const svg = d3.create("svg").attr("viewBox", [0, 0, width, height]);
svg.append("g").call(d3.axisBottom(x));
// ...brush, tooltip and transition code in steps 4–9
document.body.append(svg.node());`;

/* ------------------------------------------------------------- recipes */

const STD_MISSING_PY =
  'Skips blank cells; each winter needs at least 90% of its days to be drawn, so gaps show as missing stripes rather than fake values.';

export const RECIPES: Recipe[] = [
  /* ===================== matplotlib (11 matches) ===================== */
  {
    id: 'winter-stripes-ithaca',
    title: 'Winter-only warming stripes from a daily station record, Ithaca 1893–2022',
    author: 'e.hollister',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'numpy'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 1,
    remakes: 412,
    license: 'CC BY 4.0',
    updated: '2025-12-03',
    thumb: 'winterStripes',
    summary:
      'Averages each December–February from daily highs and lows, then draws one colored stripe per winter. Uses only the csv module, numpy and matplotlib.',
    sample: { name: 'ithaca_daily_1893_2022.csv', rows: '47,100 rows', span: '1893–2022' },
    steps: [
      { title: 'Read the CSV with the csv module (no pandas)', mins: 10 },
      { title: 'Group days into winters — December belongs to the next year', mins: 10 },
      { title: 'Drop winters with too many missing days', mins: 5 },
      { title: 'Turn averages into anomalies and colors', mins: 10 },
      { title: 'Draw the stripes and export at poster size', mins: 10 },
    ],
    missing: STD_MISSING_PY,
    poster: 'Saves 300 dpi PNG and vector PDF; figure size set for an 18 × 6 in strip.',
    code: CODE_WINTER_STRIPES,
    collections: ['stripes-spirals'],
    keywords: 'warming stripes winter only december january february season anomaly color bar poster climate change many years one picture',
    remakeExamples: ['Winter stripes, Duluth 1871–2024', 'Grand Forks winters, 1893–2023', 'Bozeman winters with labels'],
    match: {
      base: 97,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMAX', yours: 'tmax_f', ok: true, note: 'Units don’t matter — stripes use differences' },
        { expects: 'TMIN', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Built for exactly your shape: daily highs/lows over 100+ years, reduced to one value per winter.',
    },
  },
  {
    id: 'cold-nights-duluth',
    title: 'Nights at or below 0°F per winter, with a 30-year normal, Duluth 1895–2023',
    author: 'jkowalczyk',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'numpy'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 1,
    remakes: 297,
    license: 'CC BY 4.0',
    updated: '2025-02-11',
    thumb: 'coldBars',
    summary:
      'Counts the nights each November–March that hit your threshold and draws a bar per winter against the 1991–2020 normal. Easy to read from across a room.',
    sample: { name: 'duluth_daily_1895_2023.csv', rows: '46,700 rows', span: '1895–2023' },
    steps: [
      { title: 'Pick a threshold and season months', mins: 5 },
      { title: 'Count qualifying nights per winter', mins: 10 },
      { title: 'Compute the 30-year normal', mins: 5 },
      { title: 'Bars, normal line and label', mins: 15 },
    ],
    missing: 'Blank lows are skipped; winters with under 90% of nights reported are left out of the chart.',
    poster: 'Saves 300 dpi PNG. Font sizes set for viewing at 6–10 feet.',
    code: CODE_COLD_DAYS,
    collections: ['stripes-spirals'],
    keywords: 'cold nights below zero count per winter bar chart normal threshold frigid days winter change',
    remakeExamples: ['Nights below −20°F, International Falls', 'Below-freezing days, Spokane'],
    match: {
      base: 90,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMIN (°F)', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Needs only date and daily low; written for a Northern Plains-type winter.',
    },
  },
  {
    id: 'snow-days-madison',
    title: 'Snow on the ground: days with ≥1 in. depth per winter, Madison 1905–2024',
    author: 'plainsdata',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'numpy'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 138,
    license: 'CC BY-SA 4.0',
    updated: '2024-11-20',
    thumb: 'snowBars',
    summary:
      'A blue stripe band on top and bars underneath: how many days each snow season had at least an inch on the ground.',
    sample: { name: 'madison_snwd_1905_2024.csv', rows: '43,500 rows', span: '1905–2024' },
    steps: [
      { title: 'Define a July–June snow season', mins: 5 },
      { title: 'Count snow-cover days, skipping blanks', mins: 10 },
      { title: 'Drop seasons with thin reporting', mins: 10 },
      { title: 'Stack a stripe band over a bar chart', mins: 20 },
    ],
    missing:
      'Snow depth is often unreported in early decades. Seasons with fewer than 300 reported days are dropped — check how many of your early seasons survive.',
    poster: 'Saves 300 dpi PNG; two-panel layout fits a 16 × 8 in poster.',
    code: CODE_SNOW_DAYS,
    collections: [],
    keywords: 'snow depth cover days on the ground per winter season bars stripes',
    remakeExamples: ['Snow-cover days, Marquette', 'Days with snow on the ground, Burlington VT'],
    match: {
      base: 82,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'SNWD (in)', yours: 'snwd_in', ok: true, note: 'Your most-missing column (5.4%)' },
      ],
      winter: 'built-in',
      why: 'Uses your snow depth column, which most temperature recipes ignore.',
      watch: 'snwd_in is 5.4% blank — the recipe drops thin seasons, so early winters may disappear.',
    },
  },
  {
    id: 'coldest-night-desmoines',
    title: 'The coldest night of every winter, dot plot with a 20-year average, Des Moines',
    author: 'sundog_charts',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'numpy'],
    shapes: ['daily time series', 'multi-decade'],
    difficulty: 1,
    remakes: 221,
    license: 'CC0',
    updated: '2025-06-30',
    thumb: 'dots',
    summary:
      'One dot per winter for its single coldest low, plus a rolling average line. Simple, honest, and shows extremes rather than averages.',
    sample: { name: 'desmoines_tmin_1878_2023.csv', rows: '53,000 rows', span: '1878–2023' },
    steps: [
      { title: 'Find each winter’s minimum low', mins: 10 },
      { title: 'Rolling average with numpy only', mins: 10 },
      { title: 'Scatter, line and labels', mins: 10 },
    ],
    missing: 'Blank lows are skipped. A winter missing its coldest week will look milder than it was — the walkthrough shows how to flag those.',
    poster: 'Saves 300 dpi PNG.',
    code: CODE_COLDEST,
    collections: [],
    keywords: 'coldest night annual minimum extreme low dot plot scatter rolling mean trend winter',
    remakeExamples: ['Coldest night per winter, Fargo-Moorhead (2023)', 'Lowest temperature each year, Calgary'],
    match: {
      base: 84,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMIN', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Works directly from daily lows; one value per winter.',
    },
  },
  {
    id: 'polar-decades',
    title: 'Day-of-year polar rings: each decade’s average daily high, Sapporo 1890–2020',
    author: 'akiko.n',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'numpy'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 176,
    license: 'CC BY 4.0',
    updated: '2025-09-14',
    thumb: 'polar',
    summary:
      'Wraps the year into a circle and draws one ring per decade, colored cold-to-warm. Winter sits at the top, so a shrinking cold season is visible at a glance.',
    sample: { name: 'sapporo_daily_1890_2020.csv', rows: '47,800 rows', span: '1890–2020' },
    steps: [
      { title: 'Average every calendar day within each decade', mins: 15 },
      { title: 'Smooth with a 15-day window (numpy)', mins: 10 },
      { title: 'Set up a polar axis with January at the top', mins: 15 },
      { title: 'Draw rings and a decade color key', mins: 20 },
      { title: 'Rotate so winter is centered (optional)', mins: 10 },
    ],
    missing: 'Each decade-day averages ~10 values, so 1–2% blanks barely matter. Leap days are averaged over fewer years.',
    poster: 'Square 12 × 12 in, 300 dpi.',
    code: CODE_POLAR,
    collections: ['seasonal-decades'],
    keywords: 'polar circular day of year rings decades seasonal cycle radial',
    remakeExamples: ['Polar rings, Helsinki', 'Decade rings for daily lows, Anchorage'],
    match: {
      base: 76,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TEMP', yours: 'tmax_f', ok: true, note: 'or tmin_f' },
      ],
      winter: 'one setting',
      why: 'Shows the whole year by decade; winter can be centered with one rotation setting.',
    },
  },
  {
    id: 'heatmap-minneapolis',
    title: 'Every day since 1900: year × day-of-year temperature heatmap, Minneapolis',
    author: 'mpls_maps',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 688,
    license: 'CC BY 4.0',
    updated: '2026-03-02',
    thumb: 'heatmap',
    summary:
      'Every single day as a colored cell: years down the side, January to December across. The most direct answer to “many years of daily temperature in one picture.”',
    sample: { name: 'msp_daily_1900_2023.csv', rows: '45,300 rows', span: '1900–2023' },
    steps: [
      { title: 'Load with pandas and compute daily means', mins: 10 },
      { title: 'Pivot to a year × day grid', mins: 10 },
      { title: 'Convert to anomalies', mins: 5 },
      { title: 'imshow, color bar and month ticks', mins: 20 },
    ],
    missing: 'Blank days show as empty (white) cells in the grid.',
    poster: '18 × 12 in, 300 dpi.',
    code: CODE_HEATMAP,
    collections: ['seasonal-decades'],
    keywords: 'heatmap every day grid year day of year many years daily temperature one picture calendar',
    remakeExamples: ['Every day since 1872, Toronto', 'Daily highs grid, Bismarck'],
    match: {
      base: 92,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tmax_f', yours: 'tmax_f', ok: true },
        { expects: 'tmin_f', yours: 'tmin_f', ok: true },
      ],
      winter: 'one setting',
      why: 'Same column names as yours. Crop to Dec–Feb with one line to show winters only.',
    },
  },
  {
    id: 'ribbon-toronto',
    title: 'Daily temperature ribbon, 1950–2020, Toronto',
    author: 'tdot_weather',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 1140,
    license: 'CC BY 4.0',
    updated: '2025-10-18',
    thumb: 'ribbon',
    summary:
      'The classic newspaper weather chart: record range, normal range, and one year’s daily highs and lows on top, with record days marked.',
    sample: { name: 'toronto_daily_1950_2020.csv', rows: '25,900 rows', span: '1950–2020' },
    steps: [
      { title: 'Load and add day-of-year', mins: 10 },
      { title: 'Compute normals and records', mins: 15 },
      { title: 'Layer the bands', mins: 15 },
      { title: 'Highlight one year', mins: 10 },
      { title: 'Mark record-breaking days', mins: 20 },
      { title: 'Annotate and style', mins: 30 },
    ],
    missing: 'pandas skips blanks in means and records automatically.',
    poster: '18 × 8 in, 300 dpi.',
    code: CODE_RIBBON,
    collections: ['seasonal-decades'],
    keywords: 'daily temperature ribbon record high low normal range one year tufte weather chart',
    remakeExamples: ['Fargo 2024 in context', 'Ottawa daily ribbon 2023'],
    match: {
      base: 70,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tmax', yours: 'tmax_f', ok: true },
        { expects: 'tmin', yours: 'tmin_f', ok: true },
      ],
      winter: 'needs rework',
      why: 'Uses your full record for context, but the star of the chart is a single year.',
      watch: 'Shows one year against history — not how winters changed over time.',
    },
  },
  {
    id: 'ridgeline-bismarck',
    title: 'Winter lows by decade as a ridgeline, Bismarck 1900–2020',
    author: 'prairieplots',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas', 'SciPy'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 203,
    license: 'CC BY 4.0',
    updated: '2024-08-05',
    thumb: 'ridgeline',
    summary:
      'Stacked curves, one per decade, showing how the spread of winter nights has slid warmer. Striking, but leans on SciPy for the smooth curves.',
    sample: { name: 'bismarck_daily_1900_2020.csv', rows: '44,200 rows', span: '1900–2020' },
    steps: [
      { title: 'Filter to Dec–Feb and label decades', mins: 10 },
      { title: 'Estimate densities with SciPy', mins: 20 },
      { title: 'Stack and overlap the curves', mins: 25 },
      { title: 'Color by decade, tidy labels', mins: 20 },
    ],
    missing: 'Blank lows are dropped before the density is estimated.',
    poster: '10 × 14 in portrait, 300 dpi.',
    code: CODE_RIDGE,
    collections: [],
    keywords: 'ridgeline joyplot distribution winter lows decades density',
    remakeExamples: ['January lows by decade, Winnipeg'],
    match: {
      base: 86,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tmin_f', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Winter-only by design, and the sample is from the same climate as Fargo.',
    },
  },
  {
    id: 'spiral-animated',
    title: 'Animated climate spiral of monthly anomalies, 1880–2023',
    author: 'gridsquare',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas', 'ffmpeg'],
    shapes: ['multi-decade', 'seasonal'],
    difficulty: 4,
    remakes: 534,
    license: 'CC BY 4.0',
    updated: '2024-01-22',
    thumb: 'spiral',
    summary:
      'The famous spiral, month by month, spinning outward as it warms. Produces a video — a poster needs the final frame only.',
    sample: { name: 'gistemp_monthly_1880_2023.csv', rows: '1,728 rows', span: '1880–2023' },
    steps: [
      { title: 'Resample daily data to monthly', mins: 15 },
      { title: 'Monthly anomalies', mins: 15 },
      { title: 'Polar axes and styling', mins: 25 },
      { title: 'Frame function and easing', mins: 45 },
      { title: 'Install and configure ffmpeg', mins: 30 },
      { title: 'Render and export', mins: 20 },
    ],
    missing: 'Monthly means hide most gaps; months under 20 reported days are dropped.',
    poster: 'Outputs MP4; final frame can be saved as PNG.',
    code: CODE_SPIRAL,
    collections: ['stripes-spirals'],
    keywords: 'climate spiral animated monthly anomaly video polar ed hawkins',
    remakeExamples: ['Spiral for Iceland stations', 'Spiral, Central England'],
    match: {
      base: 58,
      uses: [
        { expects: 'monthly anomaly', yours: 'tmax_f + tmin_f', ok: false, note: 'You’d first average days into months' },
      ],
      winter: 'needs rework',
      why: 'Built for monthly data; your daily file needs reshaping first.',
      watch: 'Makes a video, and needs ffmpeg, which you can’t install.',
    },
  },
  {
    id: 'small-multiples-winters',
    title: 'Twelve winters, one per panel: daily highs and lows a decade apart, Fargo-Moorhead',
    author: 'lmcnally',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 64,
    license: 'CC BY 4.0',
    updated: '2023-12-09',
    thumb: 'smallMultiples',
    summary:
      'A grid of a dozen chosen winters, each showing every day’s range from November to March. Good for storytelling about specific years (1936, 1997, 2014).',
    sample: { name: 'fargo_moorhead_daily_1900_2023.csv', rows: '45,000 rows', span: '1900–2023' },
    steps: [
      { title: 'Choose the winters to show', mins: 10 },
      { title: 'Season labels with pandas', mins: 10 },
      { title: 'Panel grid with shared axes', mins: 20 },
      { title: 'Titles, notes and export', mins: 15 },
    ],
    missing: 'Blanks appear as small gaps in each band.',
    poster: '18 × 11 in, 300 dpi.',
    code: CODE_SMALL_MULT,
    collections: [],
    keywords: 'small multiples panels grid winters decade daily range fargo moorhead',
    remakeExamples: ['Grand Forks winters, 1916–2016'],
    match: {
      base: 80,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tmax_f', yours: 'tmax_f', ok: true },
        { expects: 'tmin_f', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Same station area and same column names as your file.',
    },
  },
  {
    id: 'freeze-dates',
    title: 'Last spring and first fall freeze, as floating bars, Springfield MO 1900–2020',
    author: 'ozarkplots',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 118,
    license: 'MIT',
    updated: '2025-04-27',
    thumb: 'freezeRange',
    summary:
      'Each year is a vertical bar from the last spring freeze to the first fall freeze, so the frost-free season visibly stretches over time.',
    sample: { name: 'sgf_daily_1900_2020.csv', rows: '44,000 rows', span: '1900–2020' },
    steps: [
      { title: 'Find freeze days (low ≤ 32°F)', mins: 10 },
      { title: 'Last in spring, first in fall', mins: 15 },
      { title: 'Floating bars by year', mins: 15 },
    ],
    missing: 'A blank day near a freeze date can shift it; the walkthrough flags years with gaps in April/May and Sept/Oct.',
    poster: '16 × 9 in, 300 dpi.',
    code: CODE_FREEZE,
    collections: ['seasonal-decades'],
    keywords: 'frost freeze dates growing season length first last floating bars',
    match: {
      base: 66,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tmin_f', yours: 'tmin_f', ok: true },
      ],
      winter: 'needs rework',
      why: 'Uses daily lows, but shows the warm season’s length rather than winter itself.',
    },
  },

  /* ===================== other tools (15 matches) ===================== */
  {
    id: 'stripes-season-picker',
    title: 'Warming stripes for any season, with a season picker',
    author: 'ren_okafor',
    tool: 'Observable Plot',
    requires: ['Observable notebook (in browser)', 'JavaScript'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 530,
    license: 'ISC',
    updated: '2026-06-15',
    thumb: 'stripes',
    summary: 'Upload a daily CSV in the notebook and flip between winter, spring, summer and fall stripes.',
    sample: { name: 'boulder_daily_1897_2024.csv', rows: '46,000 rows', span: '1897–2024' },
    steps: [
      { title: 'Fork the notebook', mins: 5 },
      { title: 'Attach your CSV', mins: 5 },
      { title: 'Map column names', mins: 10 },
      { title: 'Export SVG', mins: 10 },
    ],
    missing: 'Seasons under 85% complete are greyed.',
    poster: 'SVG export; scales to any size.',
    code: CODE_PLOT_STRIPES,
    collections: ['stripes-spirals'],
    keywords: 'warming stripes season picker winter only interactive',
    match: {
      base: 94,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tavg or tmax+tmin', yours: 'tmax_f + tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Winter stripes from daily data — but written in JavaScript, not Python.',
    },
  },
  {
    id: 'snow-calendar-marquette',
    title: 'Calendar heatmap of 120 years of snow depth, Marquette 1900–2020',
    author: 'dee_r',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2', 'tidyverse'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 344,
    license: 'CC BY 4.0',
    updated: '2025-01-08',
    thumb: 'snowCalendar',
    summary: 'Every day’s snow depth as a blue tile; the white gaps show the snow season shrinking.',
    sample: { name: 'marquette_daily.csv', rows: '43,800 rows', span: '1900–2020' },
    steps: [
      { title: 'Read and add day-of-year', mins: 10 },
      { title: 'geom_tile grid', mins: 15 },
      { title: 'Color scale and theme', mins: 15 },
    ],
    missing: 'Blank days are grey tiles.',
    poster: 'ggsave at 300 dpi.',
    code: CODE_R_SNOWCAL,
    collections: ['seasonal-decades'],
    keywords: 'snow depth calendar heatmap every day tiles snow season',
    match: {
      base: 85,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'SNWD', yours: 'snwd_in', ok: true },
      ],
      winter: 'built-in',
      why: 'A striking snow picture from the same kind of daily file.',
    },
  },
  {
    id: 'winter-anomaly-chicago',
    title: 'Winter temperature anomaly bars, Chicago 1895–2024',
    author: 'chartgarden',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2', 'tidyverse'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 1,
    remakes: 610,
    license: 'CC BY 4.0',
    updated: '2025-12-29',
    thumb: 'anomalyBars',
    summary: 'Red and blue bars above and below the long-term winter average.',
    sample: { name: 'chicago_daily.csv', rows: '47,000 rows', span: '1895–2024' },
    steps: [
      { title: 'Filter winter months', mins: 5 },
      { title: 'Average per winter', mins: 10 },
      { title: 'Bars colored by sign', mins: 10 },
    ],
    missing: 'na.rm = TRUE; winters are not filtered for completeness.',
    poster: 'ggsave at 300 dpi.',
    code: CODE_R_ANOM,
    collections: ['stripes-spirals'],
    keywords: 'winter anomaly bars warmer colder than average red blue',
    match: {
      base: 91,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMAX', yours: 'tmax_f', ok: true },
        { expects: 'TMIN', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Winter-only by design, from daily highs and lows.',
    },
  },
  {
    id: 'record-explorer-d3',
    title: 'Interactive daily-record explorer with brushing, Boston 1872–2024',
    author: 'bjorn_lindqvist',
    tool: 'D3',
    requires: ['JavaScript', 'D3 v7', 'local web server'],
    shapes: ['daily time series', 'multi-decade'],
    difficulty: 4,
    remakes: 158,
    license: 'MIT',
    updated: '2025-07-03',
    thumb: 'line',
    summary: 'A zoomable web page of every day with record markers and tooltips. Not meant for print.',
    sample: { name: 'boston_daily.csv', rows: '55,400 rows', span: '1872–2024' },
    steps: [
      { title: 'Set up a local server', mins: 20 },
      { title: 'Scales and axes', mins: 30 },
      { title: 'Brush and zoom', mins: 45 },
      { title: 'Tooltips', mins: 30 },
    ],
    missing: 'Gaps drawn as breaks in the line.',
    poster: 'Screen only; no print export.',
    code: CODE_D3('Interactive daily-record explorer'),
    collections: [],
    keywords: 'interactive explorer zoom brush records daily web',
    match: {
      base: 55,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMAX', yours: 'tmax_f', ok: true },
      ],
      winter: 'needs rework',
      why: 'Handles your full daily record, but it’s an interactive web page, not a poster.',
    },
  },
  {
    id: 'cycle-ribbons-omaha',
    title: 'Seasonal cycle ribbons by 30-year period, Omaha',
    author: 'marta.vb',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2', 'tidyverse'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 276,
    license: 'CC BY 4.0',
    updated: '2025-05-12',
    thumb: 'fan',
    summary: 'Overlapping 10th–90th percentile ribbons for four eras, across the calendar year.',
    sample: { name: 'omaha_daily.csv', rows: '46,000 rows', span: '1899–2024' },
    steps: [
      { title: 'Cut years into eras', mins: 5 },
      { title: 'Percentiles by day', mins: 15 },
      { title: 'Ribbon layers', mins: 15 },
    ],
    missing: 'na.rm = TRUE in quantiles.',
    poster: 'ggsave at 300 dpi.',
    code: CODE_R_CYCLE,
    collections: ['seasonal-decades'],
    keywords: 'seasonal cycle ribbons eras percentiles year shape',
    match: {
      base: 78,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMAX', yours: 'tmax_f', ok: true },
      ],
      winter: 'one setting',
      why: 'Starts from 1899 like yours; zoom the x-axis to Dec–Feb.',
    },
  },
  {
    id: 'heat-vega-boise',
    title: 'Heatmap of daily lows, years × days, Boise',
    author: 'pdx_rain',
    tool: 'Vega-Lite',
    requires: ['Vega editor (in browser)', 'JSON'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 189,
    license: 'BSD-3',
    updated: '2024-10-01',
    thumb: 'heatmap',
    summary: 'A single JSON spec you paste into the online Vega editor. No install, but your CSV needs to be hosted or pasted in.',
    sample: { name: 'boise_daily.csv', rows: '38,000 rows', span: '1920–2024' },
    steps: [
      { title: 'Open the Vega editor', mins: 2 },
      { title: 'Paste spec, point to data', mins: 15 },
      { title: 'Export PNG/SVG', mins: 5 },
    ],
    missing: 'Blank days left uncolored.',
    poster: 'SVG export.',
    code: CODE_VEGA_HEAT,
    collections: ['seasonal-decades'],
    keywords: 'heatmap daily lows grid vega',
    match: {
      base: 80,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMIN', yours: 'tmin_f', ok: true },
      ],
      winter: 'one setting',
      why: 'Same idea as the Minneapolis heatmap, in a browser editor.',
      watch: 'A 46,000-row file is slow in the online editor.',
    },
  },
  {
    id: 'horizon-d3',
    title: 'Horizon chart of daily anomalies, 1900–2020',
    author: 'bjorn_lindqvist',
    tool: 'D3',
    requires: ['JavaScript', 'D3 v7', 'local web server'],
    shapes: ['daily time series', 'multi-decade'],
    difficulty: 3,
    remakes: 92,
    license: 'MIT',
    updated: '2023-09-18',
    thumb: 'horizon',
    summary: 'Folds a century of daily anomalies into compact bands, one row per decade.',
    sample: { name: 'stockholm_daily.csv', rows: '44,000 rows', span: '1900–2020' },
    steps: [
      { title: 'Anomalies per day', mins: 20 },
      { title: 'Band folding', mins: 40 },
      { title: 'Rows per decade', mins: 20 },
    ],
    missing: 'Gaps drawn as blank.',
    poster: 'SVG via browser print.',
    code: CODE_D3('Horizon chart of daily anomalies'),
    collections: [],
    keywords: 'horizon chart anomalies bands compact',
    match: {
      base: 62,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TAVG', yours: 'tmax_f + tmin_f', ok: true, note: 'average them first' },
      ],
      winter: 'needs rework',
      why: 'Fits a long daily file; horizon charts take some explaining on a poster.',
    },
  },
  {
    id: 'ridges-madison-r',
    title: 'Ridgeline of January lows by decade, Madison',
    author: 'chartgarden',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2', 'ggridges'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 455,
    license: 'CC BY 4.0',
    updated: '2025-11-30',
    thumb: 'ridgeline',
    summary: 'The R version of the ridgeline — fewer lines of code thanks to ggridges.',
    sample: { name: 'madison_daily.csv', rows: '45,000 rows', span: '1900–2024' },
    steps: [
      { title: 'Filter January, label decades', mins: 10 },
      { title: 'geom_density_ridges_gradient', mins: 10 },
      { title: 'Theme and labels', mins: 15 },
    ],
    missing: 'Blank lows dropped.',
    poster: 'ggsave at 300 dpi.',
    code: CODE_R_RIDGES,
    collections: [],
    keywords: 'ridgeline joyplot january lows decades r',
    match: {
      base: 84,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMIN', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Winter month by design.',
    },
  },
  {
    id: 'spiral-static-plot',
    title: 'Static climate spiral from daily data',
    author: 'ren_okafor',
    tool: 'Observable Plot',
    requires: ['Observable notebook (in browser)', 'JavaScript'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 120,
    license: 'ISC',
    updated: '2025-03-19',
    thumb: 'spiral',
    summary: 'A no-animation spiral that resamples daily data to months inside the notebook.',
    sample: { name: 'reykjavik_daily.csv', rows: '41,000 rows', span: '1910–2022' },
    steps: [
      { title: 'Monthly means', mins: 10 },
      { title: 'Polar projection', mins: 20 },
      { title: 'Color by year', mins: 15 },
    ],
    missing: 'Months under 20 days dropped.',
    poster: 'SVG export.',
    code: CODE_PLOT_SPIRAL,
    collections: ['stripes-spirals'],
    keywords: 'climate spiral static polar monthly',
    match: {
      base: 64,
      uses: [{ expects: 'date + temp', yours: 'date, tmax_f, tmin_f', ok: true }],
      winter: 'needs rework',
      why: 'Accepts daily data but shows all months, not winter.',
    },
  },
  {
    id: 'beeswarm-vega',
    title: 'Beeswarm of winter mean temperature, one dot per winter, Sioux Falls',
    author: 'gridsquare',
    tool: 'Vega-Lite',
    requires: ['Vega editor (in browser)', 'JSON'],
    shapes: ['multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 85,
    license: 'BSD-3',
    updated: '2024-12-14',
    thumb: 'beeswarm',
    summary: 'Each winter as a dot along a temperature axis, colored by year — recent winters cluster on the warm side.',
    sample: { name: 'winter_means.csv', rows: '128 rows', span: '1894–2022' },
    steps: [
      { title: 'Pre-compute winter means (any tool)', mins: 20 },
      { title: 'Paste spec', mins: 5 },
      { title: 'Export', mins: 5 },
    ],
    missing: 'Depends on your pre-computed means.',
    poster: 'SVG export.',
    code: CODE_VEGA_BEE,
    collections: [],
    keywords: 'beeswarm dots winter mean distribution year color',
    match: {
      base: 74,
      uses: [{ expects: 'year, tavg', yours: 'date, tmax_f, tmin_f', ok: false, note: 'You’d average winters first' }],
      winter: 'built-in',
      why: 'Winter-focused, but expects one row per winter rather than daily data.',
    },
  },
  {
    id: 'box-decades-r',
    title: 'Boxplots of winter lows per decade, Sioux Falls',
    author: 'dee_r',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2', 'tidyverse'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 1,
    remakes: 233,
    license: 'CC BY 4.0',
    updated: '2024-02-17',
    thumb: 'boxplot',
    summary: 'Twelve boxes, one per decade, of every December–February low.',
    sample: { name: 'sioux_falls_daily.csv', rows: '45,600 rows', span: '1900–2024' },
    steps: [
      { title: 'Filter and label', mins: 5 },
      { title: 'geom_boxplot', mins: 10 },
    ],
    missing: 'Blank lows dropped.',
    poster: 'ggsave at 300 dpi.',
    code: CODE_R_BOX,
    collections: [],
    keywords: 'boxplot winter lows decade distribution',
    match: {
      base: 79,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMIN', yours: 'tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Winter-only, daily lows, nearby climate.',
    },
  },
  {
    id: 'snow-season-vega',
    title: 'Snow-season timeline: first and last snow cover each winter',
    author: 'pdx_rain',
    tool: 'Vega-Lite',
    requires: ['Vega editor (in browser)', 'JSON'],
    shapes: ['multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 71,
    license: 'BSD-3',
    updated: '2023-11-02',
    thumb: 'freezeRange',
    summary: 'Horizontal bars spanning first to last day with snow on the ground.',
    sample: { name: 'snow_seasons.csv', rows: '110 rows', span: '1912–2022' },
    steps: [
      { title: 'Compute first/last cover dates', mins: 25 },
      { title: 'Paste spec', mins: 5 },
    ],
    missing: 'Depends on your pre-computed dates.',
    poster: 'SVG export.',
    code: CODE_VEGA_SNOW,
    collections: [],
    keywords: 'snow season first last snow cover timeline',
    match: {
      base: 68,
      uses: [{ expects: 'season, first_cover, last_cover', yours: 'date, snwd_in', ok: false, note: 'You’d compute these first' }],
      winter: 'built-in',
      why: 'Uses snow depth, but expects pre-summarised seasons.',
    },
  },
  {
    id: 'freeze-free-plot',
    title: 'Freeze-free season length with a 15-year rolling mean',
    author: 'sundog_charts',
    tool: 'Observable Plot',
    requires: ['Observable notebook (in browser)', 'JavaScript'],
    shapes: ['daily time series', 'multi-decade'],
    difficulty: 1,
    remakes: 140,
    license: 'ISC',
    updated: '2025-08-08',
    thumb: 'dots',
    summary: 'Dots for each year’s frost-free days, plus a smooth line.',
    sample: { name: 'lincoln_daily.csv', rows: '45,000 rows', span: '1900–2024' },
    steps: [
      { title: 'Attach CSV', mins: 5 },
      { title: 'Freeze dates', mins: 10 },
      { title: 'Plot', mins: 5 },
    ],
    missing: 'Years with gaps in spring/fall flagged.',
    poster: 'SVG export.',
    code: CODE_PLOT_FREEZE,
    collections: [],
    keywords: 'freeze free growing season length rolling',
    match: {
      base: 60,
      uses: [
        { expects: 'date', yours: 'date', ok: true },
        { expects: 'tmin', yours: 'tmin_f', ok: true },
      ],
      winter: 'needs rework',
      why: 'Daily lows in, but it measures the warm season.',
    },
  },
  {
    id: 'fan-winnipeg',
    title: 'Day-of-year temperature percentiles fan chart, Winnipeg 1872–2024',
    author: 'marta.vb',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2', 'tidyverse'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 301,
    license: 'CC BY 4.0',
    updated: '2026-01-25',
    thumb: 'fan',
    summary: 'Percentile bands for every calendar day with a recent year drawn over the top.',
    sample: { name: 'winnipeg_daily.csv', rows: '55,000 rows', span: '1872–2024' },
    steps: [
      { title: 'Percentiles per day', mins: 15 },
      { title: 'Fan layers', mins: 20 },
      { title: 'Overlay a year', mins: 15 },
      { title: 'Annotations', mins: 25 },
    ],
    missing: 'na.rm = TRUE.',
    poster: 'ggsave at 300 dpi.',
    code: CODE_R_FAN,
    collections: ['seasonal-decades'],
    keywords: 'fan chart percentiles day of year bands',
    match: {
      base: 69,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TMAX', yours: 'tmax_f', ok: true },
      ],
      winter: 'one setting',
      why: 'Prairie climate like Fargo; shows a year against history.',
    },
  },
  {
    id: 'winter-hist-d3',
    title: 'Animated decade-by-decade histogram of winter days',
    author: 'akiko.n',
    tool: 'D3',
    requires: ['JavaScript', 'D3 v7', 'local web server'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 64,
    license: 'MIT',
    updated: '2024-05-30',
    thumb: 'histogram',
    summary: 'A histogram of daily winter means that morphs from decade to decade.',
    sample: { name: 'helsinki_daily.csv', rows: '50,000 rows', span: '1890–2024' },
    steps: [
      { title: 'Bin by decade', mins: 20 },
      { title: 'Transitions', mins: 30 },
      { title: 'Controls', mins: 20 },
    ],
    missing: 'Blank days dropped from bins.',
    poster: 'Screen only.',
    code: CODE_D3('Animated decade histogram'),
    collections: [],
    keywords: 'histogram animated decade distribution winter',
    match: {
      base: 61,
      uses: [
        { expects: 'DATE', yours: 'date', ok: true },
        { expects: 'TAVG', yours: 'tmax_f + tmin_f', ok: true },
      ],
      winter: 'built-in',
      why: 'Winter days by decade, but animated for the web.',
    },
  },

  /* ===================== collection, not a shape match ===================== */
  {
    id: 'stripes-20-lines',
    title: 'Warming stripes in 20 lines of matplotlib',
    author: 'ren_okafor',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'numpy'],
    shapes: ['multi-decade', 'categorical'],
    difficulty: 1,
    remakes: 1204,
    license: 'CC0',
    updated: '2024-06-10',
    thumb: 'stripes',
    summary: 'The original stripes from a yearly global series: one number per year, one color per stripe.',
    sample: { name: 'hadcrut5_annual.csv', rows: '174 rows', span: '1850–2023' },
    steps: [
      { title: 'Read yearly anomalies', mins: 5 },
      { title: 'Color and draw', mins: 10 },
    ],
    missing: 'Assumes no gaps.',
    poster: '300 dpi PNG.',
    code: `import numpy as np\nimport matplotlib.pyplot as plt\n\nyears, anom = np.loadtxt("hadcrut5_annual.csv", delimiter=",", skiprows=1, unpack=True)\nfig = plt.figure(figsize=(10, 2))\nax = fig.add_axes([0, 0, 1, 1])\nax.bar(years, 1, width=1, color=plt.cm.RdBu_r((anom - anom.min()) / np.ptp(anom)))\nax.set_axis_off()\nfig.savefig("stripes.png", dpi=300)\n`,
    collections: ['stripes-spirals'],
    keywords: 'warming stripes classic annual global ed hawkins 20 lines',
  },
  {
    id: 'sea-ice-spiral',
    title: 'Arctic sea ice volume spiral, 1979–2024',
    author: 'gridsquare',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['multi-decade', 'seasonal'],
    difficulty: 3,
    remakes: 260,
    license: 'CC BY 4.0',
    updated: '2025-02-02',
    thumb: 'spiral',
    summary: 'Monthly ice volume wound into a spiral that tightens over time.',
    sample: { name: 'piomas_monthly.csv', rows: '552 rows', span: '1979–2024' },
    steps: [{ title: 'Read monthly data', mins: 5 }, { title: 'Polar plot', mins: 25 }],
    missing: 'Monthly; no gaps.',
    poster: '300 dpi PNG.',
    code: CODE_SPIRAL,
    collections: ['stripes-spirals'],
    keywords: 'sea ice spiral arctic monthly',
  },
  {
    id: 'global-anomaly-map',
    title: 'Global temperature anomaly map from NetCDF',
    author: 'bjorn_lindqvist',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'cartopy', 'xarray'],
    shapes: ['multi-decade'],
    difficulty: 4,
    remakes: 340,
    license: 'CC BY 4.0',
    updated: '2025-09-01',
    thumb: 'map',
    summary: 'Gridded anomalies on a Robinson projection with coastlines.',
    sample: { name: 'gistemp_1200km.nc', rows: 'gridded', span: '1880–2024' },
    steps: [{ title: 'Install cartopy', mins: 30 }, { title: 'Open NetCDF', mins: 15 }, { title: 'Map', mins: 30 }],
    missing: 'Masked cells shown grey.',
    poster: '300 dpi PNG.',
    code: `import xarray as xr\nimport cartopy.crs as ccrs\nimport matplotlib.pyplot as plt\n# ...`,
    collections: [],
    keywords: 'map global gridded netcdf anomaly cartopy',
  },
  {
    id: 'rainfall-lagos',
    title: 'Monthly rainfall bars with a dry-season band, Lagos',
    author: 'ade_charts',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['seasonal', 'categorical'],
    difficulty: 1,
    remakes: 190,
    license: 'CC BY 4.0',
    updated: '2025-07-21',
    thumb: 'monthBars',
    summary: 'Twelve bars of average rainfall with the dry season shaded.',
    sample: { name: 'lagos_monthly_rain.csv', rows: '12 rows', span: '1991–2020' },
    steps: [{ title: 'Read', mins: 5 }, { title: 'Bars and band', mins: 15 }],
    missing: 'None.',
    poster: '300 dpi PNG.',
    code: `import pandas as pd\nimport matplotlib.pyplot as plt\n# ...`,
    collections: [],
    keywords: 'rainfall monthly precipitation bars dry season',
  },
  {
    id: 'pyramid-census',
    title: 'Population pyramid from census age bands',
    author: 'lmcnally',
    tool: 'ggplot2',
    requires: ['R', 'ggplot2'],
    shapes: ['categorical'],
    difficulty: 1,
    remakes: 870,
    license: 'CC BY 4.0',
    updated: '2024-04-04',
    thumb: 'pyramid',
    summary: 'Back-to-back horizontal bars by age and sex.',
    sample: { name: 'county_ages_2020.csv', rows: '36 rows', span: '2020' },
    steps: [{ title: 'Reshape', mins: 10 }, { title: 'Mirror bars', mins: 10 }],
    missing: 'None.',
    poster: 'ggsave.',
    code: R_CODE('# ...'),
    collections: [],
    keywords: 'population pyramid census age historical society county',
  },
  {
    id: 'sankey-budget',
    title: 'Household budget Sankey',
    author: 'chartgarden',
    tool: 'D3',
    requires: ['JavaScript', 'D3 v7', 'd3-sankey'],
    shapes: ['categorical'],
    difficulty: 3,
    remakes: 410,
    license: 'MIT',
    updated: '2025-03-03',
    thumb: 'sankey',
    summary: 'Income flowing into spending categories.',
    sample: { name: 'budget.csv', rows: '24 rows', span: '2024' },
    steps: [{ title: 'Nodes and links', mins: 20 }, { title: 'Layout', mins: 30 }],
    missing: 'None.',
    poster: 'SVG.',
    code: CODE_D3('Sankey'),
    collections: [],
    keywords: 'sankey flow budget money',
  },
  {
    id: 'precip-cumulative',
    title: 'Cumulative precipitation by year, every year as a thin line, Des Moines',
    author: 'sundog_charts',
    tool: 'matplotlib',
    requires: ['Python', 'matplotlib', 'pandas'],
    shapes: ['daily time series', 'multi-decade', 'seasonal'],
    difficulty: 2,
    remakes: 155,
    license: 'CC0',
    updated: '2025-05-05',
    thumb: 'line',
    summary: 'Spaghetti of running yearly totals with the current year highlighted.',
    sample: { name: 'dsm_daily.csv', rows: '53,000 rows', span: '1878–2023' },
    steps: [{ title: 'Cumulative sums', mins: 10 }, { title: 'Lines', mins: 15 }],
    missing: 'Blanks treated as zero (walkthrough warns).',
    poster: '300 dpi PNG.',
    code: `import pandas as pd\nimport matplotlib.pyplot as plt\n# ...`,
    collections: [],
    keywords: 'precipitation cumulative rain spaghetti every year lines',
  },
];

export const SAVED_INITIAL: { id: string; note: string; status: 'saved' | 'too-hard'; date: string }[] = [
  { id: 'spiral-animated', note: 'Tried Oct 26 — stuck on ffmpeg, too hard', status: 'too-hard', date: '2026-10-26' },
  { id: 'stripes-20-lines', note: 'Saved Nov 2', status: 'saved', date: '2026-11-02' },
  { id: 'snow-calendar-marquette', note: 'Saved Nov 9', status: 'saved', date: '2026-11-09' },
];
