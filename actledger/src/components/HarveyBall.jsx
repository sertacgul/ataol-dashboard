export default function HarveyBall({ value = 0, size = 20 }) {
  const v = Math.max(0, Math.min(4, Math.round(value ?? 0)))
  const r = size / 2
  const pct = v / 4
  const angle = pct * 360
  const large = angle > 180 ? 1 : 0
  const rad = (angle - 90) * Math.PI / 180
  const x = r + r * Math.cos(rad)
  const y = r + r * Math.sin(rad)
  const fill = v === 0 ? null : v === 4
    ? <circle cx={r} cy={r} r={r} fill="#2563EB" />
    : <path d={`M${r},${r} L${r},0 A${r},${r} 0 ${large} 1 ${x},${y} Z`} fill="#2563EB" />
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="inline-block align-middle">
      <circle cx={r} cy={r} r={r - 0.5} fill="white" stroke="#2563EB" strokeWidth="1" />
      {fill}
    </svg>
  )
}
