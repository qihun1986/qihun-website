<template>
  <div :class="{ show: visible, ready: ready }" class="modal-overlay" @click.self="close">
    <div
      class="modal-panel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="modal-handle"></div>
      <div :class="['modal-header', brandClass]">
        <h3>
          {{ cpuName }}
          <span class="spec-summary">({{ specSummary }})</span>
        </h3>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body">
        <div class="perf-grid">
          <div class="perf-card">
            <div class="perf-label">🎮 游戏性能</div>
            <div class="perf-value game">{{ gamePct }}%</div>
            <div class="perf-note">基准 {{ benchName }}</div>
          </div>
          <div class="perf-card">
            <div class="perf-label">⚡ 多核性能</div>
            <div class="perf-value multi">{{ multiPct }}%</div>
            <div class="perf-note">基准 {{ benchName }}</div>
          </div>
        </div>
        <div class="score-grid">
          <div class="score-card">
            <div class="score-title">🔧 平台</div>
            <div class="score-value">{{ cpu?.socket || '-' }}</div>
            <div class="score-value">{{ cpu?.memory || '-' }}</div>
          </div>
          <div class="score-card">
            <div class="score-title">⚡ 功耗 TDP {{ cpu?.tdp ? cpu.tdp + 'W' : '-' }}</div>
            <div class="score-value">满载 {{ cpu?.power_full ? cpu.power_full + 'W' : '-' }}</div>
            <div class="score-value">游戏 {{ cpu?.power_game ? cpu.power_game + 'W' : '-' }}</div>
          </div>
        </div>
        <div class="value-section">
          <div class="value-header">
            <span class="value-title">💰 性价比计算 <span class="value-hint">(输入价格即可实时计算性价比)</span></span>
            <button class="value-mode-toggle" @click="toggleValueMode">{{ valueMode === 'game' ? '游戏' : '多核' }}</button>
          </div>
          <div class="value-row">
            <span class="value-type">全新</span>
            <span class="value-currency">¥</span>
            <input v-model.number="newPrice" type="number" class="value-input" />
            <span class="value-arrow">→</span>
            <span class="value-result" :class="valueMode === 'game' ? 'game' : 'multi'">{{ gameValueNew }}</span>
          </div>
          <div class="value-row">
            <span class="value-type">二手</span>
            <span class="value-currency">¥</span>
            <input v-model.number="usedPrice" type="number" class="value-input" />
            <span class="value-arrow">→</span>
            <span class="value-result" :class="valueMode === 'game' ? 'game' : 'multi'">{{ gameValueUsed }}</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn" @click="setAsBenchmark">{{ isBenchmark ? '取消基准' : '设为基准' }}</button>
        <button class="modal-btn" @click="addToCompare" :disabled="!isInCompare && isCompareFull">{{ isInCompare ? '取消对比' : '加到对比' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  benchCpu: { type: Object, default: null },
  isInCompare: { type: Boolean, default: false },
  isBenchmark: { type: Boolean, default: false }
})

const emit = defineEmits(['set-benchmark', 'add-compare', 'reset-benchmark', 'remove-compare', 'close'])

const visible = ref(false)
const ready = ref(false)
const currentCpu = ref(null)
const isCompareFull = ref(false)

const newPrice = ref(null)
const usedPrice = ref(null)
const valueMode = ref('game')

function show(cpu, isFull = false) {
  currentCpu.value = cpu
  isCompareFull.value = isFull
  newPrice.value = cpu.new_price
  usedPrice.value = cpu.used_price
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'cpuSpecs' }, '')
  }
}

function close() {
  visible.value = false
  currentCpu.value = null
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
  emit('close')
}

function toggleValueMode() {
  valueMode.value = valueMode.value === 'game' ? 'multi' : 'game'
}

