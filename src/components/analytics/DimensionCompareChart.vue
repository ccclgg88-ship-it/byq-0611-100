<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { CompareResult } from '@/types/analytics'
import type { DimensionKey } from '@/types'
import { DIMENSION_NAMES, DIMENSION_ORDER, DIMENSION_COLORS } from '@/constants'

use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

interface Props {
  compareResult: CompareResult
  selectedDimension: DimensionKey | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'selectDimension', key: DimensionKey): void
}>()

const option = computed(() => {
  const dimNames = DIMENSION_ORDER.map(k => DIMENSION_NAMES[k])
  const curScores = DIMENSION_ORDER.map(k => props.compareResult.current.dimensionAverages[k])
  const prevScores = DIMENSION_ORDER.map(k => props.compareResult.previous.dimensionAverages[k])

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e8dcc8',
      textStyle: { color: '#2c1810', fontSize: 12 },
      formatter: (params: any[]) => {
        if (!params || params.length === 0) return ''
        const dimKey = DIMENSION_ORDER[params[0].dataIndex]
        const dimName = DIMENSION_NAMES[dimKey]
        const delta = props.compareResult.dimensionDeltas[dimKey]
        const deltaTxt = delta > 0 ? `+${delta}` : `${delta}`
        const deltaColor = delta > 0 ? '#27ae60' : delta < 0 ? '#e74c3c' : '#999'
        return `<div style="font-weight:600;margin-bottom:6px">${dimName}</div>
          <div>本期: <b>${curScores[params[0].dataIndex]}</b> 分</div>
          <div>上期: <b>${prevScores[params[0].dataIndex]}</b> 分</div>
          <div style="color:${deltaColor};margin-top:4px">变化: <b>${deltaTxt}</b> 分</div>`
      }
    },
    legend: {
      data: ['本期', '上期'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 12, color: '#6b5344' },
      itemWidth: 14,
      itemHeight: 10
    },
    grid: {
      top: 36,
      left: 40,
      right: 16,
      bottom: 28
    },
    xAxis: {
      type: 'category',
      data: dimNames,
      axisLine: { lineStyle: { color: '#e8dcc8' } },
      axisLabel: {
        color: '#6b5344',
        fontSize: 11,
        interval: 0,
        rotate: 25
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
    series: [
      {
        name: '本期',
        type: 'bar',
        data: curScores,
        barWidth: '35%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#d4a017' },
              { offset: 1, color: '#b8860b' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#e6c75a' },
                { offset: 1, color: '#d4a017' }
              ]
            }
          }
        }
      },
      {
        name: '上期',
        type: 'bar',
        data: prevScores,
        barWidth: '35%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#bdc3c7' },
              { offset: 1, color: '#95a5a6' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  }
})

const bestDimension = computed(() => {
  const dim = props.compareResult.current.bestDimension
  if (!dim) return null
  return { key: dim, name: DIMENSION_NAMES[dim], score: props.compareResult.current.dimensionAverages[dim] }
})

const worstDimension = computed(() => {
  const dim = props.compareResult.current.worstDimension
  if (!dim) return null
  return { key: dim, name: DIMENSION_NAMES[dim], score: props.compareResult.current.dimensionAverages[dim] }
})

const mostImproved = computed(() => {
  const m = props.compareResult.mostImproved
  if (!m) return null
  return { key: m.key, name: DIMENSION_NAMES[m.key], delta: m.delta }
})

function handleChartClick(params: any) {
  const idx = params?.dataIndex
  if (idx !== undefined && DIMENSION_ORDER[idx]) {
    emit('selectDimension', DIMENSION_ORDER[idx])
  }
}
</script>

<template>
  <div class="compare-chart">
    <div class="chart-side-layout">
      <div class="chart-area">
        <VChart
          :option="option"
          autoresize
          style="width: 100%; height: 280px;"
          @click="handleChartClick"
        />
      </div>
      <div class="side-cards">
        <div
          class="rank-card best"
          v-if="bestDimension"
          @click="emit('selectDimension', bestDimension.key)"
        >
          <div class="rk-label">🏆 最佳维度</div>
          <div class="rk-name">{{ bestDimension.name }}</div>
          <div class="rk-score">{{ bestDimension.score }} 分</div>
        </div>
        <div
          class="rank-card worst"
          v-if="worstDimension"
          @click="emit('selectDimension', worstDimension.key)"
        >
          <div class="rk-label">📉 待精进</div>
          <div class="rk-name">{{ worstDimension.name }}</div>
          <div class="rk-score">{{ worstDimension.score }} 分</div>
        </div>
        <div
          class="rank-card improved"
          v-if="mostImproved && mostImproved.delta > 0"
          @click="emit('selectDimension', mostImproved.key)"
        >
          <div class="rk-label">📈 进步最大</div>
          <div class="rk-name">{{ mostImproved.name }}</div>
          <div class="rk-score up">+{{ mostImproved.delta }} 分</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-chart {
  width: 100%;
}

.chart-side-layout {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 768px) {
  .chart-side-layout {
    grid-template-columns: 1fr;
  }
}

.chart-area {
  min-height: 280px;
}

.side-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-card {
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  border: 1px solid transparent;
}

.rank-card:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.rank-card.best {
  background: linear-gradient(135deg, #fff9e6, #fff3cc);
  border-color: rgba(212, 160, 23, 0.3);
}

.rank-card.worst {
  background: linear-gradient(135deg, #fff5f5, #ffe5e5);
  border-color: rgba(231, 76, 60, 0.2);
}

.rank-card.improved {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-color: rgba(39, 174, 96, 0.25);
}

.rk-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.rk-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 2px;
}

.rk-score {
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', Menlo, monospace;
  color: var(--color-primary);
}

.rk-score.up {
  color: var(--color-success);
}

.rank-card.worst .rk-score {
  color: var(--color-danger);
}
</style>
