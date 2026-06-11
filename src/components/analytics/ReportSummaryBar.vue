<script setup lang="ts">
import { computed } from 'vue'
import type { CompareResult } from '@/types/analytics'
import { getCheckinRate } from '@/utils/analytics'

interface Props {
  compareResult: CompareResult
  monthCheckinRate?: number | null
  periodLabel: string
}

const props = withDefaults(defineProps<Props>(), {
  monthCheckinRate: null
})

const { current, previous, hasEnoughData, overallDelta, overallDeltaPercent } = computed(() => props.compareResult).value

const checkinRate = computed(() => getCheckinRate(current.validDays, current.totalDays))

const prevCheckinRate = computed(() => getCheckinRate(previous.validDays, previous.totalDays))

function fmtDelta(delta: number, percent: number | null): { text: string; up: boolean } {
  if (!hasEnoughData || percent === null) return { text: '--', up: false }
  const sign = delta > 0 ? '+' : ''
  return { text: `${sign}${delta}分 (${sign}${percent}%)`, up: delta > 0 }
}
</script>

<template>
  <div class="summary-bar">
    <div class="summary-card main">
      <div class="s-label">总均分 · {{ periodLabel }}</div>
      <div class="s-value">{{ current.overallAverage || '--' }}</div>
      <div
        class="s-delta"
        :class="{ up: fmtDelta(overallDelta, overallDeltaPercent).up, down: !fmtDelta(overallDelta, overallDeltaPercent).up && hasEnoughData }"
      >
        <span v-if="hasEnoughData">{{ fmtDelta(overallDelta, overallDeltaPercent).text }}</span>
        <span v-else class="muted">环比数据不足</span>
      </div>
      <div class="s-sub">上期 {{ previous.overallAverage || '--' }}</div>
    </div>

    <div class="summary-card">
      <div class="s-label">有效记录</div>
      <div class="s-value secondary">{{ current.validDays }}<span class="s-unit">天</span></div>
      <div class="s-sub">占比 {{ checkinRate }}% · 上期 {{ prevCheckinRate }}%</div>
    </div>

    <div class="summary-card">
      <div class="s-label">连续打卡</div>
      <div class="s-value streak">
        {{ current.streakCurrent }}
        <span class="s-unit">天</span>
        <span class="flame">🔥</span>
      </div>
      <div class="s-sub">区间最佳 {{ current.streakBest }} 天</div>
    </div>

    <div v-if="monthCheckinRate !== null" class="summary-card">
      <div class="s-label">本月打卡率</div>
      <div class="s-value rate">{{ monthCheckinRate }}<span class="s-unit">%</span></div>
      <div class="s-sub">目标 80% 打卡率</div>
    </div>
  </div>
</template>

<style scoped>
.summary-bar {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 14px;
  margin-bottom: 22px;
}

@media (max-width: 768px) {
  .summary-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-card {
  background: linear-gradient(135deg, #fffdf7 0%, #fff8e6 100%);
  border: 1px solid rgba(184, 134, 11, 0.18);
  border-radius: 12px;
  padding: 16px 20px;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), #e6c75a);
}

.summary-card.main {
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 50%, #e6c75a 100%);
  color: #fff;
  border: none;
}

.summary-card.main::before {
  display: none;
}

.s-label {
  font-size: 13px;
  margin-bottom: 6px;
  opacity: 0.85;
}

.summary-card.main .s-label {
  color: rgba(255, 255, 255, 0.9);
}

.s-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  font-family: 'SF Mono', Menlo, monospace;
  color: var(--color-text);
  margin-bottom: 4px;
}

.summary-card.main .s-value {
  color: #fff;
  font-size: 40px;
}

.s-value.secondary {
  color: var(--color-info);
}

.s-value.streak {
  color: #e67e22;
  display: flex;
  align-items: center;
  gap: 4px;
}

.s-value.rate {
  color: var(--color-success);
}

.s-unit {
  font-size: 14px;
  font-weight: 500;
}

.flame {
  font-size: 18px;
}

.s-delta {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

.s-delta.up { color: var(--color-success); }
.s-delta.down { color: var(--color-danger); }

.s-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

.summary-card.main .s-sub {
  color: rgba(255, 255, 255, 0.8);
}

.muted {
  color: var(--color-text-muted);
  font-weight: 400;
}
</style>
