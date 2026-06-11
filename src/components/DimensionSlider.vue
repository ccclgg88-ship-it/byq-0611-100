<script setup lang="ts">
import { computed } from 'vue'
import type { DimensionKey } from '@/types'
import { DIMENSION_NAMES, DIMENSION_COLORS } from '@/constants'
import descriptionsData from '@/mock/eightfold-descriptions.json'
import type { DimensionDescription } from '@/types'

interface Props {
  dimension: DimensionKey
  score: number
  note?: string
  isDirty: boolean
  isHighlighted: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:score', value: number): void
  (e: 'update:note', value: string): void
  (e: 'select'): void
}>()

const description = computed<DimensionDescription | undefined>(() =>
  (descriptionsData as unknown as DimensionDescription[]).find(d => d.key === props.dimension)
)

const scoreLabel = computed(() => {
  if (props.score === 0) return '未填写'
  if (props.score < 40) return '需努力'
  if (props.score < 60) return '待加强'
  if (props.score < 80) return '良好'
  return '精进'
})

const color = computed(() => DIMENSION_COLORS[props.dimension])

function handleScoreChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:score', parseInt(target.value, 10))
}
</script>

<template>
  <div
    class="dimension-slider"
    :class="{
      'is-dirty': isDirty,
      'is-highlighted': isHighlighted,
      'is-zero': score === 0
    }"
    @click="emit('select')"
  >
    <div class="ds-header">
      <div class="ds-title-row">
        <span class="ds-dot" :style="{ background: color }"></span>
        <h4 class="ds-name">{{ DIMENSION_NAMES[dimension] }}</h4>
        <span v-if="description" class="ds-pali">{{ description.paliName }}</span>
        <span
          class="ds-score-badge"
          :style="{
            background: score === 0 ? '#f0f0f0' : `${color}22`,
            color: score === 0 ? '#999' : color
          }"
        >
          {{ score }} / 100
        </span>
      </div>
      <div class="ds-meta">
        <span class="tag" :class="score > 0 && score < 60 ? 'tag-warning' : score >= 80 ? 'tag-success' : ''">
          {{ scoreLabel }}
        </span>
        <span v-if="isDirty" class="tag tag-warning">● 未保存</span>
      </div>
    </div>

    <div class="ds-slider-row" @click.stop>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="score"
        @input="handleScoreChange"
        :style="{
          background: `linear-gradient(to right, ${color} ${score}%, var(--color-border) ${score}%)`
        }"
      />
    </div>

    <div v-if="description" class="ds-short-desc">
      {{ description.shortDesc }}
    </div>

    <div class="ds-note-row" @click.stop>
      <textarea
        :value="note"
        @input="emit('update:note', ($event.target as HTMLTextAreaElement).value)"
        :placeholder="`记录今日${DIMENSION_NAMES[dimension]}实践心得...`"
        rows="2"
      />
    </div>
  </div>
</template>

<style scoped>
.dimension-slider {
  padding: 16px;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  background: rgba(253, 248, 239, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dimension-slider:hover {
  background: rgba(253, 248, 239, 0.9);
}

.dimension-slider.is-highlighted {
  border-color: var(--color-primary);
  background: rgba(184, 134, 11, 0.06);
  box-shadow: 0 2px 8px rgba(184, 134, 11, 0.15);
}

.dimension-slider.is-dirty {
  border-style: dashed;
  border-color: rgba(44, 62, 80, 0.4);
}

.dimension-slider.is-zero {
  opacity: 0.85;
}

.ds-header {
  margin-bottom: 10px;
}

.ds-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ds-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ds-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.ds-pali {
  font-size: 11px;
  color: var(--color-text-muted);
  font-style: italic;
  flex: 1;
}

.ds-score-badge {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.ds-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: 18px;
}

.ds-slider-row {
  padding: 4px 18px 8px;
}

.ds-short-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 18px;
  margin-bottom: 8px;
  font-style: italic;
}

.ds-note-row {
  margin-left: 18px;
}

.ds-note-row textarea {
  width: 100%;
  font-size: 13px;
  min-height: 48px;
  line-height: 1.5;
}
</style>
