// Helpers to decide whether a drawn signature is "real" rather than a stray
// tap. A plain click/tap (or tiny finger jitter) produces almost no pen travel,
// so we require a minimum total stroke length before treating it as a signature.

export type SigSegment = {x1: number; y1: number; x2: number; y2: number};

// Minimum total stroke travel (in canvas px) for a signature to count.
export const SIGNATURE_MIN_PATH = 40;

export function signaturePathLength(segments: SigSegment[] | null | undefined): number {
  if (!Array.isArray(segments)) {
    return 0;
  }
  let total = 0;
  for (const s of segments) {
    total += Math.hypot((s.x2 ?? 0) - (s.x1 ?? 0), (s.y2 ?? 0) - (s.y1 ?? 0));
  }
  return total;
}

export function isMeaningfulSignature(segments: SigSegment[] | null | undefined): boolean {
  return Array.isArray(segments) && segments.length >= 3 && signaturePathLength(segments) >= SIGNATURE_MIN_PATH;
}

export type SigPoint = {x: number; y: number};

// Same idea for the stroke-based pads (arrays of points per stroke).
export function strokesPathLength(strokes: SigPoint[][] | null | undefined): number {
  if (!Array.isArray(strokes)) {
    return 0;
  }
  let total = 0;
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      total += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
    }
  }
  return total;
}

export function isMeaningfulStrokes(strokes: SigPoint[][] | null | undefined): boolean {
  return strokesPathLength(strokes) >= SIGNATURE_MIN_PATH;
}

// ── Smooth SVG path building ───────────────────────────────────────────────
// Drawing straight lines between raw touch points looks jagged/angular. We
// instead build quadratic-bézier curves that pass through the midpoints of
// consecutive points, which renders as a smooth, pen-like signature.

const f = (n: number) => n.toFixed(1);

// Group a flat segment list back into continuous strokes (a new stroke starts
// wherever a segment doesn't continue from the previous one — i.e. a pen lift).
export function segmentsToStrokes(segments: SigSegment[] | null | undefined): SigPoint[][] {
  if (!Array.isArray(segments)) {
    return [];
  }
  const EPS = 0.01;
  const strokes: SigPoint[][] = [];
  let cur: SigPoint[] = [];
  for (const s of segments) {
    const start = {x: s.x1, y: s.y1};
    const end = {x: s.x2, y: s.y2};
    if (cur.length === 0) {
      cur.push(start, end);
    } else {
      const last = cur[cur.length - 1];
      if (Math.abs(last.x - start.x) < EPS && Math.abs(last.y - start.y) < EPS) {
        cur.push(end);
      } else {
        strokes.push(cur);
        cur = [start, end];
      }
    }
  }
  if (cur.length) {
    strokes.push(cur);
  }
  return strokes;
}

export function strokesToSmoothPath(strokes: SigPoint[][] | null | undefined): string {
  if (!Array.isArray(strokes)) {
    return '';
  }
  const parts: string[] = [];
  for (const pts of strokes) {
    if (!pts || pts.length === 0) {
      continue;
    }
    if (pts.length === 1) {
      parts.push(`M${f(pts[0].x)} ${f(pts[0].y)} L${f(pts[0].x + 0.1)} ${f(pts[0].y)}`);
      continue;
    }
    if (pts.length === 2) {
      parts.push(`M${f(pts[0].x)} ${f(pts[0].y)} L${f(pts[1].x)} ${f(pts[1].y)}`);
      continue;
    }
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q${f(pts[i].x)} ${f(pts[i].y)} ${f(midX)} ${f(midY)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${f(last.x)} ${f(last.y)}`;
    parts.push(d);
  }
  return parts.join(' ');
}

// Convenience for the segment-based pads.
export function segmentsToSmoothPath(segments: SigSegment[] | null | undefined): string {
  return strokesToSmoothPath(segmentsToStrokes(segments));
}
