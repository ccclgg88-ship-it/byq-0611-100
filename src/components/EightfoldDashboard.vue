<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useEightfoldStore } from '@/stores/eightfold'
import RadarChart from './RadarChart.vue'
import DimensionSlider from './DimensionSlider.vue'
import TrendChart from './TrendChart.vue'
import AdvicePanel from './AdvicePanel.vue'
import ImportExportPanel from './ImportExportPanel.vue'
import { DIMENSION_ORDER, MIN_SAVE_DIMENSIONS, DIMENSION_NAMES, DIMENSION_COLORS } from '@/constants'
import type { DimensionKey } from '@/types'
import { today, subtractDays } from '@/utils/date'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const store = useEightfoldStore()

const dashboardRef = ref<HTMLElement | null>(null)
const message = ref<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
const showHistory = ref(false)
const seedLoaded = ref(false)

const savedRecordData = computed(() => store.todayRecord || {})
const draftData = computed(() => store.currentDraft)

const dimensionValues = computed(() => {
  const result: Record<DimensionKey, { score: number; note: string; isDirty: boolean }> = {} as any
  DIMENSION_ORDER.forEach(k => {
    const fromDraft = store.currentDraft[k]
    const fromSaved = store.todayRecord?.[k]
    const hasDirty = store.currentDraft[k] !== undefined
    result[k] = {
      score: fromDraft?.score ?? fromSaved?.score ?? 0,
      note: fromDraft?.note ?? fromSaved?.note ?? '',
      isDirty: hasDirty
    }
  })
  return result
})

const activeDateInput = ref(store.activeDate)

watch(() => store.activeDate, (v) => {
  activeDateInput.value = v
})

const todayAverage = computed(() => {
  if (!store.todayRecord) return 0
  const total = DIMENSION_ORDER.reduce((s, k) => s + (store.todayRecord![k]?.score || 0), 0)
  return Math.round(total / 8 * 10) / 10
})

const bestDimensionName = computed(() => {
  const d = store.mergedDraftWithSaved
  let best: { k: DimensionKey; s: number } | null = null
  DIMENSION_ORDER.forEach((k: DimensionKey) => {
    const s = d[k]?.score || 0
    if (s > 0 && (!best || s > (best as { k: DimensionKey; s: number }).s)) {
      best = { k, s }
    }
  })
  return best ? DIMENSION_NAMES[(best as { k: DimensionKey; s: number }).k] : '--'
})

const dimColors = DIMENSION_COLORS
const dimNames = DIMENSION_NAMES
const dimOrder = DIMENSION_ORDER

function handleDateChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.value) store.setActiveDate(target.value)
}

function handleScoreChange(key: DimensionKey, value: number) {
  store.setDimensionScore(key, value)
}

function handleNoteChange(key: DimensionKey, value: string) {
  store.setDimensionNote(key, value)
}

function handleSelectDimension(key: DimensionKey) {
  store.setSelectedDimension(key)
}

function handleSave() {
  try {
    console.log('[Save] 触发保存，当前维度数量:', store.filledDimensionsCount, ', canSave:', store.canSave)
    console.log('[Save] currentDraft:', JSON.stringify(store.currentDraft))
    const res = store.saveTodayRecord()
    if (res.ok) {
      showMessage('今日记录已保存 ✓', 'success')
    } else {
      showMessage(res.error || '保存失败', 'error')
    }
  } catch (e) {
    console.error('[Save] 保存异常:', e)
    showMessage('保存异常：' + (e as Error).message, 'error')
  }
}

function handleRevert() {
  store.revertDraft()
  showMessage('已撤销未保存修改', 'info')
}

function showMessage(text: string, type: 'success' | 'error' | 'info') {
  message.value = { text, type }
  setTimeout(() => { message.value = null }, 3000)
}

function handleSeedDemo() {
  store.seedDemoData()
  seedLoaded.value = true
  showMessage('已载入 14 天演示数据', 'success')
}

function handleDelete(date: string) {
  if (window.confirm(`确认删除 ${date} 的记录？`)) {
    store.deleteRecord(date)
    showMessage('已删除', 'info')
  }
}

