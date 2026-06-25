<template>
  <div :class="{ show: visible, ready: ready }" class="modal-overlay" @click.self="close">
    <div
      class="modal-panel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="modal-handle"></div>
      <!-- 品牌色标题栏 -->
      <div :class="['modal-header', brandClass]">
        <h3>
          {{ gpuName }}
          <span v-if="releaseDate" class="release-date">({{ releaseDate }})</span>
        </h3>
        <div v-if="specSummary" class="spec-summary">{{ specSummary }}</div>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body">
        <!-- 第一行：游戏性能 + 创作效率 -->
        <div class="perf-grid">
          <!-- 游戏性能 -->
          <div class="perf-card">
            <div class="perf-card-header">
              <span class="perf-label">游戏性能</span>
              <button class="res-toggle" @click="cycleRes">{{ currentRes }}</button>
            </div>
            <div class="perf-value game">{{ currentGamePct }}%</div>
            <div class="perf-note">基准 {{ benchName }}</div>
          </div>
          <!-- 创作效率 -->
          <div class="perf-card">
            <div class="perf-label">创作效率</div>
            <div class="perf-value multi">{{ renderPct }}%</div>
            <div class="perf-note">基准 {{ benchName }}</div>
          </div>
        </div>

        <!-- 第二行：AI性能 + 3DMark -->
        <div class="score-grid">
          <!-- AI性能 -->
          <div class="score-card">
            <div class="score-title">AI性能</div>
            <div class="perf-value ai">{{ aiPct }}%</div>
            <div class="score-sub">{{ gpu?.ai_performance ? gpu.ai_performance + ' TOPS' : '-' }}</div>
          </div>
          <!-- 3DMark -->
          <div class="score-card">
            <div class="score-title">3DMark</div>
            <div class="score-value">{{ gpu?.timespy ?? '-' }} / {{ gpu?.steel_nomad ?? '-' }}</div>
            <div class="score-sub">Time Spy / Steel Nomad</div>
          </div>
        </div>

        <!-- 第三行：Blender + 功耗 -->
        <div class="score-grid">
          <div class="score-card">
            <div class="score-title">Blender</div>
            <div class="score-value">{{ gpu?.render_performance ?? '-' }}</div>
          </div>
          <div class="score-card">
            <div class="score-title">功耗</div>
            <div class="score-value">{{ gpu?.tdp ? gpu.tdp + 'W' : '-' }}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn" @click="setAsBenchmark">{{ isBenchmark ? '取消基准' : '设为基准' }}</button>
        <button class="modal-btn" @click="addToCompare" :disabled="!isInCompare && isCompareFull">
  {{ isInCompare ? '取消对比' : '加到对比' }}
</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  benchmarkGpu: { type: Object, default: null },
  isInCompare: { type: Boolean, default: false },
  isBenchmark: { type: Boolean, default: false }
})

const emit = defineEmits(['set-benchmark', 'add-compare', 'reset-benchmark', 'remove-compare', 'close'])

const visible = ref(false)
const ready = ref(false)
const currentGpu = ref(null)
const isCompareFull = ref(false)

// 分辨率切换（默认2K，与天梯图联动由调用方传入初始值）
const resOptions = ['1080P', '2K', '4K']
const resIndex = ref(1)
const currentRes = computed(() => resOptions[resIndex.value])

function cycleRes() {
  resIndex.value = (resIndex.value + 1) % 3
}

function show(gpu, initialRes = '2K') {
  currentGpu.value = gpu
  // 根据传入的分辨率设置默认显示
  const idx = resOptions.indexOf(initialRes)
  resIndex.value = idx !== -1 ? idx : 1
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'gpuDetail' }, '')
  }
  isCompareFull.value = isFull
}

function close() {
  visible.value = false
  currentGpu.value = null
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
  emit('close')
}

const gpu = computed(() => currentGpu.value)

const gpuName = computed(() => {
  if (!gpu.value) return ''
  return gpu.value.model?.replace(/NVIDIA GeForce |AMD Radeon |INTEL Arc /i, '').replace(/NVIDIA |AMD |INTEL /i, '').trim() || ''
})

const releaseDate = computed(() => gpu.value?.release_date || '')

const benchName = computed(() =>
  props.benchmarkGpu
    ? props.benchmarkGpu.model?.replace(/NVIDIA GeForce |AMD Radeon |INTEL Arc /i, '').replace(/NVIDIA |AMD |INTEL /i, '').trim()
    : 'RTX 4060'
)

