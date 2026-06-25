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
          {{ gpuName }}
          <span class="spec-summary">({{ specSummary }})</span>
        </h3>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body">
        <!-- 第一行：游戏性能（带分辨率切换） + 创作效率 -->
        <div class="perf-grid">
          <div class="perf-card">
            <div class="perf-card-header">
              <span class="perf-label">🎮 游戏性能</span>
              <button class="res-toggle" @click="cycleRes">{{ currentRes }}</button>
            </div>
            <div class="perf-value game">{{ currentGamePct }}%</div>
            <div class="perf-note">基准 {{ gameBenchName }}</div>
          </div>
          <div class="perf-card">
            <div class="perf-label">✏️ 创作效率</div>
            <div class="perf-value multi">{{ renderPct }}%</div>
            <div class="perf-note">基准 {{ renderBenchName }}</div>
          </div>
        </div>

        <!-- 第二行：AI性能 + 功耗 -->
        <div class="score-grid">
          <div class="score-card">
            <div class="score-title">🤖 AI 性能</div>
            <div class="perf-value ai">{{ aiPct }}%</div>
            <div class="score-sub">{{ gpu?.ai_performance ? gpu.ai_performance + ' TOPS' : '-' }}</div>
          </div>
          <div class="score-card">
            <div class="score-title">⚡ 功耗</div>
            <div class="score-value">{{ gpu?.tdp ? gpu.tdp + 'W' : '-' }}</div>
            <div class="score-sub">TDP</div>
          </div>
        </div>

        <!-- 第三行：性价比计算 -->
        <div class="value-section">
          <div class="value-header">
            <span class="value-title">💰 性价比计算 <span class="value-hint">(输入价格即可实时计算性价比)</span></span>
            <button class="value-mode-toggle" @click="toggleValueMode">{{ valueMode === 'game' ? '游戏' : '创作' }}</button>
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
  benchmarkGpu: { type: Object, default: null },       // 当前基准显卡对象
  defaultBenchmarks: { type: Object, default: () => ({}) }, // 各分辨率默认基准
  isInCompare: { type: Boolean, default: false },
  isBenchmark: { type: Boolean, default: false },
  isCompareFull: { type: Boolean, default: false }
})

const emit = defineEmits(['set-benchmark', 'add-compare', 'reset-benchmark', 'remove-compare', 'close'])

const visible = ref(false)
const ready = ref(false)
const currentGpu = ref(null)
const newPrice = ref(null)
const usedPrice = ref(null)
const valueMode = ref('game') // 'game' or 'render'

// 分辨率切换
const resOptions = ['1080P', '2K', '4K']
const resIndex = ref(1) // 默认 2K
const currentRes = computed(() => resOptions[resIndex.value])

function cycleRes() {
  resIndex.value = (resIndex.value + 1) % 3
}

function show(gpu, initialRes = '2K') {
  currentGpu.value = gpu
  const idx = resOptions.indexOf(initialRes)
  resIndex.value = idx !== -1 ? idx : 1
  newPrice.value = gpu.new_price
  usedPrice.value = gpu.used_price
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'gpuSpecs' }, '')
  }
}

function close() {
  visible.value = false
  currentGpu.value = null
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
  emit('close')
}

function toggleValueMode() {
  valueMode.value = valueMode.value === 'game' ? 'render' : 'game'
}

const gpu = computed(() => currentGpu.value)

const gpuName = computed(() => gpu.value?.model || '')

const specSummary = computed(() => {
  if (!gpu.value) return ''
  const parts = []
  if (gpu.value.vram) parts.push(gpu.value.vram)
  if (gpu.value.shader_units) parts.push(gpu.value.shader_units + 'SP')
  if (gpu.value.game_freq) parts.push(gpu.value.game_freq + 'MHz')
  return parts.join(' · ')
})

// 基准名称（根据分辨率动态变化）
const gameBenchName = computed(() => {
  const defaults = props.defaultBenchmarks
  if (currentRes.value === '1080P') return defaults.perf1080?.model_short || '2060 6G'
  if (currentRes.value === '2K') return defaults.perf2k?.model_short || '4060'
  return defaults.perf4k?.model_short || '5070'
})

