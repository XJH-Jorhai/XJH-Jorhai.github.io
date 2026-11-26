/**
 * Constructed lettering for the cover title and the home posters' giant words, drawn as a logotype
 * rather than letter by letter.
 * A stroke is one continuous line (a centre line with a constant weight) and may run through a
 * whole letter or on into the next one: E is a bracket and a bar, N, O and S are one line each,
 * L runs along the baseline into D's bowl and down D's stem, T's bar runs on as E's top arm.
 * FIELD is 6 strokes, NOTES is 7.
 *
 * Each stroke can have a straight lead-in before its real start. The stroke is one dash exactly as
 * long as itself; it starts parked before the path, travels down the lead-in and comes to rest on
 * the letter (see `.sw path` in home.css). With no lead-in the stroke simply draws itself from its
 * first point; with one it arrives as a ribbon from outside the word.
 *
 * Units: cap height 700, stroke weight 132.
 */
export const CAP = 700;
export const WEIGHT = 132;

type Point = readonly [number, number];
/** A straight line to a point, or a quarter-circle arc (radius, sweep flag) to a point. */
type Seg = readonly ['L', number, number] | readonly ['A', number, 0 | 1, number, number];
interface StrokeDef {
  from: Point;
  segs: readonly Seg[];
  /** Length of the straight lead-in, which continues the stroke's first direction backwards. 0 = draw in place. */
  lead?: number;
  /** Trim to this x range and the cap height (for N, whose sharp joins would stick out). */
  clip?: readonly [number, number];
}
export interface Stroke { d: string; len: number; lead: number; order: number; duration: number; clip?: string }
export interface Word { text: string; width: number; strokes: Stroke[]; clips: { id: string; x: number; width: number }[] }

const h = WEIGHT / 2, T = h, B = CAP - h; // centre lines of the top and bottom bars
const R = 200; // bowl radius of D and O (centre line)
const r = 140; // bowl radius of S
const FAR = 1300; // how far outside the word a ribbon starts

// Letter origins: F 0 · I 504 · E 694 · L 1208 · D 1722 (width 2302)
const FIELD: StrokeDef[] = [
  // F: up the stem from below, then right along the top.
  { from: [h, CAP], lead: FAR, segs: [['L', h, T], ['L', 446, T]] },
  { from: [h, 330], segs: [['L', 400, 330]] },
  // I: down from above.
  { from: [570, 0], lead: FAR, segs: [['L', 570, CAP]] },
  // E: one bracket, in from the right along the top, down the stem, out along the baseline.
  { from: [1150, T], lead: FAR, segs: [['L', 760, T], ['L', 760, B], ['L', 1150, B]] },
  { from: [760, 340], segs: [['L', 1124, 340]] },
  // L + D: down L's stem, along the baseline into D, round the bowl, back along the top, down D's stem.
  { from: [1274, 0], lead: FAR, segs: [['L', 1274, B], ['L', 2036, B], ['A', R, 0, 2236, B - R], ['L', 2236, T + R], ['A', R, 0, 2036, T], ['L', 1788, T], ['L', 1788, CAP]] },
];
// Letter origins: N 0 · O 598 · T 1236 · E 1834 · S 2354 (width 2878)
const NOTES: StrokeDef[] = [
  // N: one zigzag, drawn where it stands.
  { from: [h, CAP], segs: [['L', h, 0], ['L', 474, CAP], ['L', 474, 0]], clip: [0, 540] },
  // O: one loop from the top; it ends a little past its own start so no seam shows.
  { from: [888, T], segs: [['L', 864, T], ['A', R, 0, 664, T + R], ['L', 664, B - R], ['A', R, 0, 864, B], ['L', 912, B], ['A', R, 0, 1112, B - R], ['L', 1112, T + R], ['A', R, 0, 912, T], ['L', 848, T]] },
  // T + E: one bar from the left, T's top and E's top arm.
  { from: [1236, T], lead: FAR, segs: [['L', 2296, T]] },
  { from: [1506, CAP], lead: FAR, segs: [['L', 1506, T]] },
  // E: down the stem from above, out along the baseline.
  { from: [1900, 0], lead: FAR, segs: [['L', 1900, B], ['L', 2296, B]] },
  { from: [1900, 340], segs: [['L', 2270, 340]] },
  // S: one line from the upper terminal to the lower one.
  { from: [2812, 236], segs: [['L', 2812, 206], ['A', r, 0, 2672, T], ['L', 2560, T], ['A', r, 0, 2420, 206], ['L', 2420, 210], ['A', r, 0, 2560, 350], ['L', 2672, 350], ['A', r, 1, 2812, 490], ['L', 2812, 494], ['A', r, 1, 2672, B], ['L', 2560, B], ['A', r, 1, 2420, 494], ['L', 2420, 464]] },
];
/**
 * The same hand for the home posters' giant words (WORK, NOTES, PER / SONA): one glyph table, set with
 * an even 64-unit gap. Every letter is one or two strokes; where a letter has a stem to climb, the stroke
 * comes in as a ribbon from outside the word (lead), as on the cover. Sharp-jointed letters (N, W, K, A)
 * are drawn in place and trimmed to the cap height so their mitres do not stick out.
 *   R: one stroke up the stem, over the bowl, back to the stem and down the leg.
 *   P: the same without the leg.  K: a stem and one chevron.  W: one zigzag.  A: one Λ and a bar.
 */
