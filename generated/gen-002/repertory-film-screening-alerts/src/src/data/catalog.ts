import type { Cinema, Film, Screening } from "../types";

// Mock catalog for Reelcall. Counts match the brief: 6 cinemas, 38 upcoming
// matching screenings (Nov 17 – Dec 27, 2026), 214 wanted films, 61 marked
// must-see-on-film, 389 seen. Seat counts are the theatre's total seats.

export const CINEMAS: Cinema[] = [
  { id: "lumen", name: "Lumen Theatre", seats: 178, formats: ["35mm", "DCP"] },
  { id: "avalon", name: "The Avalon Rep", seats: 212, formats: ["35mm", "16mm", "DCP"] },
  { id: "cinemateca", name: "Cinemateca North", seats: 240, formats: ["35mm", "16mm", "DCP"] },
  { id: "parkside", name: "Parkside Microcinema", seats: 64, formats: ["16mm", "DCP"] },
  { id: "ufs", name: "University Film Society", seats: 320, formats: ["35mm", "16mm", "DCP"] },
  { id: "grandlake", name: "Grand Lake 70mm", seats: 540, formats: ["70mm", "35mm", "DCP"] },
];

export const FILMS: Film[] = [
  { id: "stalker", title: "Stalker", year: 1979, director: "Andrei Tarkovsky", seen: false, mustSeeOnFilm: true, runtime: 161 },
  { id: "days", title: "Days of Heaven", year: 1978, director: "Terrence Malick", seen: false, mustSeeOnFilm: true },
  { id: "space", title: "2001: A Space Odyssey", year: 1968, director: "Stanley Kubrick", seen: true, mustSeeOnFilm: true },
  { id: "lawrence", title: "Lawrence of Arabia", year: 1962, director: "David Lean", seen: true, mustSeeOnFilm: true },
  { id: "vertigo", title: "Vertigo", year: 1958, director: "Alfred Hitchcock", seen: true, mustSeeOnFilm: true },
  { id: "chungking", title: "Chungking Express", year: 1994, director: "Wong Kar-wai", seen: true, mustSeeOnFilm: true },
  { id: "mood", title: "In the Mood for Love", year: 2000, director: "Wong Kar-wai", seen: false, mustSeeOnFilm: true },
  { id: "jeanne", title: "Jeanne Dielman, 23 quai du Commerce, 1080 Bruxelles", year: 1975, director: "Chantal Akerman", seen: false, mustSeeOnFilm: true },
  { id: "hunter", title: "The Night of the Hunter", year: 1955, director: "Charles Laughton", seen: false, mustSeeOnFilm: false },
  { id: "persona", title: "Persona", year: 1966, director: "Ingmar Bergman", seen: false, mustSeeOnFilm: true },
  { id: "seven", title: "Seven Samurai", year: 1954, director: "Akira Kurosawa", seen: true, mustSeeOnFilm: false },
  { id: "mirror", title: "Mirror", year: 1975, director: "Andrei Tarkovsky", seen: false, mustSeeOnFilm: true },
  { id: "thing", title: "The Thing", year: 1982, director: "John Carpenter", seen: true, mustSeeOnFilm: false },
  { id: "eraser", title: "Eraserhead", year: 1977, director: "David Lynch", seen: true, mustSeeOnFilm: false },
  { id: "bladerunner", title: "Blade Runner", year: 1982, director: "Ridley Scott", seen: true, mustSeeOnFilm: false },
  { id: "mulholland", title: "Mulholland Drive", year: 2001, director: "David Lynch", seen: true, mustSeeOnFilm: false },
  { id: "cleo", title: "Cléo from 5 to 7", year: 1962, director: "Agnès Varda", seen: false, mustSeeOnFilm: true },
  { id: "vagabond", title: "Vagabond", year: 1985, director: "Agnès Varda", seen: false, mustSeeOnFilm: false },
  { id: "playtime", title: "Playtime", year: 1967, director: "Jacques Tati", seen: false, mustSeeOnFilm: true },
  { id: "tokyo", title: "Tokyo Story", year: 1953, director: "Yasujirō Ozu", seen: false, mustSeeOnFilm: true },
  { id: "ikiru", title: "Ikiru", year: 1952, director: "Akira Kurosawa", seen: false, mustSeeOnFilm: false },
  { id: "once", title: "Once Upon a Time in the West", year: 1968, director: "Sergio Leone", seen: true, mustSeeOnFilm: false },
  { id: "beau", title: "Beau Travail", year: 1999, director: "Claire Denis", seen: false, mustSeeOnFilm: false },
  { id: "woman", title: "A Woman Under the Influence", year: 1974, director: "John Cassavetes", seen: false, mustSeeOnFilm: false },
  { id: "picnic", title: "Picnic at Hanging Rock", year: 1975, director: "Peter Weir", seen: false, mustSeeOnFilm: false },
  { id: "taxi", title: "Taxi Driver", year: 1976, director: "Martin Scorsese", seen: true, mustSeeOnFilm: false },
  { id: "solaris", title: "Solaris", year: 1972, director: "Andrei Tarkovsky", seen: false, mustSeeOnFilm: true },
  { id: "lost", title: "Lost Highway", year: 1997, director: "David Lynch", seen: true, mustSeeOnFilm: false },
  { id: "ran", title: "Ran", year: 1985, director: "Akira Kurosawa", seen: false, mustSeeOnFilm: false },
  { id: "nosferatu", title: "Nosferatu", year: 1922, director: "F. W. Murnau", seen: false, mustSeeOnFilm: false },
];

