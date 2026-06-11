import type {
  PeriodType,
  PeriodRange,
  PeriodSummary,
  CompareResult,
  DimensionKey,
  DailyRecord,
  HeatmapCell
} from '@/types'
import { DIMENSION_ORDER, MIN_SAVE_DIMENSIONS } from '@/constants'
import { getDateRange, subtractDays, diffDays, today, addDays, formatDate } from './date'
import { calcStreak, getValidDates, getStreakForPeriod, isValidRecordDay } from './streak'

export function getPeriodRange(type: PeriodType, refDate: string = today()): PeriodRange {
  switch (type) {
    case 'week':
      return {
        start: subtractDays(refDate, 6),
        end: refDate,
        label: '本周'
      }
    case 'month': {
      const d = new Date(refDate)
      const first = formatDate(new Date(d.getFullYear(), d.getMonth(), 1))
      const last = formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
      return { start: first, end: last, label: '本月' }
    }
    case 'last30':
      return {
        start: subtractDays(refDate, 29),
        end: refDate,
        label: '近 30 天'
      }
    default:
      return { start: subtractDays(refDate, 6), end: refDate, label: '本周' }
  }
}

export function getPreviousPeriodRange(type: PeriodType, refDate: string = today()): PeriodRange {
  const current = getPeriodRange(type, refDate)
  const days = diffDays(current.start, current.end) + 1
  const prevEnd = subtractDays(current.start, 1)
  const prevStart = subtractDays(prevEnd, days - 1)
  return { start: prevStart, end: prevEnd, label: '上一周期' }
}

function getMergedRecords(
  records: Record<string, DailyRecord>,
  archive: Record<string, DailyRecord>
): Record<string, DailyRecord> {
  return { ...archive, ...records }
}

export function calculatePeriodSummary(
  records: Record<string, DailyRecord>,
  archive: Record<string, DailyRecord>,
  startDate: string,
  endDate: string
): PeriodSummary {
  const merged = getMergedRecords(records, archive)
  const dates = getDateRange(startDate, endDate)
  const totalDays = dates.length

  const validRecords: DailyRecord[] = []
  dates.forEach(d => {
    const r = merged[d]
    if (r && isValidRecordDay(r)) validRecords.push(r)
  })

  const validDays = validRecords.length

  const dimensionAverages: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
  DIMENSION_ORDER.forEach(k => {
    const scores: number[] = []
    validRecords.forEach(r => {
      const s = r[k]?.score
      if (s !== undefined && s > 0) scores.push(s)
    })
    dimensionAverages[k] = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0
  })

  let bestDim: DimensionKey | null = null
  let worstDim: DimensionKey | null = null
  let bestScore = 0
  let worstScore = 101

  DIMENSION_ORDER.forEach(k => {
    const s = dimensionAverages[k]
    if (s > 0 && s > bestScore) { bestScore = s; bestDim = k }
    if (s > 0 && s < worstScore) { worstScore = s; worstDim = k }
  })

  const overallAverage = validDays > 0
    ? Math.round(
      DIMENSION_ORDER.reduce((sum, k) => sum + dimensionAverages[k], 0) / DIMENSION_ORDER.length
    )
    : 0

  const balanceScore = calculateBalanceScore(dimensionAverages)

  const streakInfo = calcStreak(records, archive, endDate)
  const validDates = getValidDates(records, archive)
  const periodStreak = getStreakForPeriod(validDates, startDate, endDate)

  return {
    overallAverage,
    validDays,
    totalDays,
    dimensionAverages,
    bestDimension: bestDim,
    worstDimension: worstDim,
    mostImproved: null,
    balanceScore,
    streakCurrent: streakInfo.current,
    streakBest: periodStreak.bestInPeriod,
    records: validRecords
  }
}

