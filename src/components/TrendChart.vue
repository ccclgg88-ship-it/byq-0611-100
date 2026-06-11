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
  MarkLineComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { DimensionKey } from '@/types'
import { DIMENSION_NAMES, DIMENSION_COLORS, DIMENSION_ORDER } from '@/constants'

use([
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  MarkPointComponent,
  MarkLineComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer
])

interface Props {
  dates: string[]
  scores: (number | null)[]
  ma7?: (number | null)[]
  ma30?: (number | null)[]
  selectedDimension: DimensionKey
  weekAverage?: number
  trendDays?: 7 | 30 | 90
}

const props = withDefaults(defineProps<Props>(), {
  weekAverage: 0,
  ma7: () => [],
  ma30: () => [],
  trendDays: 30
})

const emit = defineEmits<{
  (e: 'changeDimension', key: DimensionKey): void
  (e: 'changeTrendDays', days: 7 | 30 | 90): void
}>()

const dayOptions: { label: string; value: 7 | 30 | 90 }[] = [
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
  { label: '近90天', value: 90 }
]

const option = computed(() => {
  const color = DIMENSION_COLORS[props.selectedDimension]
  const dimName = DIMENSION_NAMES[props.selectedDimension]
  const days = props.trendDays
  const showMA7 = days >= 7 && props.ma7.length > 0
  const showMA30 = days >= 30 && props.ma30.length > 0

  const xData = props.dates.map(d => d.slice(5))
  const validScores = props.scores.filter(s => s !== null) as number[]
  const avg = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0
  const hasEnoughData = validScores.length >= 2

  const series: any[] = [
    {
      name: dimName,
      type: 'line',
      connectNulls: false,
      data: props.scores,
      smooth: false,
      symbol: 'circle',
      symbolSize: 7,
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
            { offset: 0, color: `${color}2e` },
            { offset: 1, color: `${color}03` }
          ]
        }
      },
      markLine: avg > 0 ? {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#95a5a6', width: 1 },
        label: {
          formatter: `平均: ${avg}`,
          color: '#95a5a6',
          fontSize: 11,
          position: 'insideEndTop'
        },
        data: [{ yAxis: avg }]
      } : undefined,
      markPoint: hasEnoughData ? {
        symbol: 'pin',
        symbolSize: 42,
        label: { fontSize: 10, color: '#fff' },
        data: [
          { type: 'max', name: '最高' },
          { type: 'min', name: '最低' }
        ]
      } : undefined
    }
  ]

  if (showMA7) {
    series.push({
      name: '7日均线',
      type: 'line',
      connectNulls: true,
      data: props.ma7,
      smooth: true,
      symbol: 'none',
      showSymbol: false,
      lineStyle: {
        width: 2,
        color: '#e67e22',
        type: 'dashed'
      },
      itemStyle: { color: '#e67e22' },
      emphasis: { focus: 'series' }
    })
  }

  if (showMA30) {
    series.push({
      name: '30日均线',
      type: 'line',
      connectNulls: true,
      data: props.ma30,
      smooth: true,
      symbol: 'none',
      showSymbol: false,
      lineStyle: {
        width: 2,
        color: '#27ae60',
        type: 'dotted'
      },
      itemStyle: { color: '#27ae60' },
      emphasis: { focus: 'series' }
    })
  }

  const interval = days === 7 ? 0 : days === 30 ? 3 : 8

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e8dcc8',
      borderWidth: 1,
      textStyle: { color: '#2c1810', fontSize: 12 },
      axisPointer: {
        lineStyle: { color: color + '66', width: 1.5, type: 'dashed' },
        label: {
          backgroundColor: color,
          color: '#fff',
          borderRadius: 4,
          fontSize: 11
        }
      },
      formatter: (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const lines: string[] = [`<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`]
        params.forEach((p: any) => {
          if (p.value === null || p.value === undefined) {
            lines.push(`<div style="color:#aaa;padding:2px 0">${p.marker}${p.seriesName}: 无记录</div>`)
          } else {
            const dotColor = p.seriesName === dimName ? color : p.color
            lines.push(`<div style="padding:2px 0"><span style="display:inline-block;margin-right:6px">●</span><span style="font-weight:500">${p.seriesName}</span>: <b style="color:${dotColor}">${p.value}</b></div>`)
          }
        })
        return lines.join('')
      }
    },
    legend: {
      show: showMA7 || showMA30,
      top: 2,
      right: 10,
      textStyle: { fontSize: 11, color: '#6b5344' },
      itemWidth: 18,
      itemHeight: 10
    },
    grid: {
      top: 36,
      right: 20,
      bottom: 50,
      left: 48
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomLock: false
      }
    ],
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e8dcc8' } },
      axisLabel: {
        color: '#6b5344',
        fontSize: 11,
        interval: interval,
        rotate: days === 90 ? 35 : 0,
        margin: 10
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
          color: 'rgba(184, 134, 11, 0.1)',
          type: 'dashed'
        }
      }
    },
    series
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
      <div class="trend-day-selector">
        <button
          v-for="opt in dayOptions"
          :key="opt.value"
          class="day-chip"
          :class="{ active: trendDays === opt.value }"
          @click="emit('changeTrendDays', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <VChart :option="option" autoresize style="width: 100%; height: 340px;" />
    <div v-if="weekAverage" class="trend-footer">
      <span class="ma-tag">📊 本周均：<b>{{ weekAverage }}</b></span>
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
}

.trend-header {
  margin-bottom: 4px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.dimension-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 12px;
  flex: 1;
}

.dim-chip {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1.5px solid transparent;
  background: transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.dim-chip:hover {
  transform: translateY(-1px);
  opacity: 0.85;
}

.trend-day-selector {
  display: flex;
  background: var(--color-bg);
  border-radius: 20px;
  padding: 3px;
  margin-bottom: 8px;
}

.day-chip {
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  transition: all 0.2s;
  cursor: pointer;
}

.day-chip.active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 1px 4px rgba(184, 134, 11, 0.3);
}

.day-chip:hover:not(.active) {
  color: var(--color-text);
}

.trend-footer {
  display: flex;
  justify-content: center;
  padding-top: 8px;
  border-top: 1px dashed var(--color-border);
  margin-top: 8px;
}

.ma-tag {
  font-size: 12px;
  color: var(--color-text-muted);
}

.ma-tag b {
  color: var(--color-primary);
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 14px;
  margin: 0 2px;
}
</style>
