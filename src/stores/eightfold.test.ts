import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEightfoldStore } from './eightfold'
import type { DailyRecord, DimensionKey } from '@/types'
import { DIMENSION_ORDER, MIN_SAVE_DIMENSIONS } from '@/constants'

describe('Eightfold Store - 核心功能测试', () => {
  beforeEach(() => {
    Storage.prototype.getItem = vi.fn(() => null)
    Storage.prototype.setItem = vi.fn()
    Storage.prototype.removeItem = vi.fn()
    Storage.prototype.clear = vi.fn()
    setActivePinia(createPinia())
  })

  describe('1. 保存校验 & 写入逻辑', () => {
    it('少于 MIN_SAVE_DIMENSIONS 个维度时保存失败', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.slice(0, MIN_SAVE_DIMENSIONS - 1).forEach((k, i) => {
        store.setDimensionScore(k, 60 + i * 5)
      })
      expect(store.canSave).toBe(false)
      expect(store.filledDimensionsCount).toBe(MIN_SAVE_DIMENSIONS - 1)
      const result = store.saveTodayRecord()
      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('达到 MIN_SAVE_DIMENSIONS 个维度时保存成功，同日多次提交覆盖', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.slice(0, MIN_SAVE_DIMENSIONS).forEach((k, i) => {
        store.setDimensionScore(k, 50 + i * 5)
      })
      const res1 = store.saveTodayRecord()
      expect(res1.ok).toBe(true)
      expect(store.todayRecord).not.toBeNull()
      const firstSavedAt = store.todayRecord!.savedAt

      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)

      store.setDimensionScore('rightView', 99)
      store.setDimensionScore('rightMindfulness', 88)
      const res2 = store.saveTodayRecord()
      expect(res2.ok).toBe(true)
      expect(store.todayRecord!.rightView.score).toBe(99)
      expect(store.todayRecord!.rightMindfulness.score).toBe(88)
      expect(Object.keys(store.records).length).toBe(1)
      expect(store.todayRecord!.savedAt).not.toBe(firstSavedAt)

      vi.useRealTimers()
    })

    it('草稿可撤销，撤销后数据回归已保存状态', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.forEach(k => store.setDimensionScore(k, 70))
      store.saveTodayRecord()
      expect(store.todayRecord!.rightView.score).toBe(70)

      store.setDimensionScore('rightView', 95)
      expect(store.draftDirty).toBe(true)
      expect(store.currentDraft.rightView?.score).toBe(95)
      store.revertDraft()
      expect(store.draftDirty).toBe(false)
      expect(store.currentDraft.rightView).toBeUndefined()
      expect(store.todayRecord!.rightView.score).toBe(70)
    })
  })

  describe('2. 周均分算法（无记录日不参与计算）', () => {
    it('正确计算 7 日内有效记录的各维算术平均', () => {
      const store = useEightfoldStore()
      store.init()
      const now = new Date()
      const dates = []
      for (let i = 0; i < 14; i++) {
        dates.push(new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10))
      }

      function makeRecord(date: string, overrides: Partial<Record<DimensionKey, number>> = {}) {
        const r = {} as DailyRecord
        DIMENSION_ORDER.forEach(k => {
          r[k] = { score: overrides[k] ?? 0, note: '' }
        })
        r.date = date
        r.savedAt = new Date().toISOString()
        return r
      }

      store.records[dates[0]] = makeRecord(dates[0], {
        rightView: 80,
        rightMindfulness: 90,
        rightSpeech: 70,
        rightAction: 60
      })
      store.records[dates[2]] = makeRecord(dates[2], {
        rightView: 60,
        rightMindfulness: 70,
        rightSpeech: 50,
        rightConcentration: 100
      })
      store.records[dates[5]] = makeRecord(dates[5], {
        rightView: 100,
        rightMindfulness: 50,
        rightEffort: 80,
        rightAction: 90
      })
      store.records[dates[10]] = makeRecord(dates[10], {
        rightView: 10,
        rightMindfulness: 10
      })

      const wa = store.weekAverage
      expect(wa.rightView).toBe(Math.round((80 + 60 + 100) / 3))
      expect(wa.rightMindfulness).toBe(Math.round((90 + 70 + 50) / 3))
      expect(wa.rightSpeech).toBe(Math.round((70 + 50) / 2))
      expect(wa.rightConcentration).toBe(100)
      expect(wa.rightLivelihood).toBeUndefined()
      expect(Object.keys(wa)).not.toContain('rightLivelihood')
    })

    it('7 日全空时 weekAverageOverall 为 0 且 weekAverage 为空对象', () => {
      const store = useEightfoldStore()
      store.init()
      expect(store.weekAverageOverall).toBe(0)
      expect(Object.keys(store.weekAverage).length).toBe(0)
    })
  })

  describe('3. 历史记录上限 & 归档逻辑', () => {
    it('超过 365 天记录时，自动将最早 30 天移至 archive', () => {
      const store = useEightfoldStore()
      store.init()
      const base = new Date('2025-06-11')
      for (let i = 0; i < 380; i++) {
        const d = new Date(base.getTime() - i * 86400000)
        const dateStr = d.toISOString().slice(0, 10)
        const r = {} as DailyRecord
        DIMENSION_ORDER.forEach(k => {
          r[k] = { score: 70, note: '' }
        })
        r.date = dateStr
        r.savedAt = d.toISOString()
        store.records[dateStr] = r
      }

      const beforeArchiveCount = Object.keys(store.records).length
      const beforeArchiveKeys = Object.keys(store.archive).length
      expect(beforeArchiveCount).toBe(380)

      store.enforceArchiveLimit()
      const afterRecordCount = Object.keys(store.records).length
      const afterArchiveCount = Object.keys(store.archive).length
      expect(afterRecordCount).toBeLessThanOrEqual(365)
      const overflow = beforeArchiveCount - 365
      expect(afterArchiveCount).toBeGreaterThanOrEqual(Math.min(overflow, 30))
      expect(beforeArchiveKeys + afterArchiveCount).toBe(afterArchiveCount)
      expect(Object.keys(store.records).sort().reverse()[0]).toBe('2025-06-11')
      const earliestRecord = Object.keys(store.records).sort()[0]
      const latestArchive = Object.keys(store.archive).sort().reverse()[0]
      expect(latestArchive < earliestRecord).toBe(true)
    })

    it('保存时自动触发归档检查', () => {
      const store = useEightfoldStore()
      store.init()
      const base = new Date()
      for (let i = 0; i < 366; i++) {
        const d = new Date(base.getTime() - (i + 1) * 86400000)
        const dateStr = d.toISOString().slice(0, 10)
        const r = {} as DailyRecord
        DIMENSION_ORDER.forEach(k => {
          r[k] = { score: 60, note: '' }
        })
        r.date = dateStr
        r.savedAt = d.toISOString()
        store.records[dateStr] = r
      }
      expect(Object.keys(store.records).length).toBe(366)

      DIMENSION_ORDER.forEach((k, i) => store.setDimensionScore(k, 50 + i))
      store.saveTodayRecord()

      expect(Object.keys(store.records).length).toBeLessThanOrEqual(365)
      expect(Object.keys(store.archive).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('4. 额外：导入导出备份校验', () => {
    it('正确拒绝 schema 错误的导入数据', () => {
      const store = useEightfoldStore()
      store.init()
      const badData1 = { version: 'x' }
      const r1 = store.importBackup(badData1)
      expect(r1.ok).toBe(false)
      expect(r1.errors.length).toBeGreaterThan(0)

      const badData2 = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records: [{ foo: 'bar' }]
      }
      const r2 = store.importBackup(badData2)
      expect(r2.ok).toBe(false)
      expect(r2.errors.some(e => e.includes('records[0]'))).toBe(true)
    })

    it('成功导入后可正确读取并计算周均分', () => {
      const store = useEightfoldStore()
      store.init()
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      function mk(d: string) {
        const r = {} as DailyRecord
        DIMENSION_ORDER.forEach((k, i) => {
          r[k] = { score: 50 + i * 5, note: '' }
        })
        r.date = d
        r.savedAt = new Date().toISOString()
        return r
      }
      const goodData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records: [mk(today), mk(yesterday)]
      }
      const res = store.importBackup(goodData)
      expect(res.ok).toBe(true)
      expect(Object.keys(store.records).length).toBe(2)
      expect(store.weekAverage.rightView).toBe(50)
    })
  })
})
