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

  const lastValue = extended.at(-1).fryCount
  const avgValue = extended.reduce((sum, { fryCount }) => sum + fryCount, 0) / extended.length
  const minValue = Math.max(avgValue * 0.15, 5000) // At least 15% of average or 5000, whichever is higher
  
  const projection = Array.from({ length: monthsForward }).map((_, offset) => {
    const x = n + offset + 1
    const baseline = slope * x + intercept
    let adjusted = baseline * growthFactor
    
    // Ensure values don't go negative and maintain a minimum threshold
    // If the trend is declining, apply a floor based on average value
    if (adjusted < minValue) {
      // For declining trends, maintain a minimum but allow gradual decline
      const declineRate = Math.max(0.98, 1 - (offset * 0.002)) // Very gradual decline
      adjusted = Math.max(minValue * Math.pow(declineRate, offset), minValue * 0.5)
    }
    
    // Final safety check - ensure never negative
    adjusted = Math.max(adjusted, minValue * 0.5)

    return {
      month: formatFutureLabel(lastDate, offset + 1),
      baseline: round(Math.max(baseline, 0)),
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


