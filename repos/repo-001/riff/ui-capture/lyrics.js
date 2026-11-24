'use strict';
// Lyrics provider stand-in (lrclib / Musixmatch / Genius are unreachable offline).
// Instrumental artists are reported as instrumental; other tracks report "no lyrics found",
// which is what the real providers return for a miss.
const INSTRUMENTAL = new Set(['Four Tet', 'Burial', 'Bicep', 'Aphex Twin', 'Nils Frahm', 'Ólafur Arnalds', 'Floating Points', 'Nujabes',
  'mt. fujitive', 'Jinsang', 'idealism', 'Saib.', 'Tomppabeats', 'sweatson klank', 'Kerala Dust', 'DJ Seinfeld', 'Mall Grab', 'Ross From Friends']);
function lyricsFor(title, artist) {
  if (INSTRUMENTAL.has(String(artist || '').trim())) return { success: true, instrumental: true, syncedLyrics: '', plainLyrics: '' };
  return { success: false, error: 'Lyrics not found' };
}
module.exports = { lyricsFor };
