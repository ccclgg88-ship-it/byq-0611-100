<script setup lang="ts">
import { ref } from 'vue'
import { useEightfoldStore } from '@/stores/eightfold'
import { isValidBackupData } from '@/utils/validation'

const emit = defineEmits<{
  (e: 'imported', msg: string): void
  (e: 'error', msg: string): void
}>()

const store = useEightfoldStore()
const fileInput = ref<HTMLInputElement | null>(null)
const isExpanded = ref(false)

function handleExport() {
  try {
    const data = store.exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `八正道备份_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    emit('imported', 'JSON 备份导出成功')
  } catch (e) {
    emit('error', '导出失败：' + (e as Error).message)
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const check = isValidBackupData(parsed)
    if (!check.valid) {
      emit('error', '导入校验失败：\n' + check.errors.join('\n'))
      return
    }
    if (!confirm(`确认导入 ${parsed.records.length} 条记录？\n相同日期的数据将被覆盖。`)) {
      return
    }
    const res = store.importBackup(parsed)
    if (res.ok) {
      emit('imported', `成功导入 ${parsed.records.length} 条记录`)
    } else {
      emit('error', '导入失败：' + res.errors.join(', '))
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      emit('error', 'JSON 解析错误，请检查文件格式')
    } else {
      emit('error', '导入失败：' + (e as Error).message)
    }
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="card import-export">
    <div class="ie-header" @click="isExpanded = !isExpanded">
      <h3 class="card-title" style="margin:0;padding:0;border:none;cursor:pointer;user-select:none;flex:1">
        <span>{{ isExpanded ? '▼' : '▶' }}</span>
        🔧 数据管理
      </h3>
    </div>

    <div v-show="isExpanded" class="ie-body">
      <p class="ie-hint">
        建议每周备份一次数据。历史记录上限 365 天，超出将自动归档最早 30 天。
      </p>
      <div class="btn-group">
        <button class="btn btn-secondary" @click="handleExport">
          💾 导出 JSON 备份
        </button>
        <button class="btn btn-ghost" @click="triggerImport">
          📥 导入 JSON 备份
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        style="display:none"
        @change="handleFileChange"
      />
      <div class="ie-storage">
        <div class="storage-title">存储占用</div>
        <div class="storage-bar">
          <div
            class="storage-fill"
            :style="{
              width: `${Math.min(100, (Object.keys(store.records).length / 365) * 100)}%`
            }"
          ></div>
        </div>
        <div class="storage-numbers">
          <span>主记录：{{ Object.keys(store.records).length }} / 365</span>
          <span>归档：{{ Object.keys(store.archive).length }} 天</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import-export {
  padding: 0 !important;
  overflow: hidden;
}

.ie-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  transition: background 0.15s;
}

.ie-header:hover {
  background: var(--color-dim);
}

.ie-body {
  padding: 16px 20px;
}

.ie-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 14px;
  line-height: 1.6;
}

.ie-storage {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--color-border);
}

.storage-title {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.storage-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.storage-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-success));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.storage-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: 'SF Mono', Menlo, monospace;
}
</style>
