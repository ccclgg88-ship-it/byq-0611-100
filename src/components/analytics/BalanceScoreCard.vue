<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { GaugeChart, RadarChart } from 'echarts/charts'
import {
  TooltipComponent,
  RadarComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { PeriodSummary } from '@/types/analytics'
import type { DimensionKey } from '@/types'
import { DIMENSION_NAMES, DIMENSION_ORDER } from '@/constants'
import insightsData from '@/mock/insights.json'

use([GaugeChart, RadarChart, TooltipComponent, RadarComponent, CanvasRenderer])

interface Props {
  summary: PeriodSummary
}

const props = defineProps<Props>()

const balanceLevel = computed(() => {
  const s = props.summary.balanceScore
  if (s >= 80) return 'high'
  if (s >= 50) return 'medium'
  return 'low'
})

const balanceComment = computed(() => {
  const templates = (insightsData as any).balance[balanceLevel.value] || []
  const idx = props.summary.balanceScore % Math.max(templates.length, 1)
  return templates[idx] || '继续保持平衡发展。'
})

const gaugeOption = computed(() => ({
  series: [{
    type: 'gauge',
    startAngle: 225,
    endAngle: -45,
    min: 0,
    max: 100,
    splitNumber: 4,
    radius: '90%',
    center: ['50%', '58%'],
    axisLine: {
      lineStyle: {
        width: 10,
        color: [
          [0.3, '#e74c3c'],
          [0.6, '#f39c12'],
          [0.85, '#f1c40f'],
          [1, '#27ae60']
        ]
      }
    },
    pointer: {
      icon: 'path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.82902,732.64767 2083.82902,729.03114 L2083.82902,729.03114 L2088.28741,617.588173 C2088.33216,616.469254 2089.25228,615.30999 2090.36389,615.30999 Z',
      length: '70%',
      width: 8,
      offsetCenter: [0, '5%'],
      itemStyle: {
        color: '#b8860b'
      }
    },
    axisTick: {
      length: 6,
      lineStyle: {
        color: 'rgba(184, 134, 11, 0.3)',
        width: 1
      }
    },
    splitLine: {
      length: 10,
      lineStyle: {
        color: 'rgba(184, 134, 11, 0.4)',
        width: 2
      }
    },
    axisLabel: {
      color: '#999',
      fontSize: 10,
      distance: -18
    },
    title: {
      show: false
    },
    detail: {
      valueAnimation: true,
      formatter: '{value}',
      color: '#b8860b',
      fontSize: 28,
      fontWeight: 700,
      offsetCenter: [0, '35%'],
      fontFamily: 'SF Mono, Menlo, monospace'
    },
    data: [{ value: props.summary.balanceScore }]
  }]
}))

const radarOption = computed(() => {
  const indicators = DIMENSION_ORDER.map(k => ({
    name: DIMENSION_NAMES[k],
    max: 100
  }))
  const values = DIMENSION_ORDER.map(k => props.summary.dimensionAverages[k])

  return {
    radar: {
      indicator: indicators,
      radius: '68%',
      center: ['50%', '52%'],
      splitNumber: 3,
      axisName: {
        color: '#6b5344',
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(184, 134, 11, 0.2)'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255, 248, 230, 0.5)', 'rgba(255, 248, 230, 0.3)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(184, 134, 11, 0.3)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '本期均分',
        areaStyle: {
          color: 'rgba(212, 160, 23, 0.35)'
        },
        lineStyle: {
          color: '#d4a017',
          width: 2
        },
        itemStyle: {
          color: '#b8860b'
        }
      }]
    }]
  }
})

const largestGap = computed(() => {
  const dims: { key: DimensionKey; score: number }[] = DIMENSION_ORDER
    .map(k => ({ key: k, score: props.summary.dimensionAverages[k] }))
    .filter(d => d.score > 0)

  if (dims.length < 2) return null

  const sorted = [...dims].sort((a, b) => b.score - a.score)
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]

  if (highest.score - lowest.score < 15) return null

  return {
    high: { key: highest.key, name: DIMENSION_NAMES[highest.key], score: highest.score },
    low: { key: lowest.key, name: DIMENSION_NAMES[lowest.key], score: lowest.score }
  }
})
</script>

<template>
  <div class="balance-card">
    <div class="card-header">
      <h3 class="card-title">⚖️ 八维平衡度</h3>
      <span class="level-badge" :class="balanceLevel">
        {{ balanceLevel === 'high' ? '优秀' : balanceLevel === 'medium' ? '良好' : '待提升' }}
      </span>
    </div>

    <div class="balance-content">
      <div class="gauge-section">
        <VChart :option="gaugeOption" autoresize style="width: 100%; height: 200px;" />
        <div class="gauge-label">平衡度指数</div>
      </div>

      <div class="radar-section">
        <VChart :option="radarOption" autoresize style="width: 100%; height: 200px;" />
      </div>
    </div>

    <div class="comment-section">
      <div class="comment-icon">💬</div>
      <p class="comment-text">{{ balanceComment }}</p>
    </div>

    <div v-if="largestGap" class="gap-section">
      <div class="gap-label">差距提醒</div>
      <div class="gap-items">
        <div class="gap-item high">
          <span class="gap-name">{{ largestGap.high.name }}</span>
          <span class="gap-score">{{ largestGap.high.score }}分</span>
        </div>
        <div class="gap-arrow">⇅</div>
        <div class="gap-item low">
          <span class="gap-name">{{ largestGap.low.name }}</span>
          <span class="gap-score">{{ largestGap.low.score }}分</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.balance-card {
  background: linear-gradient(135deg, #fffdf7 0%, #fff8e6 100%);
  border: 1px solid rgba(184, 134, 11, 0.18);
  border-radius: 12px;
  padding: 18px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.level-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.level-badge.high {
  background: #dcfce7;
  color: #166534;
}

.level-badge.medium {
  background: #fef3c7;
  color: #92400e;
}

.level-badge.low {
  background: #fee2e2;
  color: #991b1b;
}

.balance-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.gauge-section {
  position: relative;
  text-align: center;
}

.gauge-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: -8px;
}

.radar-section {
  position: relative;
}

.comment-section {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(184, 134, 11, 0.06);
  border-radius: 8px;
}

.comment-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.comment-text {
  margin: 0;
  font-size: 12px;
  color: var(--color-text);
  line-height: 1.6;
}

.gap-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(184, 134, 11, 0.15);
}

.gap-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.gap-items {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.gap-item {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: center;
}

.gap-item.high {
  background: #dcfce7;
}

.gap-item.low {
  background: #fee2e2;
}

.gap-name {
  display: block;
  font-size: 11px;
  color: var(--color-text);
  margin-bottom: 2px;
}

.gap-score {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', Menlo, monospace;
}

.gap-item.high .gap-score { color: #166534; }
.gap-item.low .gap-score { color: #991b1b; }

.gap-arrow {
  font-size: 14px;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .balance-content {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
