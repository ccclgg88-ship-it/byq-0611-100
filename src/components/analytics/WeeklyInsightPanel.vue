<script setup lang="ts">
import { ref, computed } from 'vue'
import type { InsightItem, PeriodSummary } from '@/types/analytics'
import type { PeriodType } from '@/types/analytics'

interface Props {
  insights: InsightItem[]
  summary: PeriodSummary
  periodType: PeriodType
  periodLabel: string
}

const props = defineProps<Props>()

const copied = ref(false)

const summaryText = computed(() => {
  const lines: string[] = []
  lines.push(`📊 ${props.periodLabel}修行周报`)
  lines.push('========================')
  lines.push(`总均分: ${props.summary.overallAverage} 分`)
  lines.push(`有效记录: ${props.summary.validDays} 天`)
  lines.push(`连续打卡: ${props.summary.streakCurrent} 天`)
  lines.push(`平衡度: ${props.summary.balanceScore}`)
  lines.push('')
  lines.push('📝 本周洞察:')
  props.insights.slice(1, 4).forEach((item, i) => {
    lines.push(`${i + 1}. ${item.title}`)
    lines.push(`   ${item.content}`)
  })
  lines.push('')
  lines.push('— 修行周报 Demo —')
  return lines.join('\n')
})

async function copySummary() {
  try {
    await navigator.clipboard.writeText(summaryText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = summaryText.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function exportPNG() {
  const card = document.querySelector('.insight-panel') as HTMLElement
  if (!card) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = card.getBoundingClientRect()
  const scale = 2
  canvas.width = rect.width * scale
  canvas.height = rect.height * scale
  ctx.scale(scale, scale)

  ctx.fillStyle = '#fffdf7'
  ctx.fillRect(0, 0, rect.width, rect.height)

  ctx.strokeStyle = 'rgba(184, 134, 11, 0.18)'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, rect.width - 1, rect.height - 1)

  ctx.fillStyle = '#2c1810'
  ctx.font = 'bold 16px sans-serif'
  ctx.fillText(`💡 智能周报摘要 · ${props.periodLabel}`, 20, 36)

  let y = 70
  props.insights.slice(0, 4).forEach(item => {
    ctx.fillStyle = getTypeColor(item.type)
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(`${item.icon} ${item.title}`, 20, y)
    y += 20

    ctx.fillStyle = '#6b5344'
    ctx.font = '12px sans-serif'
    const maxWidth = rect.width - 40
    const lines = wrapText(ctx, item.content, maxWidth)
    lines.forEach(line => {
      ctx.fillText(line, 20, y)
      y += 18
    })
    y += 10
  })

  ctx.fillStyle = 'rgba(184, 134, 11, 0.15)'
  ctx.font = 'bold 28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('修行周报 Demo', rect.width / 2, rect.height - 30)
  ctx.textAlign = 'left'

  const link = document.createElement('a')
  link.download = `修行周报_${props.periodLabel}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'achievement': return '#27ae60'
    case 'warning': return '#e74c3c'
    case 'tip': return '#d4a017'
    case 'encouragement': return '#e67e22'
    default: return '#6b5344'
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.split('')
  const lines: string[] = []
  let currentLine = ''

  chars.forEach(char => {
    const testLine = currentLine + char
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = char
    } else {
      currentLine = testLine
    }
  })

  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines
}
</script>

<template>
  <div class="insight-panel">
    <div class="card-header">
      <h3 class="card-title">💡 智能周报摘要</h3>
      <div class="action-btns">
        <button class="action-btn" @click="copySummary">
          {{ copied ? '✅ 已复制' : '📋 复制' }}
        </button>
        <button class="action-btn primary" @click="exportPNG">
          🖼️ 导出PNG
        </button>
      </div>
    </div>

    <div class="insight-list">
      <div
        v-for="item in insights"
        :key="item.id"
        class="insight-card"
        :class="item.type"
      >
        <div class="insight-icon">{{ item.icon }}</div>
        <div class="insight-body">
          <div class="insight-title">{{ item.title }}</div>
          <div class="insight-content">{{ item.content }}</div>
        </div>
      </div>
    </div>

    <div class="watermark">修行周报 Demo</div>
  </div>
</template>

<style scoped>
.insight-panel {
  background: linear-gradient(135deg, #fffdf7 0%, #fff8e6 100%);
  border: 1px solid rgba(184, 134, 11, 0.18);
  border-radius: 12px;
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
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

.action-btns {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid rgba(184, 134, 11, 0.3);
  background: #fff;
  color: var(--color-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #fff8e6;
  border-color: var(--color-primary);
}

.action-btn.primary {
  background: linear-gradient(135deg, #b8860b, #d4a017);
  color: #fff;
  border-color: transparent;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #d4a017, #e6c75a);
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-card {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  border-left: 3px solid #999;
  transition: all 0.2s;
}

.insight-card:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.insight-card.achievement {
  border-left-color: #27ae60;
  background: linear-gradient(90deg, #f0fdf4, #fff);
}

.insight-card.warning {
  border-left-color: #e74c3c;
  background: linear-gradient(90deg, #fef2f2, #fff);
}

.insight-card.tip {
  border-left-color: #d4a017;
  background: linear-gradient(90deg, #fffbeb, #fff);
}

.insight-card.encouragement {
  border-left-color: #e67e22;
  background: linear-gradient(90deg, #fff7ed, #fff);
}

.insight-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 30px;
  text-align: center;
}

.insight-body {
  flex: 1;
  min-width: 0;
}

.insight-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.insight-content {
  font-size: 12px;
  color: #6b5344;
  line-height: 1.6;
}

.watermark {
  position: absolute;
  bottom: 10px;
  right: 20px;
  font-size: 10px;
  color: rgba(184, 134, 11, 0.2);
  font-weight: 700;
  pointer-events: none;
}
</style>
