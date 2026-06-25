<template>
  <div :class="{ show: visible, ready: ready }" class="modal-overlay" @click.self="close">
    <div
      class="modal-panel"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3>📊 显卡对比 (基准: {{ benchName }})</h3>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body compare-body">
        <div class="table-scroll">
          <table class="compare-table">
            <thead>
              <tr>
                <th class="fixed-col"></th>
                <th v-for="gpu in gpus" :key="gpu.id" class="gpu-col" :class="getBrandClass(gpu)">
                  <div class="gpu-name">{{ shortGpu(gpu.model) }}</div>
                  <div class="spec-summary">{{ getSpecSummary(gpu) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 游戏性能（带分辨率切换） -->
              <tr>
                <td class="label-cell">
                  <span class="label-text">游戏性能</span>
                  <button class="res-toggle-compare" @click="cycleRes">{{ currentRes }}</button>
                </td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell game">{{ getGamePct(gpu) }}%</td>
              </tr>
              <!-- 游戏性价比 -->
              <tr>
                <td class="label-cell">游戏性价比</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell game">{{ getGameValue(gpu) }}</td>
              </tr>
              <!-- 创作效率 -->
              <tr>
                <td class="label-cell">创作效率</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell multi">{{ getRenderPct(gpu) }}%</td>
              </tr>
              <!-- 创作性价比 -->
              <tr>
                <td class="label-cell">创作性价比</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell multi">{{ getRenderValue(gpu) }}</td>
              </tr>
              <!-- 价格行（可编辑，实时计算） -->
              <tr>
                <td class="label-cell">价格</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell price-cell">
                  <div class="price-input-row">
                    <span class="value-currency">¥</span>
                    <input
                      v-model.number="priceInputs[gpu.id].price"
                      type="number"
                      class="value-input"
                      placeholder=""
                    />
                  </div>
                </td>
              </tr>
              <!-- 操作按钮 -->
              <tr>
                <td class="label-cell"></td>
                <td v-for="gpu in gpus" :key="gpu.id" class="action-cell">
                  <button class="small-btn" @click="$emit('set-benchmark', gpu)" :disabled="gpu.id === benchGpu?.id">基准</button>
                  <button class="small-btn" @click="$emit('remove-compare', gpu)">移除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  gpus: { type: Array, default: () => [] },
  benchGpu: { type: Object, default: null },
  defaultBenchmarks: { type: Object, default: () => ({}) }, // 各分辨率默认基准
  initialRes: { type: String, default: '2K' } // 从 Dashboard 传入的当前分辨率
})

const emit = defineEmits(['set-benchmark', 'remove-compare'])

const visible = ref(false)
const ready = ref(false)
const priceInputs = reactive({})

// 分辨率切换
const resOptions = ['1080P', '2K', '4K']
const resIndex = ref(1)
const currentRes = computed(() => resOptions[resIndex.value])

function cycleRes() {
  resIndex.value = (resIndex.value + 1) % 3
}

// 初始化价格输入（默认全新价）
function initPriceInputs(gpuList) {
  gpuList.forEach(gpu => {
    if (!priceInputs[gpu.id]) {
      priceInputs[gpu.id] = { price: gpu.new_price ?? '' }
    }
  })
}

watch(() => props.gpus, (newGpus) => {
  initPriceInputs(newGpus)
}, { immediate: true, deep: true })

function show(res) {
  const idx = resOptions.indexOf(res || props.initialRes)
  resIndex.value = idx !== -1 ? idx : 1
  initPriceInputs(props.gpus)
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'gpuCompare' }, '')
  }
}

function close() {
  visible.value = false
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
}

const benchName = computed(() => {
  if (props.benchGpu) return shortGpu(props.benchGpu.model)
  const defaults = props.defaultBenchmarks
  if (currentRes.value === '1080P') return 'RTX 2060 6G'
  if (currentRes.value === '2K') return 'RTX 4060'
  return 'RTX 5070'
})

function shortGpu(m) {
  return m?.replace(/NVIDIA GeForce |AMD Radeon |INTEL Arc /i, '').replace(/NVIDIA |AMD |INTEL /i, '').replace(/\b(RTX|GTX|RX)\s*/gi, '').trim() || ''
}

function getBrandClass(gpu) {
  const u = (gpu?.model || '').toUpperCase()
  if (u.includes('NVIDIA') || u.includes('RTX') || u.includes('GTX')) return 'nvidia'
  if (u.includes('AMD') || u.includes('RX') || u.includes('RADEON')) return 'amd'
  if (u.includes('INTEL') || u.includes('ARC')) return 'intel'
  return ''
}

