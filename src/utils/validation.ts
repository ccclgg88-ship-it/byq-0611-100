import type { BackupData, DailyRecord, DimensionKey, DimensionScore } from '@/types'
import { DIMENSION_ORDER, SCHEMA_VERSION, MIN_SAVE_DIMENSIONS } from '@/constants'

export function isValidDimensionKey(key: string): key is DimensionKey {
  return DIMENSION_ORDER.includes(key as DimensionKey)
}

export function isValidScore(score: unknown): score is number {
  return typeof score === 'number' && score >= 0 && score <= 100 && !Number.isNaN(score)
}

export function isValidDateString(date: string): boolean {
  if (typeof date !== 'string') return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false
  const d = new Date(date)
  return d instanceof Date && !Number.isNaN(d.getTime())
}

export function isValidDimensionScore(obj: unknown): obj is DimensionScore {
  if (typeof obj !== 'object' || obj === null) return false
  const s = obj as DimensionScore
  return isValidScore(s.score) && (s.note === undefined || typeof s.note === 'string')
}

export function isValidDailyRecord(obj: unknown): obj is DailyRecord {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as DailyRecord
  if (!isValidDateString(r.date)) return false
  if (typeof r.savedAt !== 'string') return false
  return DIMENSION_ORDER.every(k => isValidDimensionScore(r[k]))
}

export function isValidBackupData(obj: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (typeof obj !== 'object' || obj === null) {
    return { valid: false, errors: ['备份数据格式错误：不是对象'] }
  }
  const data = obj as BackupData
  if (typeof data.version !== 'string') {
    errors.push('缺少 version 字段')
  }
  if (typeof data.exportedAt !== 'string') {
    errors.push('缺少 exportedAt 字段')
  }
  if (!Array.isArray(data.records)) {
    errors.push('records 字段应为数组')
  } else {
    data.records.forEach((r, i) => {
      if (!isValidDailyRecord(r)) {
        errors.push(`records[${i}] 格式不正确`)
      }
    })
  }
  if (data.archive !== undefined) {
    if (!Array.isArray(data.archive)) {
      errors.push('archive 字段应为数组')
    } else {
      data.archive.forEach((r, i) => {
        if (!isValidDailyRecord(r)) {
          errors.push(`archive[${i}] 格式不正确`)
        }
      })
    }
  }
  return { valid: errors.length === 0, errors }
}

export function canSaveDraft(
  draft: Partial<Record<DimensionKey, DimensionScore>>
): { ok: boolean; filled: number } {
  const filled = DIMENSION_ORDER.filter(k => {
    const d = draft[k]
    return d !== undefined && isValidScore(d.score) && d.score > 0
  }).length
  return { ok: filled >= MIN_SAVE_DIMENSIONS, filled }
}

export function generateBackup(
  recordsMap: Record<string, DailyRecord>,
  archiveMap: Record<string, DailyRecord>,
  reminders: unknown
): BackupData {
  return {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: Object.values(recordsMap).sort((a, b) => a.date.localeCompare(b.date)),
    archive: Object.values(archiveMap).sort((a, b) => a.date.localeCompare(b.date)),
    reminders: Array.isArray(reminders) ? (reminders as BackupData['reminders']) : undefined
  }
}
