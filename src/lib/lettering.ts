/**
 * Constructed lettering for the cover title. Every letter is a few thick strokes given by their
 * centre lines, so the word can assemble stroke by stroke: each stroke has a long straight lead-in
 * before its real start, and a dash exactly as long as the stroke travels down that lead-in and
 * comes to rest on the letter (see `.sw path` in home.css).
 *
 * Units: cap height 700, stroke weight 132. Only capitals needed by FIELDNOTES are defined.
 */
export const CAP = 700;
export const WEIGHT = 132;
const GAP = 58;

type Point = readonly [number, number];
/** A straight line to a point, or a quarter-circle arc (radius, sweep flag) to a point. */
type Seg = readonly ['L', number, number] | readonly ['A', number, 0 | 1, number, number];
interface StrokeDef {
  /** Where the stroke itself starts. */
  from: Point;
  segs: readonly Seg[];
  /** Where the lead-in starts; it must run straight into `from` along the stroke's first direction. */
  lead: Point;
  /** Trim to the letter's box (for diagonals whose square ends would stick out). */
  clip?: boolean;
}
interface Glyph { width: number; strokes: readonly StrokeDef[] }
export interface Stroke { d: string; len: number; lead: number; clip?: string }
export interface Letter { x: number; width: number; strokes: Stroke[]; clipId?: string }
export interface Word { text: string; width: number; letters: Letter[] }

const FAR = 2600; // how far away a stroke starts, in units
const h = WEIGHT / 2, T = h, B = CAP - h; // centre lines of the top and bottom bars
const stemDown = (x: number): StrokeDef => ({ from: [x, 0], segs: [['L', x, CAP]], lead: [x, -FAR] });
const stemUp = (x: number): StrokeDef => ({ from: [x, CAP], segs: [['L', x, 0]], lead: [x, CAP + FAR] });
/** A bar that arrives from the right and stops against the stem at x = h. */
const barFromRight = (y: number, right: number): StrokeDef => ({ from: [right, y], segs: [['L', h, y]], lead: [right + FAR, y] });
/** A bar that arrives from the left, passing through the stem at x = h. */
const barFromLeft = (y: number, right: number): StrokeDef => ({ from: [h, y], segs: [['L', right, y]], lead: [h - FAR, y] });

const R = 200; // bowl radius of D and O (centre line)
const r = 140; // bowl radius of S
const GLYPHS: Record<string, Glyph> = {
  F: { width: 446, strokes: [stemDown(h), barFromRight(T, 446), barFromRight(330, 400)] },
  I: { width: WEIGHT, strokes: [stemUp(h)] },
  E: { width: 456, strokes: [stemDown(h), barFromRight(T, 456), barFromRight(340, 430), barFromRight(B, 456)] },
  L: { width: 456, strokes: [stemUp(h), barFromRight(B, 456)] },
  // The bowl comes in along the baseline from the left, runs round and closes on the stem's head.
  D: { width: 580, strokes: [stemDown(h), { from: [h, B], lead: [h - FAR, B], segs: [['L', 314, B], ['A', R, 0, 514, B - R], ['L', 514, T + R], ['A', R, 0, 314, T], ['L', h, T]] }] },
  N: { width: 540, strokes: [
    stemUp(h),
    { from: [h - 60, -104], lead: [h - 60 - FAR * .5035, -104 - FAR * .864], segs: [['L', 474 + 60, CAP + 104]], clip: true },
    stemDown(474),
  ] },
  // Two halves, like the mark's brackets: one arrives along the top from the right, one along the bottom
  // from the left. Each runs a little past the other's start, so no seam shows where they meet.
  O: { width: 580, strokes: [
    { from: [290, T], lead: [290 + FAR, T], segs: [['L', 266, T], ['A', R, 0, h, T + R], ['L', h, B - R], ['A', R, 0, 266, B], ['L', 312, B]] },
    { from: [290, B], lead: [290 - FAR, B], segs: [['L', 314, B], ['A', R, 0, 514, B - R], ['L', 514, T + R], ['A', R, 0, 314, T], ['L', 268, T]] },
  ] },
  T: { width: 540, strokes: [{ from: [0, T], lead: [-FAR, T], segs: [['L', 540, T]] }, stemUp(270)] },
  // E in NOTES: bars arrive from the left instead.
  e: { width: 462, strokes: [stemUp(h), barFromLeft(T, 462), barFromLeft(340, 436), barFromLeft(B, 462)] },
  // Two strokes that meet in the middle of the spine: one rises into the upper bowl, one drops into the lower.
  S: { width: 524, strokes: [
    { from: [458, 236], lead: [458, 236 + FAR], segs: [['L', 458, 206], ['A', r, 0, 318, T], ['L', 206, T], ['A', r, 0, h, 206], ['L', h, 210], ['A', r, 0, 206, 350], ['L', 270, 350]] },
    { from: [h, 464], lead: [h, 464 - FAR], segs: [['L', h, 494], ['A', r, 0, 206, B], ['L', 318, B], ['A', r, 0, 458, 494], ['L', 458, 490], ['A', r, 0, 318, 350], ['L', 254, 350]] },
  ] },
};

const dist = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const n = (v: number) => Number(v.toFixed(1));
function build(def: StrokeDef): Stroke {
  let at: Point = def.from, len = 0, d = `M${n(def.lead[0])} ${n(def.lead[1])}L${n(at[0])} ${n(at[1])}`;
  for (const seg of def.segs) {
    if (seg[0] === 'L') { const to: Point = [seg[1], seg[2]]; len += dist(at, to); d += `L${n(to[0])} ${n(to[1])}`; at = to; }
    else { const to: Point = [seg[3], seg[4]]; len += Math.PI * seg[1] / 2; d += `A${seg[1]} ${seg[1]} 0 0 ${seg[2]} ${n(to[0])} ${n(to[1])}`; at = to; }
  }
  return { d, len: n(len), lead: n(dist(def.lead, def.from)) };
}

/** Lays a word out left to right. Lower-case letters in `text` pick alternative constructions. */
export function word(text: string, id: string): Word {
  let x = 0;
  const letters = [...text].map((char, index) => {
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`No constructed letter for "${char}"`);
    const clipId = glyph.strokes.some(s => s.clip) ? `sw-${id}-${index}` : undefined;
    const letter: Letter = { x, width: glyph.width, clipId, strokes: glyph.strokes.map(def => ({ ...build(def), clip: def.clip ? clipId : undefined })) };
    x += glyph.width + GAP;
    return letter;
  });
  return { text: text.toUpperCase(), width: x - GAP, letters };
}
