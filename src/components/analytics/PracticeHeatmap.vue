<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HeatmapCell, PeriodSummary } from '@/types/analytics'
import { getHeatmapWeeks, getCheckinRate } from '@/utils/analytics'
import { DIMENSION_ORDER } from '@/constants'

interface Props {
  cells: HeatmapCell[]
  summary: PeriodSummary
}

const props = defineProps<Props>()

const hoveredCell = ref<HeatmapCell | null>(null)
const hoverPos = ref({ x: 0, y: 0 })

const weeks = computed(() => getHeatmapWeeks(props.cells, true))

const monthLabels = computed(() => {
  const labels: { month: string; weekIndex: number }[] = []
  let lastMonth = ''
  weeks.value.forEach((week, idx) => {
    if (week.length > 0) {
      const firstDay = week[0]
      const m = firstDay.date.substring(5, 7)
      if (m !== lastMonth) {
        lastMonth = m
        labels.push({ month: `${parseInt(m)}月`, weekIndex: idx })
      }
    }
  })
  return labels
})

const periodCheckinRate = computed(() => {
  const valid = props.cells.filter(c => c.isValid).length
  const total = props.cells.length
  return getCheckinRate(valid, total)
})

function handleMouseEnter(cell: HeatmapCell, e: MouseEvent) {
  hoveredCell.value = cell
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const parent = (e.currentTarget as HTMLElement).closest('.heatmap-wrapper')?.getBoundingClientRect()
  if (parent) {
    hoverPos.value = {
      x: rect.left - parent.left + rect.width / 2,
      y: rect.top - parent.top - 8
    }
  }
}

function handleMouseLeave() {
  hoveredCell.value = null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const weekDayLabels = ['日', '一', '二', '三', '四', '五', '六']
</script>

<template>
  <div class="heatmap-card">
    <div class="card-header">
      <h3 class="card-title">🗓️ 打卡热力日历</h3>
      <div class="legend">
        <span class="legend-label">少</span>
        <span class="legend-cell level-0"></span>
        <span class="legend-cell level-1"></span>
        <span class="legend-cell level-2"></span>
        <span class="legend-cell level-3"></span>
        <span class="legend-cell level-4"></span>
        <span class="legend-label">多</span>
      </div>
    </div>

    <div class="heatmap-wrapper">
      <div v-if="hoveredCell" class="tooltip" :style="{ left: hoverPos.x + 'px', top: hoverPos.y + 'px' }">
        <div class="tip-date">{{ formatDate(hoveredCell.date) }}</div>
        <div class="tip-row">
          <span>总分:</span>
          <b>{{ hoveredCell.totalScore }}</b>
          <span class="muted"> / {{ DIMENSION_ORDER.length * 100 }}</span>
        </div>
        <div class="tip-row">
          <span>已填维度:</span>
          <b>{{ hoveredCell.filledDimensions }}</b>
          <span class="muted"> / {{ DIMENSION_ORDER.length }}</span>
        </div>
        <div class="tip-row">
          <span>状态:</span>
          <b :class="hoveredCell.isValid ? 'valid' : 'invalid'">
            {{ hoveredCell.isValid ? '有效记录' : '未达标' }}
          </b>
        </div>
        <div v-if="hoveredCell.hasNote" class="tip-note">📝 有修习心得</div>
      </div>

      <div class="heatmap-grid">
        <div class="weekday-labels">
          <span v-for="(w, i) in weekDayLabels" :key="i" class="wd-label">{{ w }}</span>
        </div>

        <div class="weeks-area">
          <div class="month-labels">
            <span
              v-for="(m, i) in monthLabels"
              :key="i"
              class="month-label"
              :style="{ left: (m.weekIndex * 14 + 2) + 'px' }"
            >
              {{ m.month }}
            </span>
          </div>

          <div class="weeks-row">
            <div v-for="(week, wIdx) in weeks" :key="wIdx" class="week-col">
              <div
                v-for="(cell, dIdx) in week"
                :key="dIdx"
                class="heat-cell"
                :class="[`level-${cell.level}`, { invalid: !cell.isValid && cell.totalScore > 0 }]"
                @mouseenter="handleMouseEnter(cell, $event)"
                @mouseleave="handleMouseLeave"
              ></div>
              <div v-if="week.length < 7" v-for="i in 7 - week.length" :key="'empty-' + i" class="heat-cell empty"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="heatmap-stats">
        <div class="stat-item">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.streakCurrent }}</div>
            <div class="stat-label">当前连续</div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon">🏆</div>
          <div class="stat-info">
            <div class="stat-value">{{ summary.streakBest }}</div>
            <div class="stat-label">历史最长</div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <div class="stat-value">{{ periodCheckinRate }}%</div>
            <div class="stat-label">区间打卡率</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.heatmap-card {
  background: linear-gradient(135deg, #fffdf7 0%, #fff8e6 100%);
  border: 1px solid rgba(184, 134, 11, 0.18);
  border-radius: 12px;
  padding: 18px 20px;
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.legend {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0 2px;
}

.legend-cell {
  width: 11px;
  height: 11px;
  border-radius: 2px;
}

.heatmap-wrapper {
  position: relative;
}

.tooltip {
  position: absolute;
  z-index: 100;
  transform: translateX(-50%) translateY(-100%);
  background: rgba(44, 24, 16, 0.95);
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(44, 24, 16, 0.95);
}

.tip-date {
  font-weight: 700;
  margin-bottom: 4px;
  font-size: 13px;
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  margin-bottom: 2px;
}

.tip-row .muted {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.tip-row .valid { color: #2ecc71; }
.tip-row .invalid { color: #e74c3c; }

.tip-note {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 11px;
  color: #f1c40f;
}

.heatmap-grid {
  display: flex;
  gap: 6px;
}

.weekday-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 18px;
}

.wd-label {
  font-size: 10px;
  color: var(--color-text-muted);
  height: 11px;
  line-height: 11px;
  text-align: right;
  width: 20px;
}

.weeks-area {
  flex: 1;
  overflow-x: auto;
}

.month-labels {
  position: relative;
  height: 16px;
  margin-bottom: 2px;
}

.month-label {
  position: absolute;
  top: 0;
  font-size: 10px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.weeks-row {
  display: flex;
  gap: 2px;
  padding-bottom: 4px;
}

.week-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.heat-cell {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s;
}

.heat-cell:hover {
  transform: scale(1.3);
  box-shadow: 0 0 0 1px rgba(184, 134, 11, 0.5);
}

.heat-cell.empty {
  background: transparent;
  cursor: default;
}

.heat-cell.empty:hover {
  transform: none;
  box-shadow: none;
}

.heat-cell.level-0 {
  background: #ebedf0;
}

.heat-cell.level-1 {
  background: #ffe0b2;
}

.heat-cell.level-2 {
  background: #ffcc80;
}

.heat-cell.level-3 {
  background: #ffa726;
}

.heat-cell.level-4 {
  background: #fb8c00;
}

.heat-cell.invalid {
  opacity: 0.5;
}

.heatmap-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(184, 134, 11, 0.15);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  font-size: 26px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  font-family: 'SF Mono', Menlo, monospace;
  color: var(--color-text);
  line-height: 1.1;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(184, 134, 11, 0.15);
}

@media (max-width: 768px) {
  .heatmap-stats {
    gap: 14px;
  }
  
  .stat-icon {
    font-size: 22px;
  }
  
  .stat-value {
    font-size: 18px;
  }
}
</style>
