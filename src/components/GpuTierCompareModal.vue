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
        <h3>📊 对比 (基准: {{ benchName }})</h3>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body compare-body">
        <div class="table-scroll">
          <table class="compare-table">
            <thead>
              <tr>
                <th class="fixed-col"></th>
                <th v-for="gpu in gpus" :key="gpu.id" class="gpu-col" :class="getBrandClass(gpu)">
                  <div>{{ shortGpu(gpu.model) }}</div>
                  <div class="spec-summary">{{ getSpecSummary(gpu) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 游戏性能（同一行内，标签下方放切换按钮） -->
              <tr class="game-row">
                <td class="label-cell">
                  <span class="label-text">游戏性能</span>
                  <button class="res-toggle-compare" @click="cycleRes">{{ currentRes }}</button>
                </td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell game">{{ getGamePct(gpu) }}%</td>
              </tr>
              <!-- 创作效率 -->
              <tr>
                <td class="label-cell">创作效率</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell multi">{{ getRenderPct(gpu) }}%</td>
              </tr>
              <!-- AI性能 -->
              <tr>
                <td class="label-cell">AI性能</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell ai">{{ getAiPct(gpu) }}%</td>
              </tr>
              <!-- 3DMark -->
              <tr>
                <td class="label-cell">3DMark</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell">{{ gpu.timespy ?? '-' }} / {{ gpu.steel_nomad ?? '-' }}</td>
              </tr>
              <!-- Blender -->
              <tr>
                <td class="label-cell">Blender</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell">{{ gpu.render_performance ?? '-' }}</td>
              </tr>
              <!-- 功耗 -->
              <tr>
                <td class="label-cell">功耗</td>
                <td v-for="gpu in gpus" :key="gpu.id" class="value-cell">{{ gpu.tdp ? gpu.tdp + 'W' : '-' }}</td>
              </tr>
              <!-- 操作按钮 -->
              <tr>
                <td class="label-cell"></td>
                <td v-for="gpu in gpus" :key="gpu.id" class="action-cell">
                  <button class="small-btn" @click="$emit('set-benchmark', gpu)" :disabled="gpu.id === benchmarkGpu?.id">基准</button>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  gpus: { type: Array, default: () => [] },
  benchmarkGpu: { type: Object, default: null }
})

const emit = defineEmits(['set-benchmark', 'remove-compare'])

const visible = ref(false)
const ready = ref(false)

const resOptions = ['1080P', '2K', '4K']
const resIndex = ref(1)
const currentRes = computed(() => resOptions[resIndex.value])

function cycleRes() {
  resIndex.value = (resIndex.value + 1) % 3
}

function show(initialRes) {
  if (initialRes && resOptions.includes(initialRes)) {
    resIndex.value = resOptions.indexOf(initialRes)
  } else {
    resIndex.value = 1
  }
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'gpuTierCompare' }, '')
  }
}

function close() {
  visible.value = false
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
}

const benchName = computed(() => props.benchmarkGpu ? shortGpu(props.benchmarkGpu.model) : 'RTX 4060')

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
  if (!gpu || !props.benchmarkGpu) return '-'
  const fieldMap = {
    '1080P': 'abs_game_performance_1080p',
    '2K': 'abs_game_performance_2k',
    '4K': 'abs_game_performance_4k'
  }
  const field = fieldMap[currentRes.value]
  if (!gpu[field] || !props.benchmarkGpu[field]) return '-'
  return Math.round((gpu[field] / props.benchmarkGpu[field]) * 100)
}

function getRenderPct(gpu) {
  if (!gpu || !props.benchmarkGpu?.render_performance) return '-'
  return gpu.render_performance ? Math.round((gpu.render_performance / props.benchmarkGpu.render_performance) * 100) : '-'
}

function getAiPct(gpu) {
  if (!gpu || !props.benchmarkGpu?.ai_performance) return '-'
  return gpu.ai_performance ? Math.round((gpu.ai_performance / props.benchmarkGpu.ai_performance) * 100) : '-'
}

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
  background: var(--modal-bg); border-radius: 20px 20px 0 0;
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
  padding: 0.65rem 0.5rem; font-size: 0.85rem;
  border-bottom: 1px solid var(--table-divider);
  text-align: center;
}
.fixed-col {
  position: sticky; left: 0; background: var(--bg-tertiary); z-index: 2;
  text-align: left; width: 80px; min-width: 80px;
}
.gpu-col { min-width: 130px; font-weight: 600; }
.gpu-col.nvidia { color: var(--brand-nvidia); }
.gpu-col.amd { color: var(--brand-amd); }
.gpu-col.intel { color: var(--brand-intel); }
.spec-summary { font-size: 0.65rem; color: var(--text-secondary); font-weight: 400; }

.label-cell { text-align: left; color: var(--text-secondary); font-weight: 500; }

/* 游戏性能行紧凑样式 */
.game-row td {
  padding: 0.25rem 0.5rem;
}
.label-text {
  display: block;
  font-size: 0.8rem;
  line-height: 1.2;
  color: var(--text-secondary);
  font-weight: 500;
}
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

.value-cell { font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
.value-cell.game { color: var(--accent); }
.value-cell.multi { color: var(--value-cyan-text); }
.value-cell.ai { color: var(--value-red-text); }

.action-cell { white-space: nowrap; }
.small-btn {
  padding: 0.15rem 0.5rem; font-size: 0.7rem;
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