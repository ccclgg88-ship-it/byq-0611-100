<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EightfoldDashboard from '@/components/EightfoldDashboard.vue'
import OnboardingModal from '@/components/OnboardingModal.vue'
import { useEightfoldStore } from '@/stores/eightfold'

const store = useEightfoldStore()
const showOnboarding = ref(false)

onMounted(() => {
  store.init()
  if (!store.hasCompletedOnboarding) {
    showOnboarding.value = true
  }
})

const handleOnboardingClose = () => {
  showOnboarding.value = false
  store.completeOnboarding()
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">☸ 八正道修行进度仪表盘</h1>
      <p class="app-subtitle">依佛陀教导，日日精勤，步步趋向解脱</p>
    </header>
    <main class="app-main">
      <EightfoldDashboard />
    </main>
    <OnboardingModal v-if="showOnboarding" @close="handleOnboardingClose" />
  </div>
</template>
