export type DimensionKey =
  | 'rightView'
  | 'rightThought'
  | 'rightSpeech'
  | 'rightAction'
  | 'rightLivelihood'
  | 'rightEffort'
  | 'rightMindfulness'
  | 'rightConcentration'

export interface DimensionScore {
  score: number
  note?: string
}

export type DailyRecord = Record<DimensionKey, DimensionScore> & {
  date: string
  savedAt: string
}

export interface ReminderItem {
  key: string
  label: string
  dimension: DimensionKey
  checked: boolean
  suggested: boolean
}

export interface WeekAverage {
  [key: string]: number
}

export interface BackupData {
  version: string
  exportedAt: string
  records: DailyRecord[]
  archive?: DailyRecord[]
  reminders?: ReminderItem[]
}

export interface AdviceEntry {
  dimension: DimensionKey
  title: string
  quotes: string[]
  practice: string
}

export interface DimensionDescription {
  key: DimensionKey
  name: string
  paliName: string
  shortDesc: string
  fullDesc: string
  examples: string[]
}

export interface EightfoldState {
  records: Record<string, DailyRecord>
  archive: Record<string, DailyRecord>
  reminders: ReminderItem[]
  currentDraft: Partial<Record<DimensionKey, DimensionScore>>
  draftDirty: boolean
  selectedDimension: DimensionKey
  hasCompletedOnboarding: boolean
  activeDate: string
}

export type {
  PeriodType,
  PeriodRange,
  PeriodSummary,
  CompareResult,
  HeatmapCell,
  InsightItem,
  StreakInfo,
  InsightTemplate,
  InsightConfig,
  DimensionAverage
} from './analytics'
