type SparkProps = {
  values: number[]
  color: string
}

export function Spark({ values, color }: SparkProps) {
  const width = 128
  const height = 36
  if (values.length === 0) return null
  const max = Math.max(...values, 1)
  if (values.length === 1) {
    const value = values[0] ?? 0
    const y = height - 4 - (value / max) * (height - 10)
    return (
      <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <circle cx={width / 2} cy={y} r="2.5" fill={color} />
      </svg>
    )
  }
  const step = width / (values.length - 1)
  const path = values
    .map((value, index) => {
      const x = index * step
      const y = height - 4 - (value / max) * (height - 10)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