async function exportPNG() {
  if (!dashboardRef.value) return
  try {
    showMessage('正在生成图片...', 'info')
    await nextTick()
    const canvas = await html2canvas(dashboardRef.value, {
      backgroundColor: '#fdf8ef',
      scale: 2,
      useCORS: true
    })
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.font = 'bold 48px serif'
    ctx.fillStyle = '#8b6914'
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-Math.PI / 6)
    ctx.textAlign = 'center'
    ctx.fillText('修行仪表盘 Demo', 0, 0)
    ctx.restore()

    const link = document.createElement('a')
    link.download = `八正道周报_${store.currentDate}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    showMessage('PNG 导出成功', 'success')
  } catch (e) {
    console.error(e)
    showMessage('导出失败：' + (e as Error).message, 'error')
  }
}

async function exportPDF() {
  if (!dashboardRef.value) return
  try {
    showMessage('正在生成 PDF...', 'info')
    await nextTick()
    const canvas = await html2canvas(dashboardRef.value, {
      backgroundColor: '#fdf8ef',
      scale: 2,
      useCORS: true
    })
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.font = 'bold 48px serif'
    ctx.fillStyle = '#8b6914'
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-Math.PI / 6)
    ctx.textAlign = 'center'
    ctx.fillText('修行仪表盘 Demo', 0, 0)
    ctx.restore()

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 20
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const x = 10
    const y = (pageHeight - imgHeight) / 2
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
    pdf.save(`八正道周报_${store.currentDate}.pdf`)
    showMessage('PDF 导出成功', 'success')
  } catch (e) {
    console.error(e)
    showMessage('导出失败：' + (e as Error).message, 'error')
  }
}

onMounted(() => {
  if (Object.keys(store.records).length === 0) {
    setTimeout(() => {
      if (Object.keys(store.records).length === 0 && !seedLoaded.value) {
        seedLoaded.value = true
      }
    }, 1500)
  }
})
</script>

<template>
  <div class="dashboard">
    <div v-if="message" class="toast" :class="message.type">
      {{ message.text }}
    </div>

    <div class="toolbar card" style="margin-bottom: 20px;">
      <div class="toolbar-left">
        <div class="date-picker-wrap">
          <label style="font-size:13px;color:var(--color-text-muted);margin-right:8px">📅 日期：</label>
          <input
            type="date"
            :value="activeDateInput"
            :max="today()"
            @change="handleDateChange"
            style="
              padding: 6px 10px;
              border: 1px solid var(--color-border);
              border-radius: var(--radius-sm);
              font-size: 13px;
              background: white;
            "
          />
          <button
            v-if="store.activeDate !== today()"
            class="btn btn-ghost"
            style="padding: 6px 12px; font-size: 12px; margin-left: 8px;"
            @click="store.setActiveDate(today())"
          >
            返回今日
          </button>
        </div>
        <div class="stats-row">
          <div class="stat-chip">
            <span class="stat-label">已填写</span>
            <span
              class="stat-value"
              :style="{ color: store.filledDimensionsCount >= MIN_SAVE_DIMENSIONS ? 'var(--color-success)' : 'var(--color-warning)' }"
            >
              {{ store.filledDimensionsCount }}/8
            </span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">周均分</span>
            <span class="stat-value" style="color: var(--color-info)">{{ store.weekAverageOverall || '--' }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">总记录</span>
            <span class="stat-value">{{ Object.keys(store.records).length }} 天</span>
          </div>
          <span v-if="store.draftDirty" class="tag tag-warning" style="margin-left:8px">
            ● 有未保存的修改
          </span>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="btn-group">
          <button
            v-if="Object.keys(store.records).length === 0"
            class="btn btn-ghost"
            @click="handleSeedDemo"
          >
            🎲 载入演示数据
          </button>
          <button
            class="btn btn-ghost"
            @click="showHistory = !showHistory"
          >
            📜 历史记录
          </button>
          <button class="btn btn-secondary" @click="exportPNG">📷 导出PNG</button>
          <button class="btn btn-secondary" @click="exportPDF">📄 导出PDF</button>
          <button
            v-if="store.draftDirty"
            class="btn btn-ghost"
            @click="handleRevert"
          >
            ↺ 撤销
          </button>
          <button
            class="btn"
            :disabled="!store.canSave"
            :title="store.canSave ? '保存今日修行记录' : `还需填写 ${Math.max(0, MIN_SAVE_DIMENSIONS - store.filledDimensionsCount)} 个维度才能保存`"
            @click="handleSave"
          >
            {{ store.todayRecord ? '💾 更新保存' : '💾 保存今日' }}
          </button>
        </div>
      </div>
    </div>

    <div ref="dashboardRef" class="dashboard-grid">
      <div class="left-col">
        <div class="card sliders-card" style="margin-bottom: 20px;">
          <h3 class="card-title">📝 八维自评 · {{ store.currentDate }}</h3>
          <div v-if="!store.canSave" class="save-hint" style="
            padding: 10px 14px;
            background: rgba(212, 160, 23, 0.1);
            border-radius: var(--radius-sm);
            margin-bottom: 16px;
            font-size: 13px;
            color: #8b6f0f;
          ">
            💡 至少填写 {{ MIN_SAVE_DIMENSIONS }} 个维度方可保存（当前 {{ store.filledDimensionsCount }}）
          </div>
          <div class="sliders-grid">
            <DimensionSlider
              v-for="k in dimOrder"
              :key="k"
              :dimension="k"
              :score="dimensionValues[k].score"
              :note="dimensionValues[k].note"
              :is-dirty="dimensionValues[k].isDirty"
              :is-highlighted="store.selectedDimension === k"
              @update:score="(v: number) => handleScoreChange(k, v)"
              @update:note="(v: string) => handleNoteChange(k, v)"
              @select="handleSelectDimension(k)"
            />
          </div>
        </div>

        <div class="card trend-card" style="margin-bottom: 20px;">
          <h3 class="card-title">📈 修行趋势分析 · {{ dimNames[store.selectedDimension] }}</h3>
          <TrendChart
            :dates="store.trendData.dates"
            :scores="store.trendData.scores"
            :ma7="store.trendData.ma7"
            :ma30="store.trendData.ma30"
            :selected-dimension="store.selectedDimension"
            :week-average="store.weekAverage[store.selectedDimension]"
            :trend-days="store.trendDays"
            @change-dimension="store.setSelectedDimension"
            @change-trend-days="store.setTrendDays"
          />
        </div>
      </div>

      <div class="right-col">
        <div class="card radar-card" style="margin-bottom: 20px;">
          <h3 class="card-title">🎯 八维分布雷达图</h3>
          <div class="radar-summary-row">
            <div class="summary-item">
              <span class="sum-label">今日总分</span>
              <span class="sum-value" style="color:var(--color-primary)">{{ todayAverage }}</span>
            </div>
            <div class="summary-item">
              <span class="sum-label">周总均分</span>
              <span class="sum-value" style="color:var(--color-info)">{{ store.weekAverageOverall || '--' }}</span>
            </div>
            <div class="summary-item">
              <span class="sum-label">最佳维度</span>
              <span class="sum-value" style="color:var(--color-success)">{{ bestDimensionName }}</span>
            </div>
          </div>
          <RadarChart
            :saved-data="savedRecordData as any"
            :draft-data="draftData as any"
            :week-average="store.weekAverage"
            :highlight-key="store.selectedDimension"
          />
          <div style="text-align:center;font-size:12px;color:var(--color-text-muted);margin-top:4px;padding:8px;background:var(--color-bg);border-radius:var(--radius-sm)">
            <span style="display:inline-block;margin:0 6px"><span style="display:inline-block;width:12px;height:2px;background:#8e44ad;vertical-align:middle;margin-right:4px"></span>已保存</span>
            <span style="display:inline-block;margin:0 6px"><span style="display:inline-block;width:12px;height:2px;border-top:2px dashed #2c3e50;vertical-align:middle;margin-right:4px"></span>未保存</span>
            <span style="display:inline-block;margin:0 6px"><span style="display:inline-block;width:12px;height:2px;border-top:2px dashed #95a5a6;vertical-align:middle;margin-right:4px"></span>周均分</span>
          </div>
        </div>

        <div class="card overview-card" style="margin-bottom: 20px;">
          <h3 class="card-title">📊 八维一览</h3>
          <div class="dim-overview-list">
            <div
              v-for="k in dimOrder"
              :key="k"
              class="dim-overview-item"
              :class="{ active: store.selectedDimension === k }"
              :style="{ '--dim-color': dimColors[k] }"
              @click="handleSelectDimension(k)"
            >
              <div class="ov-left">
                <span class="ov-dot"></span>
                <span class="ov-name">{{ dimNames[k] }}</span>
              </div>
              <div class="ov-bar-wrap">
                <div class="ov-bar" :style="{ width: `${dimensionValues[k].score}%` }"></div>
              </div>
              <span class="ov-score" :class="{ zero: dimensionValues[k].score === 0 }">{{ dimensionValues[k].score }}</span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 20px;">
          <h3 class="card-title">🧘 佛陀开示 & 定课</h3>
          <AdvicePanel
            :lowest-dimension="store.lowestDimension"
            :reminders="store.reminders"
            @toggle-reminder="store.toggleReminder"
            @select-dimension="handleSelectDimension"
          />
        </div>

        <ImportExportPanel
          @imported="(msg: string) => showMessage(msg, 'success')"
          @error="(msg: string) => showMessage(msg, 'error')"
        />
      </div>
    </div>

    <div v-if="showHistory" class="card" style="margin-top: 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--color-border)">
        <h3 class="card-title" style="border:none;padding:0;margin:0">📜 历史记录（共 {{ store.getAllRecordDates().length }} 天）</h3>
        <button class="btn btn-ghost" @click="showHistory = false">关闭</button>
      </div>
      <div v-if="store.getAllRecordDates().length === 0" class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>暂无历史记录</p>
      </div>
      <div v-else class="history-list">
        <div
          v-for="date in store.getAllRecordDates()"
          :key="date"
          class="history-item"
        >
          <div class="h-date">
            <span @click="() => { store.setActiveDate(date); showHistory = false }" style="cursor:pointer;color:var(--color-primary);font-weight:600">
              {{ date }}
            </span>
            <span v-if="date === today()" class="tag tag-success" style="margin-left:8px">今天</span>
          </div>
          <div class="h-scores">
            <span
              v-for="k in dimOrder"
              :key="k"
              class="h-score-chip"
              :title="dimNames[k]"
              :style="{
                background: `var(--color-bg)`,
                color: store.records[date][k].score > 0 ? '#333' : '#ccc'
              }"
            >
              {{ dimNames[k] }}:{{ store.records[date][k].score }}
            </span>
          </div>
          <button
            class="btn btn-danger"
            style="padding:4px 10px;font-size:12px"
            @click="handleDelete(date)"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  position: relative;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: var(--shadow-lg);
  animation: slideDown 0.3s ease;
}

.toast.success {
  background: var(--color-success);
  color: white;
}

.toast.error {
  background: var(--color-danger);
  color: white;
}

.toast.info {
  background: var(--color-info);
  color: white;
}

@keyframes slideDown {
  from { transform: translate(-50%, -20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px !important;
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.stats-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--color-bg);
  border-radius: 16px;
  font-size: 12px;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: 700;
  font-family: 'SF Mono', Menlo, monospace;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 24px;
}

@media (max-width: 1400px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  }
}

@media (max-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.radar-card {
  overflow: hidden;
}

.radar-summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px 4px 14px;
  border-bottom: 1px dashed var(--color-border);
  margin-bottom: 8px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.sum-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.sum-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', Menlo, monospace;
}

.overview-card {
  overflow: hidden;
}

.dim-overview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dim-overview-item {
  display: grid;
  grid-template-columns: 110px 1fr 40px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg);
}

.dim-overview-item:hover {
  background: rgba(184, 134, 11, 0.08);
  transform: translateX(2px);
}

.dim-overview-item.active {
  background: color-mix(in srgb, var(--dim-color) 15%, var(--color-bg));
  box-shadow: inset 3px 0 0 var(--dim-color);
}

.ov-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.ov-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dim-color);
  flex-shrink: 0;
}

.ov-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 13px;
}

.ov-bar-wrap {
  height: 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.ov-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--dim-color), color-mix(in srgb, var(--dim-color) 73%, transparent));
  border-radius: 4px;
  transition: width 0.4s ease;
}

.ov-score {
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  font-family: 'SF Mono', Menlo, monospace;
  color: var(--dim-color);
}

.ov-score.zero {
  color: #bbb;
  font-weight: 500;
}

.sliders-card {
  overflow: hidden;
}

.sliders-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .sliders-grid {
    grid-template-columns: 1fr;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}

.h-date {
  min-width: 120px;
  font-family: 'SF Mono', Menlo, monospace;
}

.h-scores {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.h-score-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-family: 'SF Mono', Menlo, monospace;
}
</style>
