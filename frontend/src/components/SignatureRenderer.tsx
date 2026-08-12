interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
}

interface SignatureRendererProps {
  data: string;
  className?: string;
  height?: number;
}

function parseSignature(data: string): { segments: Segment[]; width: number; height: number } | null {
  if (!data || data === 'driver_signed' || data.startsWith('data:image')) return null;
  try {
    const parsed = JSON.parse(data);
    let segments: Segment[];
    let width: number;
    let height: number;

    if (Array.isArray(parsed)) {
      // Detect array-of-strokes format: [[{x,y},...], ...] (old mobile format)
      if (parsed.length > 0 && Array.isArray(parsed[0])) {
        const strokes = parsed as { x: number; y: number }[][];
        segments = strokes.flatMap((stroke) =>
          stroke.slice(1).map((pt, idx) => ({
            x1: stroke[idx].x, y1: stroke[idx].y, x2: pt.x, y2: pt.y,
          }))
        );
      } else {
        // Flat segments format: [{x1,y1,x2,y2}, ...]
        segments = parsed as Segment[];
      }
      let maxX = 0, maxY = 0;
      for (const s of segments) {
        if (s.x1 > maxX) maxX = s.x1;
        if (s.x2 > maxX) maxX = s.x2;
        if (s.y1 > maxY) maxY = s.y1;
        if (s.y2 > maxY) maxY = s.y2;
      }
      width = Math.max(maxX + 10, 100);
      height = Math.max(maxY + 10, 60);
    } else if (parsed && Array.isArray(parsed.segments)) {
      segments = parsed.segments as Segment[];
      width = parsed.width ?? 300;
      height = parsed.height ?? 160;
    } else {
      return null;
    }

    return { segments, width, height };
  } catch {
    return null;
  }
}

export default function SignatureRenderer({ data, className = '', height = 96 }: SignatureRendererProps) {
  if (!data) return null;

  if (data.startsWith('data:image')) {
    return <img src={data} alt="Driver signature" className={`max-h-24 max-w-xs ${className}`} />;
  }

  const parsed = parseSignature(data);
  if (!parsed || parsed.segments.length === 0) return null;

  const { segments, width, height: storedH } = parsed;

  const paths = segments.map(
    (s) => `M${s.x1},${s.y1} L${s.x2},${s.y2}`,
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${storedH}`}
      style={{ height }}
      className={`w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="#1C2E45" strokeWidth={2} strokeLinecap="round" fill="none" />
      ))}
    </svg>
  );
}