const renderBenchName = computed(() => {
  return props.defaultBenchmarks?.render?.model_short || '4060'
})

const brandClass = computed(() => {
  const model = gpu.value?.model?.toUpperCase() || ''
  if (model.includes('NVIDIA') || model.includes('RTX') || model.includes('GTX')) return 'brand-nvidia'
  if (model.includes('AMD') || model.includes('RX')) return 'brand-amd'
  if (model.includes('INTEL') || model.includes('ARC')) return 'brand-intel'
  return ''
})

const currentGamePct = computed(() => {
  if (!gpu.value) return '-'
  const defaults = props.defaultBenchmarks
  let field, baseGpu
  if (currentRes.value === '1080P') {
    field = 'abs_game_performance_1080p'
    baseGpu = defaults.perf1080
  } else if (currentRes.value === '2K') {
    field = 'abs_game_performance_2k'
    baseGpu = defaults.perf2k
  } else {
    field = 'abs_game_performance_4k'
    baseGpu = defaults.perf4k
  }
  const base = baseGpu?.[field]
  if (!gpu.value[field] || !base) return '-'
  return Math.round((gpu.value[field] / base) * 100)
})

const renderPct = computed(() => {
  if (!gpu.value) return '-'
  const baseGpu = props.defaultBenchmarks?.render
  const base = baseGpu?.render_performance
  if (!gpu.value.render_performance || !base) return '-'
  return Math.round((gpu.value.render_performance / base) * 100)
})

const aiPct = computed(() => {
  if (!gpu.value || !gpu.value.ai_performance) return '-'
  // 优先使用当前基准的 AI 性能，若无则使用 RTX 4060 的默认值 123 TOPS
  const base = props.benchmarkGpu?.ai_performance || 123
  return Math.round((gpu.value.ai_performance / base) * 100)
})

// 性价比计算
const gameValueNew = computed(() => {
  if (!gpu.value || !newPrice.value || newPrice.value <= 0) return '-'
  const getGamePerfForValue = () => {
  if (currentRes.value === '1080P') return gpu.value.abs_game_performance_1080p
  if (currentRes.value === '4K') return gpu.value.abs_game_performance_4k
  return gpu.value.abs_game_performance_2k // 默认 2K
}
const perf = valueMode.value === 'game' ? getGamePerfForValue() : gpu.value.render_performance
  const rate = valueMode.value === 'game' ? 20 : 40
  return perf ? Math.round((perf / newPrice.value) * rate) : '-'
})

const gameValueUsed = computed(() => {
  if (!gpu.value || !usedPrice.value || usedPrice.value <= 0) return '-'
  const getGamePerfForValue = () => {
  if (currentRes.value === '1080P') return gpu.value.abs_game_performance_1080p
  if (currentRes.value === '4K') return gpu.value.abs_game_performance_4k
  return gpu.value.abs_game_performance_2k // 默认 2K
}
const perf = valueMode.value === 'game' ? getGamePerfForValue() : gpu.value.render_performance
  const rate = valueMode.value === 'game' ? 20 : 40
  return perf ? Math.round((perf / usedPrice.value) * rate) : '-'
})

function setAsBenchmark() {
  if (gpu.value) {
    if (props.isBenchmark) {
      emit('reset-benchmark')
    } else {
      emit('set-benchmark', gpu.value)
    }
  }
}

function addToCompare() {
  if (gpu.value) {
    if (props.isInCompare) {
      emit('remove-compare', gpu.value)
    } else {
      emit('add-compare', gpu.value)
    }
  }
}

// 手势
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
.modal-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: none;
}
.modal-overlay.ready { transition: opacity 0.25s ease, visibility 0.25s ease; }
.modal-overlay.show { opacity: 1; visibility: visible; pointer-events: auto; }