const STALKER_SALES_SAT = [
  { date: "2026-11-09", sold: 96 },
  { date: "2026-11-12", sold: 118 },
  { date: "2026-11-14", sold: 131 },
  { date: "2026-11-16", sold: 142 },
];
const STALKER_SALES_SUN = [
  { date: "2026-11-09", sold: 30 },
  { date: "2026-11-12", sold: 44 },
  { date: "2026-11-14", sold: 55 },
  { date: "2026-11-16", sold: 61 },
];

/** Upcoming matching screenings, in date order. */
export const SCREENINGS: Screening[] = [
  { id: "s01", filmId: "vertigo", cinemaId: "avalon", date: "2026-11-17", time: "19:30", format: "DCP", sold: 88, series: "Hitchcock & Friends", price: 12 },
  { id: "s02", filmId: "chungking", cinemaId: "cinemateca", date: "2026-11-18", time: "20:00", format: "DCP", sold: 54, series: "Wong Kar-wai Retrospective", price: 13 },
  { id: "s03", filmId: "bladerunner", cinemaId: "cinemateca", date: "2026-11-19", time: "19:00", format: "DCP", sold: 131, series: null, price: 13 },
  { id: "s04", filmId: "days", cinemaId: "grandlake", date: "2026-11-20", time: "19:00", format: "70mm", sold: 288, series: "Big Format Winter", price: 16 },
  { id: "s05", filmId: "stalker", cinemaId: "lumen", date: "2026-11-21", time: "19:30", format: "35mm", sold: 142, series: "Tarkovsky in Print", price: 14, sales: STALKER_SALES_SAT },
  { id: "s06", filmId: "eraser", cinemaId: "parkside", date: "2026-11-21", time: "23:59", format: "16mm", sold: 41, series: "Witching Hour Late Shows", price: 9 },
  { id: "s07", filmId: "stalker", cinemaId: "lumen", date: "2026-11-22", time: "15:00", format: "35mm", sold: 61, series: "Tarkovsky in Print", price: 14, sales: STALKER_SALES_SUN },
  { id: "s08", filmId: "seven", cinemaId: "ufs", date: "2026-11-23", time: "19:00", format: "DCP", sold: 96, series: "Campus Classics", price: 10 },
  { id: "s09", filmId: "solaris", cinemaId: "cinemateca", date: "2026-11-24", time: "19:30", format: "35mm", sold: 33, series: "Cold Orbit: Soviet Science Fiction", price: 13 },
  { id: "s10", filmId: "persona", cinemaId: "ufs", date: "2026-11-25", time: "20:00", format: "16mm", sold: 47, series: "Bergman Winter", price: 10 },
  { id: "s11", filmId: "tokyo", cinemaId: "avalon", date: "2026-11-26", time: "19:00", format: "35mm", sold: 74, series: "Ozu at the Avalon", price: 12 },
  { id: "s12", filmId: "playtime", cinemaId: "grandlake", date: "2026-11-27", time: "19:00", format: "70mm", sold: 201, series: "Big Format Winter", price: 16 },
  { id: "s13", filmId: "thing", cinemaId: "parkside", date: "2026-11-27", time: "23:59", format: "16mm", sold: 22, series: "Witching Hour Late Shows", price: 9 },
  { id: "s14", filmId: "lawrence", cinemaId: "grandlake", date: "2026-11-28", time: "14:00", format: "70mm", sold: 412, series: "Big Format Winter", price: 16 },
  { id: "s15", filmId: "jeanne", cinemaId: "cinemateca", date: "2026-11-28", time: "17:00", format: "35mm", sold: 66, series: null, price: 13 },
  { id: "s16", filmId: "cleo", cinemaId: "ufs", date: "2026-11-29", time: "13:00", format: "35mm", sold: 118, series: "Cinema by Women", price: 10 },
  { id: "s17", filmId: "taxi", cinemaId: "avalon", date: "2026-11-29", time: "19:30", format: "DCP", sold: 140, series: null, price: 12 },
  { id: "s18", filmId: "once", cinemaId: "cinemateca", date: "2026-11-30", time: "19:00", format: "DCP", sold: 39, series: null, price: 13 },
  { id: "s19", filmId: "mood", cinemaId: "cinemateca", date: "2026-12-01", time: "19:30", format: "DCP", sold: 148, series: "Wong Kar-wai Retrospective", price: 13 },
  { id: "s20", filmId: "hunter", cinemaId: "avalon", date: "2026-12-02", time: "20:00", format: "35mm", sold: 109, series: "Night Shadows", price: 12 },
  { id: "s21", filmId: "vagabond", cinemaId: "ufs", date: "2026-12-03", time: "19:00", format: "16mm", sold: 12, series: "Cinema by Women", price: 10 },
  { id: "s22", filmId: "beau", cinemaId: "cinemateca", date: "2026-12-04", time: "19:00", format: "35mm", sold: 201, series: null, price: 13 },
  { id: "s23", filmId: "woman", cinemaId: "parkside", date: "2026-12-04", time: "21:00", format: "16mm", sold: 58, series: null, price: 9 },
  { id: "s24", filmId: "picnic", cinemaId: "avalon", date: "2026-12-05", time: "14:00", format: "35mm", sold: 90, series: null, price: 12 },
  { id: "s25", filmId: "mulholland", cinemaId: "parkside", date: "2026-12-05", time: "23:45", format: "DCP", sold: 20, series: "Witching Hour Late Shows", price: 9 },
  { id: "s26", filmId: "ikiru", cinemaId: "ufs", date: "2026-12-06", time: "15:00", format: "35mm", sold: 52, series: "Campus Classics", price: 10 },
  { id: "s27", filmId: "space", cinemaId: "grandlake", date: "2026-12-08", time: "19:00", format: "70mm", sold: 260, series: "Big Format Winter", price: 16 },
  { id: "s28", filmId: "lost", cinemaId: "parkside", date: "2026-12-10", time: "19:00", format: "DCP", sold: 31, series: "Witching Hour Late Shows", price: 9 },
  { id: "s29", filmId: "mirror", cinemaId: "lumen", date: "2026-12-12", time: "19:30", format: "35mm", sold: 19, series: "Tarkovsky in Print", price: 14 },
  { id: "s30", filmId: "ran", cinemaId: "ufs", date: "2026-12-13", time: "14:00", format: "35mm", sold: 70, series: "Campus Classics", price: 10 },
  { id: "s31", filmId: "mood", cinemaId: "cinemateca", date: "2026-12-17", time: "19:30", format: "35mm", sold: 144, series: "Wong Kar-wai Retrospective", price: 13 },
  { id: "s32", filmId: "nosferatu", cinemaId: "avalon", date: "2026-12-18", time: "20:30", format: "35mm", sold: 40, series: "Avalon Silent Nights", price: 12 },
  { id: "s33", filmId: "vertigo", cinemaId: "avalon", date: "2026-12-19", time: "19:00", format: "35mm", sold: 166, series: "Hitchcock & Friends", price: 12 },
  { id: "s34", filmId: "days", cinemaId: "grandlake", date: "2026-12-20", time: "15:00", format: "70mm", sold: 71, series: "Big Format Winter", price: 16 },
  { id: "s35", filmId: "jeanne", cinemaId: "cinemateca", date: "2026-12-22", time: "19:00", format: "35mm", sold: 9, series: null, price: 13 },
  { id: "s36", filmId: "mulholland", cinemaId: "cinemateca", date: "2026-12-23", time: "19:30", format: "DCP", sold: 77, series: null, price: 13 },
  { id: "s37", filmId: "chungking", cinemaId: "cinemateca", date: "2026-12-26", time: "20:00", format: "35mm", sold: 96, series: "Wong Kar-wai Retrospective", price: 13 },
  { id: "s38", filmId: "solaris", cinemaId: "lumen", date: "2026-12-27", time: "15:00", format: "35mm", sold: 12, series: "Tarkovsky in Print", price: 14 },
];
