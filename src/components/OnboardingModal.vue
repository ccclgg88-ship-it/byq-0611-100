<script setup lang="ts">
import { ref } from 'vue'
import descriptionsData from '@/mock/eightfold-descriptions.json'
import type { DimensionDescription } from '@/types'
import { DIMENSION_COLORS } from '@/constants'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const step = ref(0)
const items = descriptionsData as DimensionDescription[]

function prev() {
  if (step.value > 0) step.value--
}

function next() {
  if (step.value < items.length) step.value++
}

const current = () => items[step.value]
</script>

<template>
  <div class="modal-overlay" @click.self="step = items.length">
    <div class="modal onboarding-modal">
      <div class="modal-header">
        <div>
          <h2 class="modal-title">☸ 八正道入门引导</h2>
          <p class="modal-subtitle">
            {{ step < items.length ? `第 ${step + 1} / ${items.length} 支：${current().name}` : '🎉 完成引导' }}
          </p>
        </div>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>

      <div v-if="step < items.length" class="onboarding-content">
        <div class="onboarding-hero" :style="{ background: `${DIMENSION_COLORS[current().key]}14` }">
          <div class="hero-name" :style="{ color: DIMENSION_COLORS[current().key] }">
            {{ current().name }}
          </div>
          <div class="hero-pali">{{ current().paliName }}</div>
          <div class="hero-short">{{ current().shortDesc }}</div>
        </div>

        <div class="onboarding-desc">
          <p>{{ current().fullDesc }}</p>
        </div>

        <div class="onboarding-examples">
          <h5>实践举例</h5>
          <ul>
            <li v-for="(ex, i) in current().examples" :key="i">
              <span class="ex-bullet" :style="{ background: DIMENSION_COLORS[current().key] }"></span>
              {{ ex }}
            </li>
          </ul>
        </div>

        <div class="onboarding-progress">
          <div
            v-for="(_, i) in items"
            :key="i"
            class="progress-dot"
            :class="{ active: i === step, done: i < step }"
          ></div>
        </div>
      </div>

      <div v-else class="onboarding-final">
        <div class="final-icon">☸</div>
        <h3>准备好开始修行了吗？</h3>
        <p>
          八正道是佛陀所教导的离苦之道，依戒、定、慧三学次第开展。<br/>
          每日自评修行进度，持之以恒，必有所获。
        </p>
        <ul class="final-tips">
          <li>✦ 每日至少填写 4 个维度方可保存</li>
          <li>✦ 滑块实时预览，虚线表示未保存状态</li>
          <li>✦ 低分维度将自动获得佛陀开示</li>
          <li>✦ 记得勾选相关定课提醒</li>
        </ul>
      </div>

      <div class="modal-footer">
        <div class="btn-group">
          <button
            v-if="step < items.length && step > 0"
            class="btn btn-ghost"
            @click="prev"
          >
            ← 上一支
          </button>
          <button
            v-if="step < items.length - 1"
            class="btn btn-secondary"
            @click="next"
          >
            下一支 →
          </button>
          <button
            v-else-if="step === items.length - 1"
            class="btn"
            @click="next"
          >
            完成引导 ✓
          </button>
          <button
            v-else
            class="btn"
            @click="emit('close')"
          >
            开始使用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-modal {
  max-width: 560px;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.onboarding-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.onboarding-hero {
  padding: 24px;
  border-radius: var(--radius-md);
  text-align: center;
}

.hero-name {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.hero-pali {
  font-size: 13px;
  font-style: italic;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.hero-short {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text);
}

.onboarding-desc p {
  font-size: 14px;
  line-height: 1.85;
  color: var(--color-text);
  padding: 0 8px;
}

.onboarding-examples h5 {
  font-size: 13px;
  color: var(--color-primary-dark);
  margin-bottom: 10px;
  padding: 0 8px;
  letter-spacing: 1px;
}

.onboarding-examples ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding-examples li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.6;
  padding: 8px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.ex-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}

.onboarding-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all 0.25s;
}

.progress-dot.active {
  background: var(--color-primary);
  transform: scale(1.4);
}

.progress-dot.done {
  background: var(--color-success);
  opacity: 0.5;
}

.onboarding-final {
  text-align: center;
  padding: 20px 12px;
}

.final-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.9;
}

.onboarding-final h3 {
  font-family: var(--font-serif);
  font-size: 22px;
  color: var(--color-primary-dark);
  margin-bottom: 14px;
}

.onboarding-final p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text);
  margin-bottom: 20px;
}

.final-tips {
  list-style: none;
  text-align: left;
  background: var(--color-bg);
  padding: 16px 20px;
  border-radius: var(--radius-md);
  display: inline-block;
}

.final-tips li {
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 4px 0;
}

.modal-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
