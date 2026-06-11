<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useEightfoldStore } from '@/stores/eightfold'
import RadarChart from './RadarChart.vue'
import DimensionSlider from './DimensionSlider.vue'
import TrendChart from './TrendChart.vue'
import AdvicePanel from './AdvicePanel.vue'
import ImportExportPanel from './ImportExportPanel.vue'
import { DIMENSION_ORDER, MIN_SAVE_DIMENSIONS, DIMENSION_NAMES } from '@/constants'
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
  const res = store.saveTodayRecord()
  if (res.ok) {
    showMessage('今日记录已保存 ✓', 'success')
  } else {
    showMessage(res.error || '保存失败', 'error')
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
              v-for="k in DIMENSION_ORDER"
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

        <div class="card" style="margin-bottom: 20px;">
          <h3 class="card-title">📈 近 30 天趋势 · {{ DIMENSION_NAMES[store.selectedDimension] }}</h3>
          <TrendChart
            :dates="store.trendData.dates"
            :scores="store.trendData.scores"
            :selected-dimension="store.selectedDimension"
            :week-average="store.weekAverage[store.selectedDimension]"
            @change-dimension="store.setSelectedDimension"
          />
        </div>
      </div>

      <div class="right-col">
        <div class="card" style="margin-bottom: 20px;">
          <h3 class="card-title">🎯 八维分布雷达图</h3>
          <RadarChart
            :saved-data="savedRecordData as any"
            :draft-data="draftData as any"
            :week-average="store.weekAverage"
            :highlight-key="store.selectedDimension"
          />
          <div style="text-align:center;font-size:12px;color:var(--color-text-muted);margin-top:-8px">
            <span style="display:inline-block;width:10px;height:2px;background:#8e44ad;vertical-align:middle;margin-right:4px"></span>已保存
            <span style="display:inline-block;width:10px;height:2px;border-top:2px dashed #2c3e50;vertical-align:middle;margin:0 4px 0 12px"></span>未保存
            <span style="display:inline-block;width:10px;height:2px;border-top:2px dashed #95a5a6;vertical-align:middle;margin:0 4px 0 12px"></span>周均分
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
              v-for="k in DIMENSION_ORDER"
              :key="k"
              class="h-score-chip"
              :title="DIMENSION_NAMES[k]"
              :style="{
                background: `var(--color-bg)`,
                color: store.records[date][k].score > 0 ? '#333' : '#ccc',
                borderLeft: `3px solid ${DIMENSION_NAMES[k] ? '' : ''}`
              }"
            >
              {{ DIMENSION_NAMES[k] }}:{{ store.records[date][k].score }}
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
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
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
