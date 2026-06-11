import type { DimensionKey, DailyRecord } from './'

export type PeriodType = 'week' | 'month' | 'last30'

export interface PeriodRange {
  start: string
  end: string
  label: string
}

export interface DimensionAverage {
  key: DimensionKey
  score: number
  validDays: number
}

export interface PeriodSummary {
  overallAverage: number
  validDays: number
  totalDays: number
  dimensionAverages: Record<DimensionKey, number>
  bestDimension: DimensionKey | null
  worstDimension: DimensionKey | null
  mostImproved: DimensionKey | null
  balanceScore: number
  streakCurrent: number
  streakBest: number
  records: DailyRecord[]
}

export interface CompareResult {
  current: PeriodSummary
  previous: PeriodSummary
  overallDelta: number
  overallDeltaPercent: number | null
  dimensionDeltas: Record<DimensionKey, number>
  mostImproved: { key: DimensionKey; delta: number } | null
  worstCurrent: { key: DimensionKey; score: number } | null
  hasEnoughData: boolean
}

export interface HeatmapCell {
  date: string
  totalScore: number
  filledDimensions: number
  hasNote: boolean
  isValid: boolean
  level: 0 | 1 | 2 | 3 | 4
}

export interface InsightItem {
  id: string
  type: 'warning' | 'encouragement' | 'achievement' | 'tip'
  title: string
  content: string
  icon: string
}

export interface StreakInfo {
  current: number
  best: number
  lastDate: string | null
}

export interface InsightTemplate {
  dimension?: DimensionKey
  category: string
  templates: {
    low: string[]
    improving: string[]
    best: string[]
  }
}

export interface InsightConfig {
  streak: {
    break: string[]
    record: string[]
    new: string[]
    normal: string[]
  }
  balance: {
    high: string[]
    medium: string[]
    low: string[]
  }
  general: {
    greeting: string[]
    closing: string[]
  }
}
