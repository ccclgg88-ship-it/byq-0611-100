import type { DimensionKey, ReminderItem } from '@/types'

export const DIMENSION_ORDER: DimensionKey[] = [
  'rightView',
  'rightThought',
  'rightSpeech',
  'rightAction',
  'rightLivelihood',
  'rightEffort',
  'rightMindfulness',
  'rightConcentration'
]

export const DIMENSION_NAMES: Record<DimensionKey, string> = {
  rightView: '正见',
  rightThought: '正思维',
  rightSpeech: '正语',
  rightAction: '正业',
  rightLivelihood: '正命',
  rightEffort: '正精进',
  rightMindfulness: '正念',
  rightConcentration: '正定'
}

export const DIMENSION_COLORS: Record<DimensionKey, string> = {
  rightView: '#c0392b',
  rightThought: '#e67e22',
  rightSpeech: '#d4a017',
  rightAction: '#529e66',
  rightLivelihood: '#2980b9',
  rightEffort: '#8e44ad',
  rightMindfulness: '#16a085',
  rightConcentration: '#2c3e50'
}

export const DEFAULT_REMINDERS: ReminderItem[] = [
  { key: 'morning_sutra', label: '早课诵经 30 分钟', dimension: 'rightEffort', checked: false, suggested: false },
  { key: 'evening_sutra', label: '晚课诵经回向', dimension: 'rightEffort', checked: false, suggested: false },
  { key: 'meditation', label: '静坐禅修 15 分钟', dimension: 'rightConcentration', checked: false, suggested: false },
  { key: 'mindfulness_breath', label: '每小时观呼吸一次', dimension: 'rightMindfulness', checked: false, suggested: false },
  { key: 'kind_speech', label: '今日只说柔软语', dimension: 'rightSpeech', checked: false, suggested: false },
  { key: 'no_killing', label: '慈心不杀，食素一日', dimension: 'rightAction', checked: false, suggested: false },
  { key: 'dana', label: '布施或随喜赞叹', dimension: 'rightAction', checked: false, suggested: false },
  { key: 'right_livelihood_reflection', label: '检视职业是否清净', dimension: 'rightLivelihood', checked: false, suggested: false },
  { key: 'contemplate_causality', label: '思惟因果因缘', dimension: 'rightView', checked: false, suggested: false },
  { key: 'metta', label: '慈心禅修', dimension: 'rightThought', checked: false, suggested: false }
]

export const STORAGE_KEYS = {
  RECORDS: 'eightfold_records',
  ARCHIVE: 'eightfold_archive',
  REMINDERS: 'eightfold_reminders',
  DRAFT: 'eightfold_draft',
  ONBOARDING: 'eightfold_onboarding',
  ACTIVE_DATE: 'eightfold_active_date'
} as const

export const MAX_RECORDS_DAYS = 365
export const ARCHIVE_BATCH_SIZE = 30
export const MIN_SAVE_DIMENSIONS = 4
export const AUTOSAVE_DEBOUNCE_MS = 500
export const TREND_DAYS = 30
export const WEEK_DAYS = 7

export const SCHEMA_VERSION = '1.0.0'
