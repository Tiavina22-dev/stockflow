const WIDTH = 160
const HEIGHT = 44
const STROKE = 2

type SparklineProps = {
  data: number[]
  className?: string
}

/** Courbe lissée (Catmull-Rom → Bézier) qui prend la couleur du texte courant. */
export function Sparkline({ data, className }: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const range = Math.max(...data) - min || 1
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * WIDTH,
    y: STROKE + (1 - (v - min) / range) * (HEIGHT - STROKE * 2),
  }))

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