const M = 372; // centre line of the bowls' lower bar (R, P)
const q = 156; // bowl radius of R and P
const GLYPHS: Record<string, { width: number; strokes: (x: number) => StrokeDef[] }> = {
  N: { width: 540, strokes: x => [{ from: [x + h, CAP], segs: [['L', x + h, 0], ['L', x + 474, CAP], ['L', x + 474, 0]], clip: [x, x + 540] }] },
  O: { width: 580, strokes: x => [{ from: [x + 290, T], segs: [['L', x + 266, T], ['A', R, 0, x + 66, T + R], ['L', x + 66, B - R], ['A', R, 0, x + 266, B], ['L', x + 314, B], ['A', R, 0, x + 514, B - R], ['L', x + 514, T + R], ['A', R, 0, x + 314, T], ['L', x + 250, T]] }] },
  S: { width: 524, strokes: x => [{ from: [x + 458, 236], segs: [['L', x + 458, 206], ['A', r, 0, x + 318, T], ['L', x + 206, T], ['A', r, 0, x + 66, 206], ['L', x + 66, 210], ['A', r, 0, x + 206, 350], ['L', x + 318, 350], ['A', r, 1, x + 458, 490], ['L', x + 458, 494], ['A', r, 1, x + 318, B], ['L', x + 206, B], ['A', r, 1, x + 66, 494], ['L', x + 66, 464]] }] },
  E: { width: 520, strokes: x => [
    { from: [x + 462, T], lead: FAR, segs: [['L', x + 66, T], ['L', x + 66, B], ['L', x + 462, B]] },
    { from: [x + 66, 340], segs: [['L', x + 436, 340]] },
  ] },
  W: { width: 820, strokes: x => [{ from: [x + 40, 0], segs: [['L', x + 230, CAP], ['L', x + 410, 0], ['L', x + 590, CAP], ['L', x + 780, 0]], clip: [x - 30, x + 850] }] },
  R: { width: 540, strokes: x => [{ from: [x + h, CAP], lead: FAR, segs: [['L', x + h, T], ['L', x + 300, T], ['A', q, 1, x + 456, T + q], ['L', x + 456, M - q], ['A', q, 1, x + 300, M], ['L', x + 200, M], ['L', x + 500, CAP]], clip: [x - 10, x + 580] }] },
  P: { width: 520, strokes: x => [{ from: [x + h, CAP], lead: FAR, segs: [['L', x + h, T], ['L', x + 300, T], ['A', q, 1, x + 456, T + q], ['L', x + 456, M - q], ['A', q, 1, x + 300, M], ['L', x + 100, M]] }] },
  K: { width: 540, strokes: x => [
    { from: [x + h, 0], lead: FAR, segs: [['L', x + h, CAP]] },
    { from: [x + 520, 0], segs: [['L', x + 150, 380], ['L', x + 520, CAP]], clip: [x, x + 560] },
  ] },
  A: { width: 620, strokes: x => [
    { from: [x + 30, CAP], segs: [['L', x + 310, 0], ['L', x + 590, CAP]], clip: [x - 20, x + 640] },
    { from: [x + 150, 470], segs: [['L', x + 470, 470]] },
  ] },
};
const GAP = 64;
function compose(text: string): { width: number; strokes: StrokeDef[] } {
  let x = 0;const strokes: StrokeDef[] = [];
  for (const char of text) { const glyph = GLYPHS[char]; if (!glyph) throw new Error(`No glyph for "${char}"`); strokes.push(...glyph.strokes(x)); x += glyph.width + GAP; }
  return { width: x - GAP, strokes };
}

const WORDS: Record<string, { width: number; strokes: StrokeDef[] }> = {
  FIELD: { width: 2302, strokes: FIELD },
  NOTES: { width: 2878, strokes: NOTES },
};

const n = (v: number) => Number(v.toFixed(1));
function build(def: StrokeDef, order: number, clip?: string): Stroke {
  const first = def.segs[0]!, to: Point = first[0] === 'L' ? [first[1], first[2]] : [first[3], first[4]];
  const run = Math.hypot(to[0] - def.from[0], to[1] - def.from[1]) || 1, lead = def.lead ?? 0;
  const start: Point = [def.from[0] - (to[0] - def.from[0]) / run * lead, def.from[1] - (to[1] - def.from[1]) / run * lead];
  let at: Point = def.from, len = 0, d = lead ? `M${n(start[0])} ${n(start[1])}L${n(at[0])} ${n(at[1])}` : `M${n(at[0])} ${n(at[1])}`;
  for (const seg of def.segs) {
    if (seg[0] === 'L') { const p: Point = [seg[1], seg[2]]; len += Math.hypot(p[0] - at[0], p[1] - at[1]); d += `L${n(p[0])} ${n(p[1])}`; at = p; }
    else { const p: Point = [seg[3], seg[4]]; len += Math.PI * seg[1] / 2; d += `A${seg[1]} ${seg[1]} 0 0 ${seg[2]} ${n(p[0])} ${n(p[1])}`; at = p; }
  }
  // Longer journeys take longer, so every stroke moves at a similar pace.
  return { d, len: n(len), lead, order, duration: Number((.8 + (lead + len) / 4200).toFixed(2)), clip };
}

export function word(text: string, id: string): Word {
  const source = WORDS[text] ?? compose(text);
  const clips: Word['clips'] = [];
  const strokes = source.strokes.map((def, index) => {
    let clip: string | undefined;
    if (def.clip) { clip = `sw-${id}-${index}`; clips.push({ id: clip, x: def.clip[0], width: def.clip[1] - def.clip[0] }); }
    return build(def, index, clip);
  });
  return { text, width: source.width, strokes, clips };
}
