<template>
  <div>
    <div class="filter-summary" @click="expanded = true">
      <span class="filter-summary-text">💰 {{ summaryText }}</span>
      <button class="filter-toggle-btn">筛选 <span class="toggle-arrow">▼</span></button>
    </div>

    <Transition name="drawer">
      <div v-if="expanded" class="filter-panel">
        <div class="filter-panel-inner">
          <div class="filter-row">
            <span class="row-label">价格</span>
            <div class="price-inputs">
              <input v-model.number="draftMin" type="number" placeholder="最低" class="price-input" />
              <span class="price-sep">—</span>
              <input v-model.number="draftMax" type="number" placeholder="最高" class="price-input" />
            </div>
            <div class="price-presets">
              <button
                v-for="preset in presets"
                :key="preset.label"
                :class="{ active: draftMin === preset.min && draftMax === preset.max }"
                class="preset-btn"
                @click="applyPreset(preset)"
              >{{ preset.label }}</button>
            </div>
          </div>

          <div class="filter-row">
            <span class="row-label">插槽</span>
            <div class="option-btns">
              <button
                v-for="opt in socketOptions"
                :key="opt"
                :class="{ active: draftSocket === opt }"
                class="preset-btn"
                @click="draftSocket = draftSocket === opt ? '' : opt"
              >{{ opt }}</button>
            </div>
          </div>

          <div class="filter-row">
            <span class="row-label">内存</span>
            <div class="option-btns">
              <button
                v-for="opt in memoryOptions"
                :key="opt"
                :class="{ active: draftMemory === opt }"
                class="preset-btn"
                @click="draftMemory = draftMemory === opt ? '' : opt"
              >{{ opt }}</button>
            </div>
          </div>
        </div>

        <div class="filter-actions">
          <button class="reset-btn" @click="resetDraft">重置</button>
          <button class="confirm-btn" @click="applyFilter">确认</button>
        </div>
        <button class="filter-close-btn" @click="expanded = false">✕</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['filter-change'])

const presets = [
  { label: '500内', min: 0, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000-1500', min: 1000, max: 1500 },
  { label: '1500-2500', min: 1500, max: 2500 },
  { label: '2500以上', min: 2500, max: Infinity }
]

const socketOptions = ['AM4', 'AM5', 'LGA1200', 'LGA1700', 'LGA1851']
const memoryOptions = ['DDR4', 'DDR5']

const expanded = ref(false)
const draftMin = ref(null)
const draftMax = ref(null)
const draftSocket = ref('')
const draftMemory = ref('')
const appliedMin = ref(null)
const appliedMax = ref(null)
const appliedSocket = ref('')
const appliedMemory = ref('')

const summaryText = computed(() => {
  const parts = []
  if (appliedMin.value !== null || appliedMax.value !== null) {
    const min = appliedMin.value ?? '?'
    const max = appliedMax.value ?? '?'
    parts.push(`${min}–${max}`)
  }
  if (appliedSocket.value) parts.push(appliedSocket.value)
  if (appliedMemory.value) parts.push(appliedMemory.value)
  return parts.length ? parts.join(' · ') : '全部'
})

function applyPreset(preset) {
  draftMin.value = preset.min
  draftMax.value = preset.max === Infinity ? null : preset.max
}

function resetDraft() {
  draftMin.value = null
  draftMax.value = null
  draftSocket.value = ''
  draftMemory.value = ''
}

function applyFilter() {
  appliedMin.value = draftMin.value
  appliedMax.value = draftMax.value
  appliedSocket.value = draftSocket.value
  appliedMemory.value = draftMemory.value
  expanded.value = false
  const detail = {
    min: appliedMin.value,
    max: appliedMax.value,
    socket: appliedSocket.value,
    memory: appliedMemory.value
  }
  emit('filter-change', detail)
  window.dispatchEvent(new CustomEvent('filter-change', { detail }))
}
</script>

<style scoped>
/* 移动端筛选抽屉（已全部对接全局变量） */
.filter-summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.4rem 0.75rem;
  background: var(--bg-tertiary);               /* ★ 浅色深色都有层次 */
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 0.75rem;
}
.filter-summary-text {
  font-size: 0.8rem;
  color: var(--text-secondary);                  /* ★ 次要文字 */
}
.filter-toggle-btn {
  display: flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem;
  background: var(--highlight-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
}
.filter-panel {
  position: relative; margin-top: 0.4rem; padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  background: var(--modal-bg);                   /* ★ 弹窗背景 */
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-modal);               /* ★ 全局阴影 */
}
.filter-panel-inner { display: flex; flex-direction: column; gap: 0.5rem; }
.filter-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.row-label {
  font-size: 0.78rem;
  color: var(--thead-text);                      /* ★ 标签文字 */
  min-width: 28px;
}
.price-inputs { display: flex; align-items: center; gap: 0.3rem; }
.price-input {
  width: 68px; padding: 0.25rem 0.4rem;
  background: var(--bg-primary);                 /* ★ 输入框背景 */
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-primary);                    /* ★ 输入文字 */
  font-size: 0.8rem;
}
.price-sep { color: var(--text-secondary); }
.price-presets, .option-btns { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.preset-btn {
  padding: 0.28rem 0.6rem;
  background: var(--highlight-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover {
  border-color: var(--accent);
}
.preset-btn.active {
  background: var(--value-gold-bg);              /* ★ 选中背景 */
  border-color: var(--accent);
  color: var(--value-gold-text);                 /* ★ 选中文字 */
  font-weight: 600;
}
.filter-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
.reset-btn {
  padding: 0.35rem 0.8rem;
  background: var(--highlight-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
}
.confirm-btn {
  padding: 0.35rem 0.9rem;
  background: var(--accent);                     /* ★ 金色确认按钮 */
  border: none;
  border-radius: 20px;
  color: var(--btn-gold-text);                   /* ★ 按钮文字自动适配 */
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.filter-close-btn {
  position: absolute; top: 0.5rem; right: 0.5rem; width: 24px; height: 24px;
  background: var(--highlight-bg);
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
</style>