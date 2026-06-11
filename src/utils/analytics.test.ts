import { describe, expect, it } from 'vitest'
import { calculateBalanceScore, calculateCompareResult, calculatePeriodSummary, getCheckinRate } from '@/utils/analytics'
import { calcStreak, isValidRecordDay, getStreakForPeriod, getValidDates } from '@/utils/streak'
import type { DailyRecord, DimensionKey } from '@/types'
import { DIMENSION_ORDER, MIN_SAVE_DIMENSIONS } from '@/constants'
import { formatDate, addDays, today } from '@/utils/date'

function makeRecord(score: number, date: string): DailyRecord {
  const r = {} as DailyRecord
  DIMENSION_ORDER.forEach((k, i) => {
    r[k] = { score: Math.max(0, score + i * 2 - 8), note: '' }
  })
  r.date = date
  r.savedAt = new Date().toISOString()
  return r
}

function makePartialRecord(dimensions: Partial<Record<DimensionKey, number>>, date: string): DailyRecord {
  const r = {} as DailyRecord
  DIMENSION_ORDER.forEach(k => {
    r[k] = { score: dimensions[k] ?? 0, note: '' }
  })
  r.date = date
  r.savedAt = new Date().toISOString()
  return r
}

describe('Analytics Utils - 平衡度计算', () => {
  it('所有维度分数相同时，平衡度应为 100 或接近 100', () => {
    const averages: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
    DIMENSION_ORDER.forEach(k => {
      averages[k] = 70
    })
    const score = calculateBalanceScore(averages)
    expect(score).toBeGreaterThanOrEqual(95)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('维度差距很大时，平衡度应较低', () => {
    const averages: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
    DIMENSION_ORDER.forEach((k, i) => {
      averages[k] = i < 4 ? 90 : 30
    })
    const score = calculateBalanceScore(averages)
    expect(score).toBeLessThan(60)
  })

  it('只有 1 个有效维度时，平衡度返回 0', () => {
    const averages: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
    DIMENSION_ORDER.forEach((k, i) => {
      averages[k] = i === 0 ? 70 : 0
    })
    const score = calculateBalanceScore(averages)
    expect(score).toBe(0)
  })

  it('全部为 0 时，平衡度返回 0', () => {
    const averages: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
    DIMENSION_ORDER.forEach(k => {
      averages[k] = 0
    })
    const score = calculateBalanceScore(averages)
    expect(score).toBe(0)
  })

  it('平衡度分数应在 0-100 范围内', () => {
    for (let seed = 0; seed < 20; seed++) {
      const averages: Record<DimensionKey, number> = {} as Record<DimensionKey, number>
      DIMENSION_ORDER.forEach((k, i) => {
        averages[k] = (seed * 7 + i * 11) % 100
      })
      const score = calculateBalanceScore(averages)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })
})

describe('Streak Utils - 连续打卡计算', () => {
  const baseDate = '2024-01-15'

  function buildRecords(datesWithValid: { date: string; valid: boolean }[]): Record<string, DailyRecord> {
    const records: Record<string, DailyRecord> = {}
    datesWithValid.forEach(({ date, valid }) => {
      if (valid) {
        records[date] = makeRecord(60, date)
      } else {
        const dims: Partial<Record<DimensionKey, number>> = {}
        DIMENSION_ORDER.slice(0, 2).forEach(k => {
          dims[k] = 50
        })
        records[date] = makePartialRecord(dims, date)
      }
    })
    return records
  }

  it('isValidRecordDay: 达到 MIN_SAVE_DIMENSIONS 个维度时为有效记录日', () => {
    const validRecord = makeRecord(60, '2024-01-01')
    expect(isValidRecordDay(validRecord)).toBe(true)

    const dims: Partial<Record<DimensionKey, number>> = {}
    DIMENSION_ORDER.slice(0, MIN_SAVE_DIMENSIONS - 1).forEach(k => {
      dims[k] = 50
    })
    const invalidRecord = makePartialRecord(dims, '2024-01-01')
    expect(isValidRecordDay(invalidRecord)).toBe(false)
  })

  it('calcStreak: 连续有效记录日正确计数', () => {
    const dates = []
    for (let i = 0; i < 10; i++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() - i)
      dates.push(formatDate(d))
    }

    const records = buildRecords(dates.map(date => ({ date, valid: true })))
    const result = calcStreak(records, {}, baseDate)
    expect(result.current).toBe(10)
  })

  it('calcStreak: 中断后重新计数', () => {
    const dates = []
    for (let i = 0; i < 10; i++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() - i)
      dates.push(formatDate(d))
    }

    const records = buildRecords(
      dates.map((date, i) => ({
        date,
        valid: i !== 3
      }))
    )

    const result = calcStreak(records, {}, baseDate)
    expect(result.current).toBe(3)
  })

  it('calcStreak: 无任何记录时 current 为 0', () => {
    const result = calcStreak({}, {}, baseDate)
    expect(result.current).toBe(0)
    expect(result.best).toBe(0)
  })

  it('getStreakForPeriod: 区间内最佳连续正确', () => {
    const startDate = '2024-01-01'
    const endDate = '2024-01-15'

    const validDates: string[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-03')
      d.setDate(d.getDate() + i)
      validDates.push(formatDate(d))
    }
    for (let i = 0; i < 3; i++) {
      const d = new Date('2024-01-10')
      d.setDate(d.getDate() + i)
      validDates.push(formatDate(d))
    }

    const result = getStreakForPeriod(validDates, startDate, endDate)
    expect(result.bestInPeriod).toBe(5)
  })
})

describe('Analytics Utils - 环比计算', () => {
  it('数据不足 2 个有效日时，hasEnoughData 为 false', () => {
    const currDates = ['2024-01-15']
    const prevDates = ['2024-01-08']

    const currRecords: Record<string, DailyRecord> = {}
    const prevRecords: Record<string, DailyRecord> = {}

    currDates.forEach(d => {
      currRecords[d] = makeRecord(60, d)
    })
    prevDates.forEach(d => {
      prevRecords[d] = makeRecord(50, d)
    })

    const currSummary = calculatePeriodSummary(currRecords, {}, '2024-01-10', '2024-01-16')
    const prevSummary = calculatePeriodSummary(prevRecords, {}, '2024-01-03', '2024-01-09')
    const result = calculateCompareResult(currSummary, prevSummary)

    expect(result.hasEnoughData).toBe(false)
  })

  it('本期均分高于上期时，环比为正增长', () => {
    const currRecords: Record<string, DailyRecord> = {}
    const prevRecords: Record<string, DailyRecord> = {}

    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-11')
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      currRecords[dateStr] = makeRecord(80, dateStr)
    }

    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-04')
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      prevRecords[dateStr] = makeRecord(60, dateStr)
    }

    const currSummary = calculatePeriodSummary(currRecords, {}, '2024-01-11', '2024-01-17')
    const prevSummary = calculatePeriodSummary(prevRecords, {}, '2024-01-04', '2024-01-10')
    const result = calculateCompareResult(currSummary, prevSummary)

    expect(result.hasEnoughData).toBe(true)
    expect(result.overallDelta).toBeGreaterThan(0)
    expect(result.overallDeltaPercent).toBeGreaterThan(0)
  })

  it('本期均分低于上期时，环比为负增长', () => {
    const currRecords: Record<string, DailyRecord> = {}
    const prevRecords: Record<string, DailyRecord> = {}

    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-11')
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      currRecords[dateStr] = makeRecord(50, dateStr)
    }

    for (let i = 0; i < 5; i++) {
      const d = new Date('2024-01-04')
      d.setDate(d.getDate() + i)
      const dateStr = formatDate(d)
      prevRecords[dateStr] = makeRecord(70, dateStr)
    }

    const currSummary = calculatePeriodSummary(currRecords, {}, '2024-01-11', '2024-01-17')
    const prevSummary = calculatePeriodSummary(prevRecords, {}, '2024-01-04', '2024-01-10')
    const result = calculateCompareResult(currSummary, prevSummary)

    expect(result.hasEnoughData).toBe(true)
    expect(result.overallDelta).toBeLessThan(0)
    expect(result.overallDeltaPercent).toBeLessThan(0)
  })

  it('mostImproved 正确识别进步最大的维度', () => {
    const currRecords: Record<string, DailyRecord> = {}
    const prevRecords: Record<string, DailyRecord> = {}

    const currDims: Partial<Record<DimensionKey, number>> = {
      rightView: 90,
      rightThought: 85,
      rightSpeech: 70,
      rightAction: 75
    }
    const prevDims: Partial<Record<DimensionKey, number>> = {
      rightView: 60,
      rightThought: 80,
      rightSpeech: 65,
      rightAction: 70
    }

    for (let i = 0; i < 3; i++) {
      const cd = new Date('2024-01-13')
      cd.setDate(cd.getDate() + i)
      const currDate = formatDate(cd)
      const pd = new Date('2024-01-06')
      pd.setDate(pd.getDate() + i)
      const prevDate = formatDate(pd)

      currRecords[currDate] = makePartialRecord(currDims, currDate)
      prevRecords[prevDate] = makePartialRecord(prevDims, prevDate)
    }

    DIMENSION_ORDER.slice(4).forEach(k => {
      currDims[k] = 60
      prevDims[k] = 60
    })

    const currSummary = calculatePeriodSummary(currRecords, {}, '2024-01-13', '2024-01-15')
    const prevSummary = calculatePeriodSummary(prevRecords, {}, '2024-01-06', '2024-01-08')
    const result = calculateCompareResult(currSummary, prevSummary)

    expect(result.mostImproved).not.toBeNull()
    expect(result.mostImproved?.key).toBe('rightView')
    expect(result.mostImproved?.delta).toBeGreaterThan(0)
  })

  it('getCheckinRate 正确计算打卡率', () => {
    expect(getCheckinRate(5, 10)).toBe(50)
    expect(getCheckinRate(7, 7)).toBe(100)
    expect(getCheckinRate(0, 10)).toBe(0)
    expect(getCheckinRate(0, 0)).toBe(0)
  })
})

describe('Analytics - archive 数据合并', () => {
  it('calculatePeriodSummary 合并 records 和 archive，records 优先', () => {
    const records: Record<string, DailyRecord> = {}
    const archive: Record<string, DailyRecord> = {}

    const date = '2024-01-10'
    records[date] = makeRecord(80, date)
    archive[date] = makeRecord(50, date)

    const summary = calculatePeriodSummary(records, archive, date, date)
    expect(summary.validDays).toBe(1)
    expect(summary.overallAverage).toBeGreaterThan(70)
  })
})
