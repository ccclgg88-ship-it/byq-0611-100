<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkPointComponent,
  MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DimensionKey } from '@/types'
import { DIMENSION_NAMES, DIMENSION_COLORS, DIMENSION_ORDER } from '@/constants'

use([LineChart, TitleComponent, TooltipComponent, GridComponent, MarkPointComponent, MarkLineComponent, CanvasRenderer])

interface Props {
  dates: string[]
  scores: (number | null)[]
  selectedDimension: DimensionKey
  weekAverage?: number
}

const props = withDefaults(defineProps<Props>(), {
  weekAverage: 0
})

const emit = defineEmits<{
  (e: 'changeDimension', key: DimensionKey): void
}>()

const option = computed(() => {
  const color = DIMENSION_COLORS[props.selectedDimension]
  const dimName = DIMENSION_NAMES[props.selectedDimension]

  const xData = props.dates.map(d => d.slice(5))

  const segments: { start: number; end: number }[] = []
  let segStart = -1
  props.scores.forEach((s, i) => {
    if (s !== null && segStart === -1) segStart = i
    if (s === null && segStart !== -1) {
      segments.push({ start: segStart, end: i - 1 })
      segStart = -1
    }
  })
  if (segStart !== -1) segments.push({ start: segStart, end: props.scores.length - 1 })

  const validScores = props.scores.filter(s => s !== null) as number[]
  const avg = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0

  const seriesData = props.scores.map(s => (s === null ? null : s))

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e8dcc8',
      textStyle: { color: '#2c1810', fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        if (p.value === null || p.value === undefined) {
          return `${p.axisValue}<br/><span style="color:#999">无记录</span>`
        }
        return `${p.axisValue}<br/><span style="color:${color};font-weight:600">${dimName}: ${p.value}</span>`
      }
    },
    grid: {
      top: 40,
      right: 20,
      bottom: 40,
      left: 48
    },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e8dcc8' } },
      axisLabel: {
        color: '#6b5344',
        fontSize: 11,
        interval: 3,
        rotate: 0
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      axisLine: { show: false },
      axisLabel: { color: '#6b5344', fontSize: 11 },
      splitLine: {
        lineStyle: {
          color: 'rgba(184, 134, 11, 0.12)',
          type: 'dashed'
        }
      }
    },
    markLine: avg > 0 ? {
      silent: true,
      symbol: 'none',
      lineStyle: { type: 'dashed', color: '#95a5a6', width: 1 },
      label: {
        formatter: `30日均: ${avg}`,
        color: '#95a5a6',
        fontSize: 11
      },
      data: [{ yAxis: avg }]
    } : undefined,
    series: [
      {
        name: dimName,
        type: 'line',
        connectNulls: false,
        data: seriesData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: {
          width: 2.5,
          color
        },
        itemStyle: {
          color,
          borderWidth: 2,
          borderColor: '#fff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}33` },
              { offset: 1, color: `${color}05` }
            ]
          }
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 44,
          label: { fontSize: 10, color: '#fff' },
          data: [
            { type: 'max', name: '最高' },
            { type: 'min', name: '最低' }
          ]
        }
      }
    ]
  }
})
</script>

<template>
  <div class="trend-chart">
    <div class="trend-header">
      <div class="dimension-selector">
        <button
          v-for="k in DIMENSION_ORDER"
          :key="k"
          class="dim-chip"
          :class="{ active: selectedDimension === k }"
          :style="{
            borderColor: selectedDimension === k ? DIMENSION_COLORS[k] : 'transparent',
            color: selectedDimension === k ? DIMENSION_COLORS[k] : '#6b5344',
            background: selectedDimension === k ? `${DIMENSION_COLORS[k]}14` : 'transparent'
          }"
          @click="emit('changeDimension', k)"
        >
          {{ DIMENSION_NAMES[k] }}
        </button>
      </div>
    </div>
    <VChart :option="option" autoresize style="width: 100%; height: 320px;" />
  </div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
}

.trend-header {
  margin-bottom: 8px;
}

.dimension-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 12px;
}

.dim-chip {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1.5px solid transparent;
  background: transparent;
  transition: all 0.2s;
}

.dim-chip:hover {
  transform: translateY(-1px);
  opacity: 0.85;
}
</style>
