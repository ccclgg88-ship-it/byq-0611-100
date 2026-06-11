import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  DailyRecord,
  DimensionKey,
  DimensionScore,
  ReminderItem,
  BackupData,
  WeekAverage
} from '@/types'
import {
  DIMENSION_ORDER,
  DEFAULT_REMINDERS,
  STORAGE_KEYS,
  MAX_RECORDS_DAYS,
  ARCHIVE_BATCH_SIZE,
  MIN_SAVE_DIMENSIONS,
  AUTOSAVE_DEBOUNCE_MS
} from '@/constants'
import {
  today,
  getRecentNDays,
  getWeekDates,
  sortDatesDesc,
  formatDate
} from '@/utils/date'
import {
  canSaveDraft,
  generateBackup,
  isValidBackupData,
  isValidDailyRecord
} from '@/utils/validation'

let autosaveTimer: ReturnType<typeof setTimeout> | null = null

export const useEightfoldStore = defineStore('eightfold', () => {
  const records = ref<Record<string, DailyRecord>>({})
  const archive = ref<Record<string, DailyRecord>>({})
  const reminders = ref<ReminderItem[]>(JSON.parse(JSON.stringify(DEFAULT_REMINDERS)))
  const currentDraft = ref<Partial<Record<DimensionKey, DimensionScore>>>({})
  const draftDirty = ref(false)
  const selectedDimension = ref<DimensionKey>('rightMindfulness')
  const hasCompletedOnboarding = ref(false)
  const activeDate = ref<string>(today())
  const initialized = ref(false)
  const trendDays = ref<7 | 30 | 90>(30)

  const currentDate = computed(() => activeDate.value)

  const todayRecord = computed<DailyRecord | null>(() => {
    return records.value[currentDate.value] || null
  })

  const mergedDraftWithSaved = computed<Partial<Record<DimensionKey, DimensionScore>>>(() => {
    const result: Partial<Record<DimensionKey, DimensionScore>> = {}
    const saved = todayRecord.value
    DIMENSION_ORDER.forEach(k => {
      if (currentDraft.value[k]) {
        result[k] = currentDraft.value[k]!
      } else if (saved?.[k]) {
        result[k] = saved[k]
      }
    })
    return result
  })

  const filledDimensionsCount = computed(() => {
    const d = mergedDraftWithSaved.value
    return DIMENSION_ORDER.filter(k => d[k] && (d[k]!.score ?? 0) > 0).length
  })

  const canSave = computed(() => filledDimensionsCount.value >= MIN_SAVE_DIMENSIONS)

  const lowestDimension = computed<{ key: DimensionKey; score: number } | null>(() => {
    const d = mergedDraftWithSaved.value
    let lowest: { key: DimensionKey; score: number } | null = null
    DIMENSION_ORDER.forEach(k => {
      const s = d[k]?.score
      if (s !== undefined && s > 0) {
        if (!lowest || s < lowest.score) {
          lowest = { key: k, score: s }
        }
      }
    })
    if (lowest) return lowest
    return { key: 'rightMindfulness', score: 0 }
  })

  const weekAverage = computed<WeekAverage>(() => {
    const dates = getWeekDates(currentDate.value)
    const result: WeekAverage = {}
    DIMENSION_ORDER.forEach(k => {
      const scores: number[] = []
      dates.forEach(d => {
        const r = records.value[d]
        const s = r?.[k]?.score
        if (s !== undefined && s > 0) scores.push(s)
      })
      if (scores.length > 0) {
        result[k] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
    })
    return result
  })

  const weekAverageOverall = computed<number>(() => {
    const vals = Object.values(weekAverage.value)
    if (vals.length === 0) return 0
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  })

  const trendData = computed<{
    dates: string[];
    scores: (number | null)[];
    ma7: (number | null)[];
    ma30: (number | null)[];
  }>(() => {
    const days = trendDays.value
    const dates = getRecentNDays(days, currentDate.value)
    const key = selectedDimension.value
    const scores = dates.map(d => {
      const r = records.value[d]
      const s = r?.[key]?.score
      return (s !== undefined && s > 0) ? s : null
    })

    const calcMA = (window: number): (number | null)[] => {
      return scores.map((_, idx) => {
        const start = Math.max(0, idx - window + 1)
        const slice = scores.slice(start, idx + 1)
        const valid = slice.filter(x => x !== null) as number[]
        if (valid.length < Math.min(3, window)) return null
        return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
      })
    }

    return {
      dates,
      scores,
      ma7: days >= 7 ? calcMA(7) : [],
      ma30: days >= 30 ? calcMA(30) : []
    }
  })

  function setTrendDays(days: 7 | 30 | 90) {
    trendDays.value = days
  }

  function init() {
    try {
      const rawRecords = localStorage.getItem(STORAGE_KEYS.RECORDS)
      if (rawRecords) {
        const parsed = JSON.parse(rawRecords)
        if (typeof parsed === 'object' && parsed !== null) {
          Object.values(parsed).forEach(r => {
            if (isValidDailyRecord(r)) {
              records.value[r.date] = r
            }
          })
        }
      }
      const rawArchive = localStorage.getItem(STORAGE_KEYS.ARCHIVE)
      if (rawArchive) {
        const parsed = JSON.parse(rawArchive)
        if (typeof parsed === 'object' && parsed !== null) {
          Object.values(parsed).forEach(r => {
            if (isValidDailyRecord(r)) {
              archive.value[r.date] = r
            }
          })
        }
      }
      const rawReminders = localStorage.getItem(STORAGE_KEYS.REMINDERS)
      if (rawReminders) {
        const parsed = JSON.parse(rawReminders)
        if (Array.isArray(parsed)) reminders.value = parsed
      }
      const rawDraft = localStorage.getItem(STORAGE_KEYS.DRAFT)
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft)
        if (typeof parsed === 'object' && parsed !== null) {
          currentDraft.value = parsed as Partial<Record<DimensionKey, DimensionScore>>
          draftDirty.value = Object.keys(currentDraft.value).length > 0
        }
      }
      const onboard = localStorage.getItem(STORAGE_KEYS.ONBOARDING)
      hasCompletedOnboarding.value = onboard === '1'
      const active = localStorage.getItem(STORAGE_KEYS.ACTIVE_DATE)
      if (active) activeDate.value = active

      enforceArchiveLimit()
    } catch (e) {
      console.warn('Failed to load from localStorage', e)
    }
    initialized.value = true
    startAutosaveWatch()
  }

  function startAutosaveWatch() {
    watch(
      () => JSON.stringify(currentDraft.value),
      () => {
        if (!initialized.value) return
        draftDirty.value = Object.keys(currentDraft.value).length > 0
        if (autosaveTimer) clearTimeout(autosaveTimer)
        autosaveTimer = setTimeout(() => {
          localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(currentDraft.value))
        }, AUTOSAVE_DEBOUNCE_MS)
      },
      { deep: true }
    )
    watch(
      reminders,
      () => {
        if (!initialized.value) return
        localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders.value))
      },
      { deep: true }
    )
  }

  function persistAll() {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records.value))
    localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archive.value))
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(currentDraft.value))
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, hasCompletedOnboarding.value ? '1' : '0')
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DATE, activeDate.value)
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders.value))
  }

  function enforceArchiveLimit() {
    const allDates = sortDatesDesc(Object.keys(records.value))
    if (allDates.length > MAX_RECORDS_DAYS) {
      const toArchive = allDates.slice(MAX_RECORDS_DAYS, MAX_RECORDS_DAYS + ARCHIVE_BATCH_SIZE)
      toArchive.forEach(date => {
        archive.value[date] = records.value[date]
        delete records.value[date]
      })
    }
  }

  function setDimensionScore(key: DimensionKey, score: number, note?: string) {
    const validated = Math.max(0, Math.min(100, Math.round(score)))
    const existing = currentDraft.value[key] || records.value[currentDate.value]?.[key]
    currentDraft.value[key] = {
      score: validated,
      note: note !== undefined ? note : existing?.note || ''
    }
    draftDirty.value = true
  }

  function setDimensionNote(key: DimensionKey, note: string) {
    const existing = currentDraft.value[key] || records.value[currentDate.value]?.[key]
    currentDraft.value[key] = {
      score: existing?.score ?? 0,
      note
    }
    draftDirty.value = true
  }

  function saveTodayRecord(): { ok: boolean; error?: string } {
    if (!canSave.value) {
      return {
        ok: false,
        error: `至少需要填写 ${MIN_SAVE_DIMENSIONS} 个维度（当前 ${filledDimensionsCount.value} 个）`
      }
    }
    const merged: DailyRecord = {} as DailyRecord
    const saved = records.value[currentDate.value]
    DIMENSION_ORDER.forEach(k => {
      const fromDraft = currentDraft.value[k]
      const fromSaved = saved?.[k]
      merged[k] = {
        score: fromDraft?.score ?? fromSaved?.score ?? 0,
        note: fromDraft?.note ?? fromSaved?.note ?? ''
      }
    })
    merged.date = currentDate.value
    merged.savedAt = new Date().toISOString()
    records.value[currentDate.value] = merged
    currentDraft.value = {}
    draftDirty.value = false
    updateSuggestedReminders()
    enforceArchiveLimit()
    persistAll()
    return { ok: true }
  }

  function revertDraft() {
    currentDraft.value = {}
    draftDirty.value = false
    localStorage.removeItem(STORAGE_KEYS.DRAFT)
  }

  function setActiveDate(date: string) {
    activeDate.value = date
    currentDraft.value = {}
    draftDirty.value = false
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DATE, date)
    localStorage.removeItem(STORAGE_KEYS.DRAFT)
  }

  function setSelectedDimension(key: DimensionKey) {
    selectedDimension.value = key
  }

  function completeOnboarding() {
    hasCompletedOnboarding.value = true
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, '1')
  }

  function toggleReminder(key: string) {
    const r = reminders.value.find(x => x.key === key)
    if (r) r.checked = !r.checked
  }

  function updateSuggestedReminders() {
    const lowest = lowestDimension.value
    if (!lowest) return
    const threshold = 60
    const lowKeys: DimensionKey[] = []
    DIMENSION_ORDER.forEach(k => {
      const s = mergedDraftWithSaved.value[k]?.score ?? 0
      if (s > 0 && s < threshold) lowKeys.push(k)
    })
    if (lowest.score < threshold && !lowKeys.includes(lowest.key)) {
      lowKeys.push(lowest.key)
    }
    reminders.value = reminders.value.map(r => ({
      ...r,
      suggested: lowKeys.includes(r.dimension) && !r.checked
    }))
  }

  function exportBackup(): BackupData {
    return generateBackup(records.value, archive.value, reminders.value)
  }

  function importBackup(data: unknown): { ok: boolean; errors: string[] } {
    const check = isValidBackupData(data)
    if (!check.valid) return { ok: false, errors: check.errors }
    const bd = data as BackupData
    const newRecords: Record<string, DailyRecord> = { ...records.value }
    const newArchive: Record<string, DailyRecord> = { ...archive.value }
    bd.records.forEach(r => {
      newRecords[r.date] = r
    })
    if (bd.archive) {
      bd.archive.forEach(r => {
        newArchive[r.date] = r
      })
    }
    records.value = newRecords
    archive.value = newArchive
    if (bd.reminders && Array.isArray(bd.reminders)) {
      reminders.value = bd.reminders
    }
    enforceArchiveLimit()
    persistAll()
    return { ok: true, errors: [] }
  }

  function deleteRecord(date: string): boolean {
    if (records.value[date]) {
      delete records.value[date]
      persistAll()
      return true
    }
    return false
  }

  function getAllRecordDates(): string[] {
    return sortDatesDesc(Object.keys(records.value))
  }

  function seedDemoData() {
    const base = today()
    for (let i = 0; i < 14; i++) {
      const d = formatDate(new Date(Date.now() - i * 86400000))
      if (i % 3 === 0 && i > 0) continue
      const r: DailyRecord = {} as DailyRecord
      DIMENSION_ORDER.forEach(k => {
        const base = 40 + Math.floor(Math.random() * 55)
        r[k] = {
          score: Math.max(0, Math.min(100, base + (i === 0 ? 10 : 0))),
          note: ''
        }
      })
      r.date = d
      r.savedAt = new Date(Date.now() - i * 3600000).toISOString()
      records.value[d] = r
    }
    persistAll()
  }

  return {
    records,
    archive,
    reminders,
    currentDraft,
    draftDirty,
    selectedDimension,
    hasCompletedOnboarding,
    activeDate,
    trendDays,
    currentDate,
    todayRecord,
    mergedDraftWithSaved,
    filledDimensionsCount,
    canSave,
    lowestDimension,
    weekAverage,
    weekAverageOverall,
    trendData,
    init,
    setDimensionScore,
    setDimensionNote,
    saveTodayRecord,
    revertDraft,
    setActiveDate,
    setSelectedDimension,
    setTrendDays,
    completeOnboarding,
    toggleReminder,
    updateSuggestedReminders,
    exportBackup,
    importBackup,
    deleteRecord,
    getAllRecordDates,
    persistAll,
    seedDemoData,
    enforceArchiveLimit
  }
})
