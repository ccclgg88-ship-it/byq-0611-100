import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEightfoldStore } from './eightfold'
import { DIMENSION_ORDER } from '@/constants'
import adviceData from '@/mock/advice.json'
import type { DimensionKey } from '@/types'

describe('业务需求验收测试', () => {
  beforeEach(() => {
    Storage.prototype.getItem = vi.fn(() => null)
    Storage.prototype.setItem = vi.fn()
    Storage.prototype.removeItem = vi.fn()
    setActivePinia(createPinia())
  })

  describe('八维度自评', () => {
    it('八个维度均可录入 0-100 分及可选心得', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.forEach((k, i) => {
        store.setDimensionScore(k, i * 12, `今日${k}实践`)
      })
      DIMENSION_ORDER.forEach((k, i) => {
        expect(store.mergedDraftWithSaved[k]?.score).toBe(i * 12)
        expect(store.mergedDraftWithSaved[k]?.note).toBe(`今日${k}实践`)
      })
    })

    it('分数自动钳制在 0-100', () => {
      const store = useEightfoldStore()
      store.init()
      store.setDimensionScore('rightView', 150)
      expect(store.currentDraft.rightView?.score).toBe(100)
      store.setDimensionScore('rightView', -10)
      expect(store.currentDraft.rightView?.score).toBe(0)
    })

    it('同一日多次提交覆盖更新', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.forEach((k, i) => store.setDimensionScore(k, 50 + i))
      store.saveTodayRecord()
      const first = store.todayRecord!.rightView.score

      store.setDimensionScore('rightView', 99)
      store.setDimensionScore('rightThought', 88)
      store.setDimensionScore('rightSpeech', 77)
      store.setDimensionScore('rightAction', 66)
      store.saveTodayRecord()

      expect(store.todayRecord!.rightView.score).toBe(99)
      expect(store.todayRecord!.rightThought.score).toBe(88)
      expect(Object.keys(store.records).length).toBe(1)
      expect(first).not.toBe(99)
    })
  })

  describe('数据流与联动', () => {
    it('修改滑块后 draftDirty 为 true，雷达图可区分未保存态', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.forEach((k, i) => store.setDimensionScore(k, 60 + i))
      store.saveTodayRecord()
      expect(store.draftDirty).toBe(false)

      store.setDimensionScore('rightMindfulness', 30)
      expect(store.draftDirty).toBe(true)
      expect(store.currentDraft.rightMindfulness?.score).toBe(30)
    })

    it('折线图近 30 天无数据日期返回 null（断点而非归零）', () => {
      const store = useEightfoldStore()
      store.init()
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const r = {} as any
      DIMENSION_ORDER.forEach((k, i) => { r[k] = { score: 70 + i, note: '' } })
      r.date = today
      r.savedAt = new Date().toISOString()
      store.records[today] = r

      store.setSelectedDimension('rightView')
      const { dates, scores } = store.trendData
      expect(dates.length).toBe(30)
      const todayIdx = dates.indexOf(today)
      const yesterdayIdx = dates.indexOf(yesterday)
      expect(scores[todayIdx]).toBe(70)
      expect(scores[yesterdayIdx]).toBeNull()
    })

    it('选中维度切换后折线图数据跟随变化', () => {
      const store = useEightfoldStore()
      store.init()
      const today = new Date().toISOString().slice(0, 10)
      const r = {} as any
      DIMENSION_ORDER.forEach((k, i) => { r[k] = { score: 50 + i * 5, note: '' } })
      r.date = today
      r.savedAt = new Date().toISOString()
      store.records[today] = r

      store.setSelectedDimension('rightView')
      const viewScore = store.trendData.scores[store.trendData.dates.indexOf(today)]
      store.setSelectedDimension('rightConcentration')
      const concScore = store.trendData.scores[store.trendData.dates.indexOf(today)]
      expect(viewScore).toBe(50)
      expect(concScore).toBe(85)
    })
  })

  describe('跨模块集成', () => {
    it('最低分维度可从 advice.json 映射到开示语', () => {
      const store = useEightfoldStore()
      store.init()
      store.setDimensionScore('rightView', 80)
      store.setDimensionScore('rightThought', 70)
      store.setDimensionScore('rightSpeech', 30)
      store.setDimensionScore('rightAction', 60)

      expect(store.lowestDimension?.key).toBe('rightSpeech')
      const advice = (adviceData as any[]).find(a => a.dimension === 'rightSpeech')
      expect(advice).toBeDefined()
      expect(advice.title).toBe('正语开示')
      expect(advice.quotes.length).toBeGreaterThan(0)
    })

    it('保存后低分维度自动建议勾选对应定课提醒项', () => {
      const store = useEightfoldStore()
      store.init()
      DIMENSION_ORDER.forEach((k, i) => {
        store.setDimensionScore(k, i === 2 ? 30 : 80)
      })
      store.saveTodayRecord()

      const suggested = store.reminders.filter(r => r.suggested)
      expect(suggested.length).toBeGreaterThan(0)
      expect(suggested.some(r => r.dimension === 'rightSpeech')).toBe(true)
    })

    it('八维 advice.json 覆盖全部维度', () => {
      const covered = new Set((adviceData as any[]).map(a => a.dimension))
      DIMENSION_ORDER.forEach(k => {
        expect(covered.has(k)).toBe(true)
      })
    })
  })
})