const specSummary = computed(() => {
  if (!gpu.value) return ''
  const parts = []
  if (gpu.value.shader_units) parts.push(gpu.value.shader_units + 'SP')
  if (gpu.value.game_freq) parts.push(gpu.value.game_freq + 'MHz')
  if (gpu.value.vram) parts.push(gpu.value.vram)
  return parts.join(' · ')
})

// 游戏性能（根据当前分辨率）
const currentGamePct = computed(() => {
  if (!gpu.value || !props.benchmarkGpu) return '-'
  const fieldMap = {
    '1080P': 'abs_game_performance_1080p',
    '2K': 'abs_game_performance_2k',
    '4K': 'abs_game_performance_4k'
  }
  const field = fieldMap[currentRes.value]
  if (!gpu.value[field] || !props.benchmarkGpu[field]) return '-'
  return Math.round((gpu.value[field] / props.benchmarkGpu[field]) * 100)
})

const renderPct = computed(() => {
  if (!gpu.value || !props.benchmarkGpu?.render_performance) return '-'
  return gpu.value.render_performance ? Math.round((gpu.value.render_performance / props.benchmarkGpu.render_performance) * 100) : '-'
})

const aiPct = computed(() => {
  if (!gpu.value || !props.benchmarkGpu?.ai_performance) return '-'
  return gpu.value.ai_performance ? Math.round((gpu.value.ai_performance / props.benchmarkGpu.ai_performance) * 100) : '-'
})

const brandClass = computed(() => {
  const model = gpu.value?.model?.toUpperCase() || ''
  if (model.includes('NVIDIA') || model.includes('RTX') || model.includes('GTX')) return 'brand-nvidia'
  if (model.includes('AMD') || model.includes('RX') || model.includes('RADEON')) return 'brand-amd'
  if (model.includes('INTEL') || model.includes('ARC')) return 'brand-intel'
  return ''
})

function setAsBenchmark() {
  if (gpu.value) {
    if (props.isBenchmark) {
      emit('reset-benchmark')  // 新增事件，由 Dashboard 处理
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
const onTouchEnd = () => {
  if (movedY > 120) close()
  else e.currentTarget.style.transform = ''
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
/* 弹窗基础状态 */
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

/* 标题栏：品牌色渐变背景，左对齐 */
.modal-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px 20px 0 0;
  flex-shrink: 0;
  position: relative;
  color: #fff;
}
.modal-header.brand-nvidia { background: var(--brand-nvidia-bg); }
.modal-header.brand-amd { background: var(--brand-amd-bg); }
.modal-header.brand-intel { background: var(--brand-intel-bg); }

.modal-header h3 {
  color: var(--accent); /* 型号金色 */
  margin: 0;
  font-size: 1rem;
  text-align: left;
  width: 100%;
  padding-right: 40px;
  box-sizing: border-box;
  font-weight: 600;
}
.release-date {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 400;
  margin-left: 0.25rem;
}
.spec-summary {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 4px;
  text-align: left;
  width: 100%;
  padding-right: 40px;
  box-sizing: border-box;
}

.modal-close-btn {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.4rem;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.modal-close-btn:active {
  transform: translateY(-50%) scale(0.85);
  color: var(--text-primary);
}

.modal-body { flex: 1; overflow-y: auto; padding: 1rem; }

/* 性能卡片网格（游戏+创作） */
.perf-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;
}
.perf-card {
  background: var(--bg-primary); border: 1px solid var(--border);
  padding: 0.7rem; border-radius: var(--radius-md); text-align: center;
}
.perf-card-header {
  display: flex; justify-content: center; align-items: center; gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.perf-label { font-size: 0.75rem; color: var(--thead-text); }
.res-toggle {
  padding: 0.15rem 0.5rem; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace;
  background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--accent);
  cursor: pointer; transition: all 0.15s;
}
.res-toggle:active { transform: scale(0.95); }

.perf-value { font-size: 1.2rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.perf-value.game { color: var(--accent); }            /* 游戏：金色 */
.perf-value.multi { color: var(--value-cyan-text); }  /* 创作：青色 */
.perf-value.ai { color: var(--value-red-text); }      /* AI：红色 */
.perf-note { font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem; }

/* 跑分/信息卡片网格（第二、三行） */
.score-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem;
}
.score-card {
  background: var(--bg-primary); border: 1px solid var(--border);
  padding: 0.7rem; border-radius: var(--radius-md); text-align: center;
}
.score-title { font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
.score-value {
  font-size: 1rem; font-weight: 600; font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
}
.score-sub { font-size: 0.65rem; color: var(--thead-text); margin-top: 0.15rem; }

.modal-footer {
  display: flex; gap: 0.5rem; padding: 0.75rem 1rem;
  border-top: 1px solid var(--border); flex-shrink: 0;
}
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