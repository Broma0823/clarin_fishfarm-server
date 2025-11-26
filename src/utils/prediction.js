const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatFutureLabel = (startDate, offset) => {
  const base = new Date(startDate)
  const next = new Date(base.setMonth(base.getMonth() + offset))
  return `${MONTH_LABELS[next.getMonth()]} ${next.getFullYear()}`
}

const round = (value) => Math.round(value / 100) * 100

export const buildForecast = ({ series, monthsForward = 6, growthFactor = 1.05 }) => {
  if (!series?.length) {
    return { historical: [], projection: [], stats: {} }
  }

  const extended = series.map((point, index) => ({ ...point, index: index + 1 }))

  const n = extended.length
  const sumX = extended.reduce((total, { index }) => total + index, 0)
  const sumY = extended.reduce((total, { fryCount }) => total + fryCount, 0)
  const sumXY = extended.reduce((total, { index, fryCount }) => total + index * fryCount, 0)
  const sumX2 = extended.reduce((total, { index }) => total + index * index, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const lastMonth = extended.at(-1)?.month ?? 'Nov 2025'
  const lastDate = new Date(`01 ${lastMonth}`)

  const projection = Array.from({ length: monthsForward }).map((_, offset) => {
    const x = n + offset + 1
    const baseline = slope * x + intercept
    const adjusted = baseline * growthFactor

    return {
      month: formatFutureLabel(lastDate, offset + 1),
      baseline: round(baseline),
      adjusted: round(adjusted),
    }
  })

  const stats = {
    avgGrowth:
      extended.length > 1
        ? ((extended.at(-1).fryCount - extended.at(-2).fryCount) / extended.at(-2).fryCount) * 100
        : 0,
    projectedPeak: projection.reduce(
      (max, p) => (p.adjusted > max ? p.adjusted : max),
      extended.at(-1).fryCount
    ),
    nextMonth: projection[0]?.adjusted ?? extended.at(-1).fryCount,
  }

  return {
    historical: series,
    projection,
    stats,
  }
}


