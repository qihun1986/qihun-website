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
                <th v-for="cpu in cpus" :key="cpu.id" class="cpu-col" :class="getBrandClass(cpu)">
                  <div>{{ cpu.model_short || formatCpuName(cpu.model) }}</div>
                  <div class="spec-summary">{{ getSpecSummary(cpu) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-cell">游戏性能</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell game">{{ getGamePct(cpu) }}%</td>
              </tr>
              <tr>
                <td class="label-cell">多核性能</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell multi">{{ getMultiPct(cpu) }}%</td>
              </tr>
              <tr>
                <td class="label-cell">R23</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell">{{ cpu.r23_single ?? '-' }} / {{ cpu.r23_multi ?? '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">3DMark</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell">{{ cpu["3dmark_single"] ?? '-' }} / {{ cpu["3dmark_multi"] ?? '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">CPU-Z</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell">{{ cpu.cpuz_single ?? '-' }} / {{ cpu.cpuz_multi ?? '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">功耗</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell">
                  <div>{{ cpu.tdp ? '官方' + cpu.tdp + 'W' : '-' }}</div>
                  <div>{{ cpu.power_full ? '满载' + cpu.power_full + 'W' : '-' }}</div>
                  <div>{{ cpu.power_game ? '游戏' + cpu.power_game + 'W' : '-' }}</div>
                </td>
              </tr>
              <tr>
                <td class="label-cell"></td>
                <td v-for="cpu in cpus" :key="cpu.id" class="action-cell">
                  <button class="small-btn" @click="emit('set-benchmark', cpu)" :disabled="cpu.id === benchmarkCpu?.id">基准</button>
                  <button class="small-btn" @click="emit('remove-compare', cpu)">移除</button>
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
  cpus: { type: Array, default: () => [] },
  benchmarkCpu: { type: Object, default: null }
})

const emit = defineEmits(['set-benchmark', 'remove-compare'])

const visible = ref(false)
const ready = ref(false)

function show() {
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'tierCompare' }, '')
  }
}

function close() {
  visible.value = false
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
}

const benchName = computed(() => props.benchmarkCpu ? formatCpuName(props.benchmarkCpu.model) : '12490F')

function getGamePct(cpu) {
  if (!cpu || !props.benchmarkCpu) return '-'
  const base = props.benchmarkCpu.abs_game_performance
  return cpu.abs_game_performance && base ? Math.round((cpu.abs_game_performance / base) * 100) : '-'
}

function getMultiPct(cpu) {
  if (!cpu || !props.benchmarkCpu) return '-'
  const base = props.benchmarkCpu.abs_multi_performance
  return cpu.abs_multi_performance && base ? Math.round((cpu.abs_multi_performance / base) * 100) : '-'
}

function getSpecSummary(cpu) {
  if (!cpu) return ''
  const parts = []
  if (cpu.cores && cpu.threads) parts.push(`${cpu.cores}C${cpu.threads}T`)
  if (cpu.base_freq && cpu.boost_freq) parts.push(`${cpu.base_freq}-${cpu.boost_freq}G`)
  if (cpu.l3_cache) parts.push(cpu.l3_cache)
  return parts.join(', ')
}

function getBrandClass(cpu) {
  const m = cpu?.model?.toUpperCase() || ''
  if (m.includes('AMD')) return 'amd'
  return 'intel'
}

function formatCpuName(model) {
  return model
    .replace(/INTEL CORE /i, '')
    .replace(/AMD RYZEN /i, '')
    .replace(/INTEL /i, '')
    .replace(/AMD /i, '')
    .trim()
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
  border-radius: 20px 20px 0 0; flex-shrink: 0;
  background: var(--modal-deal-header-bg);   /* ★ 全局中性渐变背景 */
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

.compare-table {
  width: 100%; border-collapse: collapse; min-width: 320px;
}
.compare-table th, .compare-table td {
  padding: 0.65rem 0.5rem; font-size: 0.85rem;
  border-bottom: 1px solid var(--table-divider);
  text-align: center;
}
.fixed-col {
  position: sticky; left: 0; background: var(--bg-tertiary); z-index: 2;
  text-align: left; width: 80px; min-width: 80px;
}
.cpu-col { min-width: 120px; font-weight: 600; }
.cpu-col.intel { color: var(--brand-intel); }
.cpu-col.amd { color: var(--brand-amd); }
.spec-summary { font-size: 0.65rem; color: var(--text-secondary); font-weight: 400; }

.label-cell { text-align: left; color: var(--text-secondary); font-weight: 500; }
.value-cell { font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
.value-cell.game { color: var(--accent); }
.value-cell.multi { color: var(--value-cyan-text); }

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