export function calculateCompareResult(
  currentSummary: PeriodSummary,
  previousSummary: PeriodSummary
): CompareResult {
  const dimensionDeltas: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
  DIMENSION_ORDER.forEach(k => {
    dimensionDeltas[k] = currentSummary.dimensionAverages[k] - previousSummary.dimensionAverages[k]
  })

  const hasEnoughData = currentSummary.validDays >= 2 && previousSummary.validDays >= 2

  let overallDelta = 0
  let overallDeltaPercent: number | null = null
  if (currentSummary.overallAverage > 0 && previousSummary.overallAverage > 0) {
    overallDelta = currentSummary.overallAverage - previousSummary.overallAverage
    overallDeltaPercent = +(
      (overallDelta / previousSummary.overallAverage) * 100
    ).toFixed(1)
  }

  let mostImproved: { key: DimensionKey; delta: number } | null = null
  let maxDelta = -101
  DIMENSION_ORDER.forEach(k => {
    if (previousSummary.dimensionAverages[k] > 0) {
      if (dimensionDeltas[k] > maxDelta) {
        maxDelta = dimensionDeltas[k]
        mostImproved = { key: k, delta: dimensionDeltas[k] }
      }
    }
  })

  let worstCurrent: { key: DimensionKey; score: number } | null = null
  if (currentSummary.worstDimension) {
    worstCurrent = {
      key: currentSummary.worstDimension,
      score: currentSummary.dimensionAverages[currentSummary.worstDimension]
    }
  }

  return {
    current: currentSummary,
    previous: previousSummary,
    overallDelta,
    overallDeltaPercent,
    dimensionDeltas,
    mostImproved,
    worstCurrent,
    hasEnoughData
  }
}

export function calculateBalanceScore(
  dimensionAverages: Record<DimensionKey, number>
): number {
  const values = DIMENSION_ORDER
    .map(k => dimensionAverages[k])
    .filter(v => v > 0)

  if (values.length < 2) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  const stdDev = Math.sqrt(variance)

  const cv = stdDev / mean
  const score = Math.max(0, Math.round(100 - cv * 150))

  return Math.min(100, Math.max(0, score))
}

export function generateHeatmapData(
  records: Record<string, DailyRecord>,
  archive: Record<string, DailyRecord>,
  startDate: string,
  endDate: string
): HeatmapCell[] {
  const merged = getMergedRecords(records, archive)
  const dates = getDateRange(startDate, endDate)

  return dates.map(date => {
    const r = merged[date]
    if (!r) {
      return { date, totalScore: 0, filledDimensions: 0, hasNote: false, isValid: false, level: 0 as const }
    }

    let filled = 0
    let totalScore = 0
    let hasNote = false
    DIMENSION_ORDER.forEach(k => {
      const s = r[k]?.score || 0
      if (s > 0) {
        filled++
        totalScore += s
      }
      if (r[k]?.note && r[k].note!.trim().length > 0) hasNote = true
    })

    const isValid = filled >= MIN_SAVE_DIMENSIONS

    let level: 0 | 1 | 2 | 3 | 4 = 0
    if (!isValid) {
      level = 0
    } else {
      const avg = totalScore / DIMENSION_ORDER.length
      if (avg >= 80) level = 4
      else if (avg >= 60) level = 3
      else if (avg >= 40) level = 2
      else level = 1
    }

    return { date, totalScore, filledDimensions: filled, hasNote, isValid, level }
  })
}

export function getHeatmapWeeks(
  cells: HeatmapCell[],
  startOnSunday: boolean = true
): HeatmapCell[][] {
  if (cells.length === 0) return []

  const firstDate = cells[0].date
  const firstDay = new Date(firstDate).getDay()
  const leadingBlanks = startOnSunday ? firstDay : (firstDay === 0 ? 6 : firstDay - 1)

  const weeks: HeatmapCell[][] = []
  let currentWeek: (HeatmapCell | null)[] = new Array(leadingBlanks).fill(null)

  cells.forEach(cell => {
    currentWeek.push(cell)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek.filter(c => c !== null) as HeatmapCell[])
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null as any)
    weeks.push(currentWeek.filter(c => c !== null) as HeatmapCell[])
  }

  return weeks
}

export function formatDelta(delta: number, percent?: number | null): string {
  if (percent === null || percent === undefined) return '--'
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} (${sign}${percent}%)`
}

export function getCheckinRate(validDays: number, totalDays: number): number {
  if (totalDays === 0) return 0
  return Math.round((validDays / totalDays) * 100)
}