function getSpecSummary(gpu) {
  if (!gpu) return ''
  const parts = []
  if (gpu.vram) parts.push(gpu.vram)
  if (gpu.shader_units) parts.push(gpu.shader_units + 'SP')
  if (gpu.game_freq) parts.push(gpu.game_freq + 'MHz')
  return parts.join(' · ')
}

function getGamePct(gpu) {
  if (!gpu) return '-'
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
  if (!gpu[field] || !base) return '-'
  return Math.round((gpu[field] / base) * 100)
}

function getRenderPct(gpu) {
  if (!gpu) return '-'
  const baseGpu = props.defaultBenchmarks?.render
  const base = baseGpu?.render_performance
  if (!gpu.render_performance || !base) return '-'
  return Math.round((gpu.render_performance / base) * 100)
}

function getGameValue(gpu) {
  const price = priceInputs[gpu.id]?.price
  if (!gpu || !price || Number(price) <= 0) return '-'
  const getGamePerfForValue = () => {
  if (currentRes.value === '1080P') return gpu.abs_game_performance_1080p
  if (currentRes.value === '4K') return gpu.abs_game_performance_4k
  return gpu.abs_game_performance_2k // 默认 2K
}
const perf = getGamePerfForValue() || 0
  return perf ? Math.round((perf / Number(price)) * 20) : '-'
}

function getRenderValue(gpu) {
  const price = priceInputs[gpu.id]?.price
  if (!gpu || !price || Number(price) <= 0) return '-'
  const perf = gpu.render_performance || 0
  return perf ? Math.round((perf / Number(price)) * 40) : '-'
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
  padding: 0.6rem 1rem; border-bottom: 1px solid var(--border);
  background: var(--modal-deal-header-bg);
  border-radius: 20px 20px 0 0; flex-shrink: 0;
}
.modal-header h3 { color: var(--accent); margin: 0; font-size: 1rem; }

.modal-close-btn {
  background: none; border: none; color: var(--text-secondary);
  font-size: 1.4rem; cursor: pointer;
  min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.modal-close-btn:active { transform: scale(0.85); color: var(--text-primary); }

.compare-body { padding: 0; overflow: hidden; }
.table-scroll { overflow-x: auto; width: 100%; }

.compare-table { width: 100%; border-collapse: collapse; min-width: 320px; }
.compare-table th, .compare-table td {
  padding: 0.65rem 0.5rem; font-size: 0.95rem;
  border-bottom: 1px solid var(--table-divider);
  text-align: center;
}
.fixed-col {
  position: sticky; left: 0; background: var(--bg-tertiary); z-index: 2;
  text-align: left; width: 100px; min-width: 100px;
}
.gpu-col { min-width: 140px; font-weight: 600; }
.gpu-col.nvidia { color: var(--brand-nvidia); }
.gpu-col.amd { color: var(--brand-amd); }
.gpu-col.intel { color: var(--brand-intel); }
.gpu-name { font-size: 0.95rem; }
.spec-summary {
  font-size: 0.7rem; color: var(--text-secondary); font-weight: 400;
  white-space: normal; word-break: break-word; line-height: 1.3;
}

.label-cell { text-align: left; color: var(--text-secondary); font-weight: 500; font-size: 0.95rem; vertical-align: middle; }
.label-text { display: block; font-size: 0.8rem; line-height: 1.2; }
.res-toggle-compare {
  padding: 0.05rem 0.4rem;
  font-size: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--accent);
  cursor: pointer;
  margin-top: 2px;
  transition: all 0.15s;
}
.res-toggle-compare:active { transform: scale(0.95); }

.value-cell { font-family: 'JetBrains Mono', monospace; color: var(--text-primary); font-size: 1rem; }
.value-cell.game { color: var(--accent); }
.value-cell.multi { color: var(--value-cyan-text); }

.price-cell { padding: 0.4rem 0.5rem; }
.price-input-row {
  display: flex; align-items: center; justify-content: center; gap: 0.2rem;
}
.value-currency { font-size: 0.95rem; color: var(--text-secondary); }
.value-input {
  width: 80px; padding: 0.2rem 0.3rem; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: 4px;
  color: var(--text-primary); font-size: 0.95rem; text-align: center;
  font-family: 'JetBrains Mono', monospace;
}
.value-input:focus { outline: none; border-color: var(--accent); }

.action-cell { white-space: nowrap; }
.small-btn {
  padding: 0.2rem 0.6rem; font-size: 0.8rem;
  background: var(--highlight-bg);
  border: 1px solid var(--border); border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer; margin: 0 2px; transition: all 0.15s;
}
.small-btn:active { transform: scale(0.95); }
.small-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (min-width: 769px) {
  .modal-overlay { align-items: center; }
  .modal-panel { max-width: 720px; border-radius: 16px; }
  .modal-header { border-radius: 16px 16px 0 0; }
}
</style>