.modal-panel {
  background: var(--modal-bg);
  border-radius: 20px 20px 0 0;
  width: 100%; max-height: 85vh; display: flex; flex-direction: column;
  box-shadow: var(--shadow-modal);
  transform: translateY(100%);
}
.modal-overlay.ready .modal-panel { transition: transform 0.3s ease; }
.modal-overlay.show .modal-panel { transform: translateY(0); }

.modal-handle {
  width: 36px; height: 4px;
  background: var(--modal-handle);
  border-radius: 2px; margin: 8px auto 0;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px 20px 0 0; flex-shrink: 0;
}
.modal-header h3 { color: #fff; margin: 0; font-size: 1rem; }
.spec-summary { font-size: 0.72rem; color: rgba(255,255,255,0.7); font-weight: 400; margin-left: 4px; }

.brand-nvidia { background: var(--brand-nvidia-bg); }
.brand-amd { background: var(--brand-amd-bg); }
.brand-intel { background: var(--brand-intel-bg); }

.modal-close-btn {
  background: none; border: none; color: rgba(255,255,255,0.8);
  font-size: 1.4rem; cursor: pointer;
  min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.modal-close-btn:active { transform: scale(0.85); color: #fff; }

.modal-body { flex: 1; overflow-y: auto; padding: 1rem; }

.perf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
.perf-card { background: var(--bg-primary); border: 1px solid var(--border); padding: 0.7rem; border-radius: var(--radius-md); text-align: center; }
.perf-card-header { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
.perf-label { font-size: 0.75rem; color: var(--thead-text); }
.res-toggle {
  padding: 0.15rem 0.5rem; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace;
  background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--accent);
  cursor: pointer; transition: all 0.15s;
}
.res-toggle:active { transform: scale(0.95); }

.perf-value { font-size: 1.2rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.perf-value.game { color: var(--accent); }
.perf-value.multi { color: var(--value-cyan-text); }
.perf-value.ai { color: var(--value-red-text); }
.perf-note { font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem; }

.score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
.score-card { background: var(--bg-primary); border: 1px solid var(--border); padding: 0.7rem; border-radius: var(--radius-md); text-align: center; }
.score-title { font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
.score-value { font-size: 1rem; font-weight: 600; font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
.score-sub { font-size: 0.65rem; color: var(--thead-text); margin-top: 0.15rem; }

.value-section { background: var(--bg-primary); border: 1px solid var(--border); padding: 0.7rem; border-radius: var(--radius-md); margin-bottom: 1rem; }
.value-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.value-title { font-size: 0.75rem; color: var(--thead-text); }
.value-hint { font-size: 0.62rem; color: var(--text-secondary); }
.value-mode-toggle {
  font-size: 0.65rem; padding: 0.15rem 0.5rem; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--accent); cursor: pointer;
}
.value-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; }
.value-type { font-size: 0.95rem; color: var(--text-secondary); min-width: 30px; }
.value-currency { font-size: 0.95rem; color: var(--text-secondary); }
.value-input {
  width: 85px; padding: 0.15rem 0.3rem; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);
  font-size: 0.95rem; text-align: center; font-family: 'JetBrains Mono', monospace;
}
.value-input:focus { outline: none; border-color: var(--accent); }
.value-arrow { font-size: 0.95rem; color: var(--text-secondary); }
.value-result { font-size: 0.95rem; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
.value-result.game { color: var(--accent); }
.value-result.multi { color: var(--value-cyan-text); }

.modal-footer { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid var(--border); flex-shrink: 0; }
.modal-btn {
  flex: 1; padding: 0.55rem; border-radius: var(--radius-md); font-size: 0.85rem;
  cursor: pointer; background: var(--bg-secondary); border: 1px solid var(--border);
  color: var(--text-primary); transition: all 0.15s;
}
.modal-btn:active { transform: scale(0.95); }
.modal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (min-width: 769px) {
  .modal-overlay { align-items: center; }
  .modal-panel { max-width: 480px; border-radius: var(--radius-xl); }
  .modal-header { border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
}
</style>