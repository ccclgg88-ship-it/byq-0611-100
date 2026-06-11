import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PeriodType, CompareResult, HeatmapCell, InsightItem } from '@/types/analytics'
import type { DailyRecord, DimensionKey } from '@/types'
import { useEightfoldStore } from './eightfold'
import {
  getPeriodRange,
  getPreviousPeriodRange,
  calculatePeriodSummary,
  calculateCompareResult,
  generateHeatmapData,
  getCheckinRate
} from '@/utils/analytics'
import { today, subtractDays } from '@/utils/date'
import { DIMENSION_NAMES, DIMENSION_ORDER } from '@/constants'
import insightsData from '@/mock/insights.json'

export const useAnalyticsStore = defineStore('analytics', () => {
  const periodType = ref<PeriodType>('week')
  const refDate = ref<string>(today())
  const selectedDimension = ref<DimensionKey | null>(null)
  const isDrawerOpen = ref(false)

  const eightfoldStore = useEightfoldStore()

  const currentPeriod = computed(() => getPeriodRange(periodType.value, refDate.value))
  const previousPeriod = computed(() => getPreviousPeriodRange(periodType.value, refDate.value))

  const currentSummary = computed(() =>
    calculatePeriodSummary(
      eightfoldStore.records,
      eightfoldStore.archive,
      currentPeriod.value.start,
      currentPeriod.value.end
    )
  )

  const previousSummary = computed(() =>
    calculatePeriodSummary(
      eightfoldStore.records,
      eightfoldStore.archive,
      previousPeriod.value.start,
      previousPeriod.value.end
    )
  )

  const compareResult = computed<CompareResult>(() =>
    calculateCompareResult(currentSummary.value, previousSummary.value)
  )

  const heatmapCells = computed<HeatmapCell[]>(() => {
    let days: number
    switch (periodType.value) {
      case 'week': days = 84; break
      case 'month': days = 90; break
      case 'last30': days = 42; break
      default: days = 84
    }
    const startDate = subtractDays(refDate.value, days - 1)
    const sundayStart = getSundayBefore(startDate)
    const end = refDate.value

    const cells = generateHeatmapData(
      eightfoldStore.records,
      eightfoldStore.archive,
      sundayStart,
      end
    )
    return cells
  })

  const insights = computed<InsightItem[]>(() => {
    const items: InsightItem[] = []
    const result = compareResult.value
    const curr = result.current
    const insights = insightsData as any

    const seed = curr.validDays + curr.overallAverage
    const pick = <T>(arr: T[]): T => arr[seed % arr.length]

    items.push({
      id: 'greeting',
      type: 'encouragement',
      title: '本期概览',
      content: pick(insights.general.greeting) +
        ` 本期共 ${curr.validDays} 个有效记录日，总均分 ${curr.overallAverage} 分。`,
      icon: '📜'
    })

    if (curr.worstDimension) {
      const dimName = DIMENSION_NAMES[curr.worstDimension]
      const templates = insights.dimensions[curr.worstDimension]?.low || ['建议加强此维度的修习。']
      items.push({
        id: 'worst',
        type: 'tip',
        title: `待精进：${dimName}`,
        content: pick(templates) +
          ` 本期均分 ${curr.dimensionAverages[curr.worstDimension]} 分。`,
        icon: '💡'
      })
    }

    if (result.mostImproved && result.mostImproved.delta > 0) {
      const dimName = DIMENSION_NAMES[result.mostImproved.key]
      const templates = insights.dimensions[result.mostImproved.key]?.improving || ['有进步，继续保持！']
      items.push({
        id: 'improved',
        type: 'achievement',
        title: `进步最大：${dimName}`,
        content: pick(templates) +
          ` 较上期提升 ${result.mostImproved.delta} 分。`,
        icon: '📈'
      })
    }

    if (result.hasEnoughData && result.overallDelta !== 0) {
      const isUp = result.overallDelta > 0
      items.push({
        id: 'trend',
        type: isUp ? 'achievement' : 'warning',
        title: `整体趋势 ${isUp ? '上升' : '下滑'}`,
        content: `本期总均分 ${curr.overallAverage} 分，较上期${isUp ? '上升' : '下降'} ${Math.abs(result.overallDelta)} 分（${isUp ? '+' : ''}${result.overallDeltaPercent}%）。${
          isUp ? '随喜你的进步，继续保持！' : '别气馁，调整节奏，重新出发。'
        }`,
        icon: isUp ? '📈' : '📉'
      })
    }

    const streakKey = curr.streakCurrent === 0 ? 'break'
      : curr.streakCurrent >= 30 ? 'record'
        : curr.streakCurrent >= 7 ? 'normal' : 'new'
    const streakTemplates = insights.streak[streakKey] || insights.streak.normal

    items.push({
      id: 'streak',
      type: 'encouragement',
      title: `当前连续打卡 ${curr.streakCurrent} 天`,
      content: pick(streakTemplates) + ` 区间最佳 ${curr.streakBest} 天。`,
      icon: '🔥'
    })

    const balanceKey = curr.balanceScore >= 80 ? 'high'
      : curr.balanceScore >= 50 ? 'medium' : 'low'
    const balanceTemplates = insights.balance[balanceKey]

    items.push({
      id: 'balance',
      type: balanceKey === 'high' ? 'achievement' : balanceKey === 'low' ? 'warning' : 'tip',
      title: `平衡度指数 ${curr.balanceScore}`,
      content: pick(balanceTemplates),
      icon: '⚖️'
    })

    return items
  })

  const monthCheckinRate = computed<number | null>(() => {
    if (periodType.value !== 'month') return null
    return getCheckinRate(currentSummary.value.validDays, currentSummary.value.totalDays)
  })

  function setPeriodType(type: PeriodType) {
    periodType.value = type
    selectedDimension.value = null
  }

  function setSelectedDimension(key: DimensionKey | null) {
    selectedDimension.value = key
  }

  function openDrawer() {
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
  }

  function getSundayBefore(dateStr: string): string {
    const d = new Date(dateStr)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dayStr = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dayStr}`
  }

  return {
    periodType,
    refDate,
    selectedDimension,
    isDrawerOpen,
    currentPeriod,
    previousPeriod,
    currentSummary,
    previousSummary,
    compareResult,
    heatmapCells,
    insights,
    monthCheckinRate,
    setPeriodType,
    setSelectedDimension,
    openDrawer,
    closeDrawer
  }
})
