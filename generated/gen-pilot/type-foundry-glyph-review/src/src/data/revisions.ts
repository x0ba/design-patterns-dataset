import { t, type PersonId, type StyleId } from './core';

/** A localised outline edit: points near (cx, cy) — fractions of the glyph bbox — moved by (dx, dy) font units. */
export interface Edit { cx: number; cy: number; r: number; dx: number; dy: number }

export type Decision = 'pending' | 'approved' | 'sent-back';

export interface Revision {
  id: string;
  ch: string;
  style: StyleId;
  author: PersonId;
  at: number;
  note: string;
  edits: Edit[];
  context: string; // words to proof it in
}

const E = (cx: number, cy: number, r: number, dx: number, dy: number): Edit => ({ cx, cy, r, dx, dy });

let minute = t('Wed', 23, 41);
const next = (step: number) => (minute += step);

const R = (ch: string, note: string, edits: Edit[], context: string): Revision => ({
  id: `regular-${ch}`, ch, style: 'regular', author: 'eleni', at: next(5), note, edits, context,
});
const B = (ch: string, note: string, edits: Edit[], context: string): Revision => ({
  id: `bold-${ch}`, ch, style: 'bold', author: 'eleni', at: next(6), note, edits, context,
});

export const REVISIONS: Revision[] = [
  // Regular — 17
  R('α', 'Tail shortened and lifted so it stops clashing with a following τ or ι. Join into the bowl is 6 units thinner.',
    [E(0.95, 0.12, 0.28, -12, 14), E(0.78, 0.5, 0.18, -6, 0)], 'αλλά καλά άλλα'),
  R('β', 'Upper bowl narrowed by 16 units; it was wider than the lower bowl at text sizes.',
    [E(0.85, 0.78, 0.3, -16, 0)], 'βιβλίο αβέβαιος'),
  R('γ', 'Closed the descender loop slightly; the counter was reading as a hole at 8 pt.',
    [E(0.5, 0.08, 0.28, 0, 12)], 'γυναίκα αγγελία'),
  R('δ', 'Top hook reworked: less swash, closer to the terminal of your s.',
    [E(0.72, 0.93, 0.3, -18, -8)], 'δήμος δεδομένα'),
  R('ζ', 'Descender hook shortened 20 units so it no longer touches ascenders on the next line at 120% leading.',
    [E(0.62, 0.04, 0.3, 0, 20)], 'ζωή αζήτητο'),
  R('λ', 'Lowered the point where the short leg meets the diagonal; the old join was dark. Foot of the long leg unchanged.',
    [E(0.42, 0.52, 0.22, 6, -14)], 'λέξη ελληνικά λαός'),
  R('ξ', 'Middle tier pulled in 12 units; rhythm of the three tiers now matches ζ.',
    [E(0.4, 0.56, 0.26, -12, 0)], 'ξένος ξαφνικά έξοδος'),
  R('ς', 'Terminal is now a flat cut like your s instead of the ball. Descender stops at −212 to match ρ and φ.',
    [E(0.82, 0.86, 0.24, -10, 8), E(0.5, 0.04, 0.3, 0, 16)], 'λόγος κόσμος νόμος'),
  R('σ', 'Top bar shortened 20 units — it was reading as σ plus a rule at small sizes.',
    [E(0.98, 0.95, 0.25, -20, 0)], 'σήμερα θέσεις'),
  R('φ', 'Bowl slightly flatter on the left; stem unchanged.',
    [E(0.1, 0.5, 0.3, 10, 0)], 'φως φίλος γραφή'),
  R('ψ', 'Arms opened 8 units each side; the cup now sits on the x-height.',
    [E(0.06, 0.9, 0.22, -8, 0), E(0.94, 0.9, 0.22, 8, 0)], 'ψυχή ψηφοφορία'),
  R('ω', 'Centre notch raised 16 units so the two counters don’t fill in.',
    [E(0.5, 0.62, 0.22, 0, 16)], 'ώρα ωραίο κόσμω'),
  R('ά', 'Rebuilt from the new α; tonos moved 10 units right.',
    [E(0.95, 0.08, 0.22, -12, 14), E(0.62, 0.92, 0.18, 10, 0)], 'άνθρωπος πάλι'),
  R('ώ', 'Rebuilt from ω; tonos realigned over the notch.',
    [E(0.5, 0.92, 0.18, 8, 0), E(0.5, 0.42, 0.18, 0, 12)], 'ώρα πώς'),
  R('ΐ', 'Dialytika spacing matched to ϊ; tonos centred between the dots.',
    [E(0.5, 0.92, 0.25, 0, 10)], 'διυλιστήριο ΐ'),
  R('Ξ', 'Middle bar 14 units shorter each side; it was too assertive in all-caps settings.',
    [E(0.18, 0.5, 0.18, 14, 0), E(0.82, 0.5, 0.18, -14, 0)], 'ΞΕΝΟΔΟΧΕΙΟ ΤΑΞΙ'),
  R('Λ', 'Apex flattened slightly; less dark where the strokes meet.',
    [E(0.5, 0.98, 0.22, 0, -10)], 'ΛΑΟΣ ΕΛΛΑΔΑ'),
  // Bold — 14
  B('α', 'Same tail change as Regular, scaled for Bold. Bowl join opened 10 units — it was filling in.',
    [E(0.95, 0.12, 0.28, -14, 16), E(0.78, 0.5, 0.2, 10, 0)], 'αλλά καλά άλλα'),
  B('λ', 'Apex join lowered to match Regular; overshoot on the long leg corrected.',
    [E(0.42, 0.52, 0.22, 6, -16), E(0.92, 0.0, 0.2, 0, -6)], 'λέξη ελληνικά λαός'),
  B('ξ', 'Middle tier pulled in; bottom hook thinned 8 units, it was the heaviest point in the word.',
    [E(0.4, 0.56, 0.26, -12, 0), E(0.62, 0.04, 0.24, 0, 8)], 'ξένος ξαφνικά έξοδος'),
  B('ς', 'Flat terminal as in Regular. Bold descender a little deeper (−220) for weight balance.',
    [E(0.82, 0.86, 0.24, -12, 8), E(0.5, 0.04, 0.3, 0, -8)], 'λόγος κόσμος νόμος'),
  B('σ', 'Top bar shortened 24 units.',
    [E(0.98, 0.95, 0.25, -24, 0)], 'σήμερα θέσεις'),
  B('δ', 'Top hook reworked to match Regular.',
    [E(0.72, 0.93, 0.3, -16, -10)], 'δήμος δεδομένα'),
  B('ζ', 'Descender hook shortened 18 units.',
    [E(0.62, 0.04, 0.3, 0, 18)], 'ζωή αζήτητο'),
  B('φ', 'Stem thinned 6 units below the bowl; it was darker than ρ.',
    [E(0.5, 0.06, 0.2, -6, 0)], 'φως φίλος γραφή'),
  B('ω', 'Centre notch raised 20 units — counters were closing at 8 pt.',
    [E(0.5, 0.62, 0.22, 0, 20)], 'ώρα ωραίο κόσμω'),
  B('ά', 'Rebuilt from the new Bold α.',
    [E(0.95, 0.08, 0.22, -14, 16)], 'άνθρωπος πάλι'),
  B('ό', 'Tonos angle steepened to match ά and έ.',
    [E(0.62, 0.92, 0.2, 8, 6)], 'όλα πόλη'),
  B('ύ', 'Tonos angle steepened; the upsilon bowl is untouched.',
    [E(0.62, 0.92, 0.2, 8, 6)], 'ύπνος πολύ'),
  B('Ξ', 'Middle bar shortened as in Regular.',
    [E(0.18, 0.5, 0.18, 14, 0), E(0.82, 0.5, 0.18, -14, 0)], 'ΞΕΝΟΔΟΧΕΙΟ ΤΑΞΙ'),
  B('Σ', 'Upper arm terminal less serifed; it was reading as a Latin E in headlines.',
    [E(0.95, 0.96, 0.2, -12, -6)], 'ΣΗΜΕΡΑ ΘΕΣΣΑΛΟΝΙΚΗ'),
  // Tomás — Light
  {
    id: 'light-&', ch: '&', style: 'light', author: 'tomas', at: t('Tue', 18, 5),
    note: 'Opened the lower counter and lifted the crossing about 12 units. It was clotting at 8 pt in the caption style.',
    edits: [E(0.42, 0.32, 0.3, 4, 12)], context: 'Zon & Zee · Kunst & Cultuur',
  },
  {
    id: 'light-g', ch: 'g', style: 'light', author: 'tomas', at: t('Tue', 18, 19),
    note: 'Lower loop narrowed 14 units; the link from the bowl now leaves further right.',
    edits: [E(0.15, 0.1, 0.32, 14, 0), E(0.55, 0.32, 0.18, -8, 0)], context: 'geografie · vergadering · dag',
  },
];

export const GREEK_REVISIONS = REVISIONS.filter((r) => r.author === 'eleni');

export function revisedByStyle(): Record<StyleId, string[]> {
  const out: Record<StyleId, string[]> = { light: [], regular: [], semibold: [], bold: [], italic: [], 'bold-italic': [] };
  for (const r of REVISIONS) out[r.style].push(r.ch);
  return out;
}