const cpu = computed(() => currentCpu.value)
const cpuName = computed(() => cpu.value?.model || '')
const specSummary = computed(() => {
  if (!cpu.value) return ''
  const parts = []
  if (cpu.value.cores && cpu.value.threads) parts.push(`${cpu.value.cores}核${cpu.value.threads}线程`)
  if (cpu.value.base_freq && cpu.value.boost_freq) parts.push(`${cpu.value.base_freq}-${cpu.value.boost_freq}GHz`)
  if (cpu.value.l3_cache) parts.push(cpu.value.l3_cache)
  return parts.join(', ')
})
const benchName = computed(() => props.benchCpu ? (props.benchCpu.model_short || props.benchCpu.model) : '12490F')
const brandClass = computed(() => {
  const model = cpu.value?.model?.toUpperCase() || ''
  if (model.includes('AMD')) return 'brand-amd'
  return 'brand-intel'
})
const gamePct = computed(() => {
  if (!cpu.value || !props.benchCpu) return '-'
  const base = props.benchCpu.abs_game_performance
  if (!cpu.value.abs_game_performance || !base) return '-'
  return Math.round((cpu.value.abs_game_performance / base) * 100)
})
const multiPct = computed(() => {
  if (!cpu.value || !props.benchCpu) return '-'
  const base = props.benchCpu.abs_multi_performance
  if (!cpu.value.abs_multi_performance || !base) return '-'
  return Math.round((cpu.value.abs_multi_performance / base) * 100)
})
const gameValueNew = computed(() => {
  if (!cpu.value || !newPrice.value || newPrice.value <= 0) return '-'
  const perf = valueMode.value === 'game' ? cpu.value.abs_game_performance : cpu.value.abs_multi_performance
  const rate = valueMode.value === 'game' ? 10 : 4
  return perf ? Math.round((perf / newPrice.value) * rate) : '-'
})
const gameValueUsed = computed(() => {
  if (!cpu.value || !usedPrice.value || usedPrice.value <= 0) return '-'
  const perf = valueMode.value === 'game' ? cpu.value.abs_game_performance : cpu.value.abs_multi_performance
  const rate = valueMode.value === 'game' ? 10 : 4
  return perf ? Math.round((perf / usedPrice.value) * rate) : '-'
})
function setAsBenchmark() {
  if (cpu.value) {
    if (props.isBenchmark) {
      emit('reset-benchmark')
    } else {
      emit('set-benchmark', cpu.value)
    }
  }
}
function addToCompare() {
  if (cpu.value) {
    if (props.isInCompare) {
      emit('remove-compare', cpu.value)
    } else {
      emit('add-compare', cpu.value)
    }
  }
}
let startY = 0, movedY = 0
const onTouchStart = (e) => { startY = e.touches[0].clientY }
const onTouchMove = (e) => {
  movedY = e.touches[0].clientY - startY
  if (movedY > 0) e.currentTarget.style.transform = `translateY(${movedY}px)`
}
const onTouchEnd = (e) => {
  if (movedY > 120) close()
  else if (e && e.currentTarget) e.currentTarget.style.transform = ''
  movedY = 0
}
const onPopState = () => { if (visible.value) close() }
onMounted(() => {
  ready.value = true
  window.addEventListener('popstate', onPopState)
})
onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
})
defineExpose({ show })
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; pointer-events: none; transition: none; }
.modal-overlay.ready { transition: opacity 0.25s ease, visibility 0.25s ease; }
.modal-overlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.modal-panel { background: var(--modal-bg); border-radius: 20px 20px 0 0; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: var(--shadow-modal); transform: translateY(100%); }
.modal-overlay.ready .modal-panel { transition: transform 0.3s ease; }
.modal-overlay.show .modal-panel { transform: translateY(0); }
.modal-handle { width: 36px; height: 4px; background: var(--modal-handle); border-radius: 2px; margin: 8px auto 0; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); border-radius: 20px 20px 0 0; flex-shrink: 0; }
.modal-header h3 { color: #fff; margin: 0; font-size: 1rem; }
.spec-summary { font-size: 0.72rem; color: rgba(255,255,255,0.7); font-weight: 400; margin-left: 4px; }
.brand-intel { background: var(--brand-intel-bg); }
.brand-amd { background: var(--brand-amd-bg); }
.modal-close-btn { background: none; border: none; color: rgba(255,255,255,0.8); font-size: 1.4rem; cursor: pointer; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; }
.modal-close-btn:active { transform: scale(0.85); color: #fff; }
.modal-body { flex: 1; overflow-y: auto; padding: 1rem; }
.perf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
.perf-card { background: var(--bg-primary); border: 1px solid var(--border); padding: 0.7rem; border-radius: var(--radius-md); text-align: center; }
.perf-label { font-size: 0.75rem; color: var(--thead-text); margin-bottom: 0.25rem; }
.perf-value { font-size: 1.2rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.perf-value.game { color: var(--accent); }
.perf-value.multi { color: var(--value-cyan-text); }
.perf-note { font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem; }
.score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
.score-card { background: var(--bg-primary); border: 1px solid var(--border); padding: 0.7rem; border-radius: var(--radius-md); text-align: center; }
.score-title { font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
.score-value { font-size: 0.95rem; font-weight: 600; font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
.value-section { background: var(--bg-primary); border: 1px solid var(--border); padding: 0.7rem; border-radius: var(--radius-md); margin-bottom: 1rem; }
.value-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.value-title { font-size: 0.75rem; color: var(--thead-text); }
.value-hint { font-size: 0.62rem; color: var(--text-secondary); }
.value-mode-toggle { font-size: 0.65rem; padding: 0.15rem 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--accent); cursor: pointer; }
.value-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; }
.value-type { font-size: 0.95rem; color: var(--text-secondary); min-width: 30px; }
.value-currency { font-size: 0.95rem; color: var(--text-secondary); }
.value-input { width: 85px; padding: 0.15rem 0.3rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary); font-size: 0.95rem; text-align: center; font-family: 'JetBrains Mono', monospace; }
.value-input:focus { outline: none; border-color: var(--accent); }
.value-arrow { font-size: 0.95rem; color: var(--text-secondary); }
.value-result { font-size: 0.95rem; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
.value-result.game { color: var(--accent); }
.value-result.multi { color: var(--value-cyan-text); }
.modal-footer { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid var(--border); flex-shrink: 0; }
.modal-btn { flex: 1; padding: 0.55rem; border-radius: var(--radius-md); font-size: 0.85rem; cursor: pointer; background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-primary); transition: all 0.15s; }
.modal-btn:active { transform: scale(0.95); }
.modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }
@media (min-width: 769px) {
  .modal-overlay { align-items: center; }
  .modal-panel { max-width: 480px; border-radius: var(--radius-xl); }
  .modal-header { border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
}
</style>