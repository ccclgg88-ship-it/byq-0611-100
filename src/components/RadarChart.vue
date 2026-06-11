<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { RadarChart as EChartsRadar } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DimensionKey, DimensionScore } from '@/types'
import { DIMENSION_ORDER, DIMENSION_NAMES, DIMENSION_COLORS } from '@/constants'

use([EChartsRadar, TitleComponent, TooltipComponent, LegendComponent, RadarComponent, CanvasRenderer])

interface Props {
  savedData?: Partial<Record<DimensionKey, DimensionScore>>
  draftData?: Partial<Record<DimensionKey, DimensionScore>>
  weekAverage?: Record<string, number>
  highlightKey?: DimensionKey | null
}

const props = withDefaults(defineProps<Props>(), {
  savedData: () => ({}),
  draftData: () => ({}),
  weekAverage: () => ({}),
  highlightKey: null
})

const option = computed(() => {
  const indicators = DIMENSION_ORDER.map(k => ({
    name: DIMENSION_NAMES[k],
    max: 100,
    color: props.highlightKey === k ? DIMENSION_COLORS[k] : undefined
  }))

  const series = []

  if (Object.keys(props.weekAverage).length > 0) {
    series.push({
      name: '周均分',
      value: DIMENSION_ORDER.map(k => props.weekAverage[k] ?? 0),
      symbol: 'none',
      lineStyle: {
        type: 'dashed',
        color: '#95a5a6',
        width: 1,
        opacity: 0.6
      },
      areaStyle: {
        color: 'rgba(149, 165, 166, 0.1)'
      },
      itemStyle: { color: '#95a5a6' }
    })
  }

  const hasSaved = DIMENSION_ORDER.some(k => props.savedData[k] && props.savedData[k]!.score > 0)
  if (hasSaved) {
    series.push({
      name: '已保存',
      value: DIMENSION_ORDER.map(k => props.savedData[k]?.score ?? 0),
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color: DIMENSION_COLORS.rightEffort,
        width: 2
      },
      areaStyle: {
        color: 'rgba(142, 68, 173, 0.15)'
      },
      itemStyle: { color: DIMENSION_COLORS.rightEffort }
    })
  }

  const hasDraft = DIMENSION_ORDER.some(k => props.draftData[k] && props.draftData[k]!.score > 0)
  if (hasDraft) {
    series.push({
      name: '未保存',
      value: DIMENSION_ORDER.map(k => props.draftData[k]?.score ?? 0),
      symbol: 'diamond',
      symbolSize: 7,
      lineStyle: {
        type: [6, 4],
        color: DIMENSION_COLORS.rightConcentration,
        width: 2.5
      },
      areaStyle: {
        color: 'rgba(44, 62, 80, 0.1)'
      },
      itemStyle: { color: DIMENSION_COLORS.rightConcentration }
    })
  }

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8dcc8',
      textStyle: { color: '#2c1810' }
    },
    legend: {
      show: series.length > 1,
      bottom: 0,
      textStyle: { color: '#6b5344', fontSize: 12 },
      itemGap: 16
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      center: ['50%', '50%'],
      radius: '65%',
      axisName: {
        color: '#6b5344',
        fontSize: 13,
        fontWeight: 500
      },
      splitLine: {
        lineStyle: {
          color: ['rgba(184, 134, 11, 0.08)', 'rgba(184, 134, 11, 0.15)', 'rgba(184, 134, 11, 0.22)', 'rgba(184, 134, 11, 0.3)']
        }
      },
      splitArea: {
        areaStyle: {
          color: [
            'rgba(253, 248, 239, 0.3)',
            'rgba(253, 248, 239, 0.5)'
          ]
        }
      },
      axisLine: {
        lineStyle: { color: 'rgba(184, 134, 11, 0.3)' }
      }
    },
    series: [
      {
        type: 'radar',
        emphasis: { lineStyle: { width: 4 } },
        data: series
      }
    ]
  }
})
</script>

<template>
  <div class="radar-wrapper">
    <VChart :option="option" autoresize style="width: 100%; height: 380px;" />
  </div>
</template>

<style scoped>
.radar-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
