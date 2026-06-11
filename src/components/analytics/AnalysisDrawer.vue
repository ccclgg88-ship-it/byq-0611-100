<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useEightfoldStore } from '@/stores/eightfold'
import type { PeriodType } from '@/types/analytics'
import type { DimensionKey } from '@/types'
import ReportSummaryBar from './ReportSummaryBar.vue'
import DimensionCompareChart from './DimensionCompareChart.vue'
import PracticeHeatmap from './PracticeHeatmap.vue'
import BalanceScoreCard from './BalanceScoreCard.vue'
import WeeklyInsightPanel from './WeeklyInsightPanel.vue'

const analyticsStore = useAnalyticsStore()
const eightfoldStore = useEightfoldStore()

const tabs: { key: PeriodType; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'last30', label: '近 30 天' }
]

function handleSelectDimension(key: DimensionKey) {
  analyticsStore.setSelectedDimension(key)
  eightfoldStore.setSelectedDimension(key)
  analyticsStore.closeDrawer()
}

function handleTabChange(key: PeriodType) {
  analyticsStore.setPeriodType(key)
}

watch(() => analyticsStore.isDrawerOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="analyticsStore.isDrawerOpen" class="drawer-overlay" @click.self="analyticsStore.closeDrawer">
        <Transition name="drawer-slide">
          <div v-if="analyticsStore.isDrawerOpen" class="drawer-panel">
            <div class="drawer-header">
              <div class="header-left">
                <h2 class="drawer-title">📊 修行周报分析中心</h2>
                <span class="drawer-subtitle">{{ analyticsStore.currentPeriod.start }} ~ {{ analyticsStore.currentPeriod.end }}</span>
              </div>
              <button class="close-btn" @click="analyticsStore.closeDrawer">✕</button>
            </div>

            <div class="drawer-tabs">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="tab-btn"
                :class="{ active: analyticsStore.periodType === tab.key }"
                @click="handleTabChange(tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="drawer-content">
              <ReportSummaryBar
                :compare-result="analyticsStore.compareResult"
                :month-checkin-rate="analyticsStore.monthCheckinRate"
                :period-label="analyticsStore.currentPeriod.label"
              />

              <div class="content-grid">
                <div class="grid-col main-col">
                  <DimensionCompareChart
                    :compare-result="analyticsStore.compareResult"
                    :selected-dimension="analyticsStore.selectedDimension"
                    @select-dimension="handleSelectDimension"
                  />

                  <PracticeHeatmap
                    :cells="analyticsStore.heatmapCells"
                    :summary="analyticsStore.currentSummary"
                  />
                </div>

                <div class="grid-col side-col">
                  <BalanceScoreCard :summary="analyticsStore.currentSummary" />

                  <WeeklyInsightPanel
                    :insights="analyticsStore.insights"
                    :summary="analyticsStore.currentSummary"
                    :period-type="analyticsStore.periodType"
                    :period-label="analyticsStore.currentPeriod.label"
                  />
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(44, 24, 16, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.drawer-panel {
  width: 100%;
  max-width: 1200px;
  max-height: 92vh;
  background: linear-gradient(180deg, #fdf8ef 0%, #f8f0dc 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateY(30px) scale(0.98);
  opacity: 0;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  background: linear-gradient(135deg, #b8860b 0%, #d4a017 100%);
  color: #fff;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.drawer-subtitle {
  font-size: 12px;
  opacity: 0.85;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.drawer-tabs {
  display: flex;
  gap: 0;
  padding: 0 28px;
  background: #fff8e6;
  border-bottom: 1px solid rgba(184, 134, 11, 0.2);
  flex-shrink: 0;
}

.tab-btn {
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: #6b5344;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--color-primary);
}

.tab-btn.active {
  color: var(--color-primary);
  font-weight: 700;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 3px;
  background: var(--color-primary);
  border-radius: 3px 3px 0 0;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px 28px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .drawer-overlay {
    padding: 0;
  }

  .drawer-panel {
    max-height: 100vh;
    border-radius: 0;
  }

  .drawer-header {
    padding: 16px 20px;
  }

  .drawer-title {
    font-size: 17px;
  }

  .drawer-tabs {
    padding: 0 20px;
  }

  .tab-btn {
    padding: 12px 16px;
    font-size: 13px;
  }

  .drawer-content {
    padding: 16px;
  }
}
</style>
