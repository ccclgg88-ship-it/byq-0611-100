<script setup lang="ts">
import { computed } from 'vue'
import type { DimensionKey, AdviceEntry, ReminderItem } from '@/types'
import adviceData from '@/mock/advice.json'
import { DIMENSION_NAMES, DIMENSION_COLORS } from '@/constants'

interface Props {
  lowestDimension: { key: DimensionKey; score: number } | null
  reminders: ReminderItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'toggleReminder', key: string): void
  (e: 'selectDimension', key: DimensionKey): void
}>()

const advice = computed<AdviceEntry | null>(() => {
  if (!props.lowestDimension) return null
  return (adviceData as AdviceEntry[]).find(a => a.dimension === props.lowestDimension!.key) || null
})

const randomQuote = computed(() => {
  if (!advice.value) return ''
  const quotes = advice.value.quotes
  const seed = new Date().getDate() + (props.lowestDimension?.key.length || 0)
  return quotes[seed % quotes.length]
})

const color = computed(() =>
  props.lowestDimension ? DIMENSION_COLORS[props.lowestDimension.key] : '#b8860b'
)

const suggestedCount = computed(() => props.reminders.filter(r => r.suggested).length)
</script>

<template>
  <div class="advice-panel">
    <div v-if="advice && lowestDimension" class="advice-card" :style="{ borderTopColor: color }">
      <div class="advice-header">
        <span class="advice-icon" :style="{ color }">☸</span>
        <div>
          <h4 class="advice-title">{{ advice.title }}</h4>
          <div class="advice-subtitle">
            <span
              class="tag tag-warning"
              @click="emit('selectDimension', lowestDimension.key)"
              style="cursor:pointer"
            >
              最低维度：{{ DIMENSION_NAMES[lowestDimension.key] }} · {{ lowestDimension.score }}分
            </span>
          </div>
        </div>
      </div>

      <div class="advice-quote">
        <span class="quote-mark">「</span>
        <span class="quote-text">{{ randomQuote }}</span>
        <span class="quote-mark">」</span>
      </div>

      <div class="advice-practice">
        <span class="practice-label">今日修行建议</span>
        <p class="practice-text">{{ advice.practice }}</p>
      </div>
    </div>

    <div v-else class="advice-empty">
      <div class="empty-state">
        <div class="empty-state-icon">☸</div>
        <p>填写今日自评后，此处将为您开示。</p>
      </div>
    </div>

    <div class="reminders-section">
      <div class="reminders-header">
        <h5 class="reminders-title">
          <span>⏰ 定课提醒</span>
          <span v-if="suggestedCount > 0" class="tag tag-warning" style="margin-left:8px">
            {{ suggestedCount }} 项建议勾选
          </span>
        </h5>
      </div>

      <div class="reminders-list">
        <label
          v-for="r in reminders"
          :key="r.key"
          class="checkbox-item"
          :class="{ suggested: r.suggested }"
        >
          <input
            type="checkbox"
            :checked="r.checked"
            @change="emit('toggleReminder', r.key)"
          />
          <div class="reminder-content">
            <span class="reminder-label">{{ r.label }}</span>
            <span
              class="reminder-dim"
              :style="{ color: DIMENSION_COLORS[r.dimension] }"
            >
              · {{ DIMENSION_NAMES[r.dimension] }}
            </span>
            <span v-if="r.suggested" class="reminder-suggest">💡 建议</span>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.advice-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.advice-card {
  background: linear-gradient(135deg, rgba(253, 248, 239, 0.8), rgba(255, 255, 255, 0.9));
  border-radius: var(--radius-md);
  padding: 20px;
  border-top: 4px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.advice-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--color-border);
}

.advice-icon {
  font-size: 32px;
  line-height: 1;
}

.advice-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.advice-subtitle {
  font-size: 13px;
}

.advice-quote {
  background: rgba(184, 134, 11, 0.06);
  padding: 16px 20px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  text-align: center;
  font-family: var(--font-serif);
  line-height: 1.8;
}

.quote-mark {
  color: var(--color-primary);
  font-size: 20px;
  opacity: 0.6;
  margin: 0 4px;
}

.quote-text {
  font-size: 15px;
  color: var(--color-text);
  font-weight: 500;
}

.advice-practice {
  background: rgba(82, 158, 102, 0.06);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-success);
}

.practice-label {
  display: block;
  font-size: 12px;
  color: var(--color-success);
  font-weight: 600;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.practice-text {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.7;
}

.advice-empty {
  padding: 24px;
  border-radius: var(--radius-md);
  background: rgba(253, 248, 239, 0.5);
  border: 1px dashed var(--color-border);
}

.reminders-section {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border);
}

.reminders-header {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}

.reminders-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary-dark);
  display: flex;
  align-items: center;
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reminder-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 13px;
}

.reminder-label {
  color: var(--color-text);
}

.reminder-dim {
  font-size: 11px;
  opacity: 0.8;
}

.reminder-suggest {
  font-size: 11px;
  color: var(--color-warning);
  margin-left: auto;
  font-weight: 500;
}
</style>
