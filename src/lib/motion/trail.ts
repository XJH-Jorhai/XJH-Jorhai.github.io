import { clamp, motionParameters as p } from './parameters';

interface Point { x: number; y: number; time: number; width: number; stroke: number }

/** A bounded, fading ribbon. It paints no dots, emits no DOM nodes and owns no animation loop. */
export class PointerTrail {
  readonly canvas: HTMLCanvasElement;
  readonly field: HTMLElement;
  private readonly context: CanvasRenderingContext2D | null;
  private points: Point[] = [];
  private stroke = 0;
  private previous: Point | undefined;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private color = '';

  constructor(field: HTMLElement, canvas: HTMLCanvasElement) {
    this.field = field;
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
  }

  get count(): number { return this.points.length; }
  get available(): boolean { return this.context !== null; }
  get effectDpr(): number { return this.dpr; }

  measure(): void {
    this.width = this.field.clientWidth;
    this.height = this.field.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, p.canvasDpr);
    const pixelWidth = Math.max(1, Math.round(this.width * this.dpr));
    const pixelHeight = Math.max(1, Math.round(this.height * this.dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.clear();
    }
    const style = getComputedStyle(this.field);
    // Use the page's single asset-derived palette; no independently chosen Canvas colors.
    this.color = style.getPropertyValue('--color-accent').trim()
      || style.getPropertyValue('--accent').trim()
      || style.color;
  }

  add(x: number, y: number, now: number): void {
    const previous = this.previous;
    const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    if (previous && distance < p.trailMinDistance) return;
    const elapsed = previous ? Math.max(now - previous.time, 1) : 16;
    const speed = clamp(distance / elapsed, 0, 3);
    const point: Point = { x, y, time: now, width: 18 + speed * 11, stroke: this.stroke };
    this.points.push(point);
    if (this.points.length > p.trailMaxPoints) this.points.shift();
    this.previous = point;
  }

  leave(): void {
    if (this.previous) this.stroke += 1;
    this.previous = undefined;
  }

  draw(now: number): boolean {
    const ctx = this.context;
    if (!ctx) return false;
    this.points = this.points.filter((point) => now - point.time < p.trailLifetimeMs);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Two continuous, soft paths give the ribbon a diffuse edge and a quiet material core.
    for (const soft of [true, false]) {
      ctx.filter = `blur(${soft ? p.trailSoftness : 2}px)`;
      for (let i = 1; i < this.points.length; i += 1) {
        const a = this.points[i - 1];
        const b = this.points[i];
        if (!a || !b || a.stroke !== b.stroke) continue;
        const previous = this.points[i - 2];
        const next = this.points[i + 1];
        const start = previous?.stroke === a.stroke
          ? { x: (previous.x + a.x) / 2, y: (previous.y + a.y) / 2 } : a;
        const end = next?.stroke === b.stroke
          ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : b;
        const fade = Math.pow(clamp(1 - (now - b.time) / p.trailLifetimeMs, 0, 1), 1.65);
        ctx.globalAlpha = fade * p.trailOpacity * (soft ? 1 : 0.42);
        ctx.lineWidth = b.width * (soft ? 1 : 0.22);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(a.x, a.y, end.x, end.y);
        ctx.stroke();
      }
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    return this.points.length > 0;
  }

  clear(): void {
    this.points = [];
    this.previous = undefined;
    const ctx = this.context;
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
