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
        <h3>📊 CPU 对比 (基准: {{ benchName }})</h3>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body compare-body">
        <div class="table-scroll">
          <table class="compare-table">
            <thead>
              <tr>
                <th class="fixed-col"></th>
                <th v-for="cpu in cpus" :key="cpu.id" class="cpu-col" :class="getBrandClass(cpu)">
                  <div class="cpu-name">{{ cpu.model_short || formatCpuName(cpu.model) }}</div>
                  <div class="spec-summary">{{ getSpecSummary(cpu) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 游戏性能 -->
              <tr>
                <td class="label-cell">游戏性能</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell game">{{ getGamePct(cpu) }}%</td>
              </tr>
              <!-- 游戏性价比 -->
              <tr>
                <td class="label-cell">性价比</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell game">{{ getGameValue(cpu) }}</td>
              </tr>
              <!-- 多核性能 -->
              <tr>
                <td class="label-cell">多核性能</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell multi">{{ getMultiPct(cpu) }}%</td>
              </tr>
              <!-- 多核性价比 -->
              <tr>
                <td class="label-cell">性价比</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell multi">{{ getMultiValue(cpu) }}</td>
              </tr>
              <!-- 价格行（实时编辑） -->
              <tr>
                <td class="label-cell">价格</td>
                <td v-for="cpu in cpus" :key="cpu.id" class="value-cell price-cell">
                  <div class="price-input-row">
                    <span class="value-currency">¥</span>
                    <input
                      v-model.number="priceInputs[cpu.id].price"
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
                <td v-for="cpu in cpus" :key="cpu.id" class="action-cell">
                  <button class="small-btn" @click="$emit('set-benchmark', cpu)" :disabled="cpu.id === benchCpu?.id">基准</button>
                  <button class="small-btn" @click="$emit('remove-compare', cpu)">移除</button>
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
  cpus: { type: Array, default: () => [] },
  benchCpu: { type: Object, default: null }
})

const emit = defineEmits(['set-benchmark', 'remove-compare'])

const visible = ref(false)
const ready = ref(false)
const priceInputs = reactive({})

// 初始化所有 CPU 的价格输入框
function initPriceInputs(cpuList) {
  cpuList.forEach(cpu => {
    if (!priceInputs[cpu.id]) {
      priceInputs[cpu.id] = {
        price: cpu.new_price ?? ''
      }
    }
  })
}

watch(() => props.cpus, (newCpus) => {
  initPriceInputs(newCpus)
}, { immediate: true, deep: true })

function show() {
  const panel = document.querySelector('.modal-panel')
  if (panel) panel.style.transform = ''
  initPriceInputs(props.cpus)
  visible.value = true
  if (typeof window !== 'undefined' && !window.history.state?.modal) {
    history.pushState({ modal: 'cpuCompare' }, '')
  }
}

function close() {
  visible.value = false
  if (typeof window !== 'undefined' && window.history.state?.modal) {
    history.back()
  }
}

const benchName = computed(() => props.benchCpu ? formatCpuName(props.benchCpu.model) : '12490F')

function formatCpuName(model) {
  return model
    .replace(/INTEL CORE /i, '')
    .replace(/AMD RYZEN /i, '')
    .replace(/INTEL /i, '')
    .replace(/AMD /i, '')
    .trim()
}

function getBrandClass(cpu) {
  const m = cpu?.model?.toUpperCase() || ''
  if (m.includes('AMD')) return 'amd'
  return 'intel'
}

function getSpecSummary(cpu) {
  if (!cpu) return ''
  const parts = []
  if (cpu.cores && cpu.threads) parts.push(`${cpu.cores}核${cpu.threads}线程`)
  if (cpu.base_freq && cpu.boost_freq) parts.push(`${cpu.base_freq}-${cpu.boost_freq}GHz`)
  if (cpu.l3_cache) parts.push(cpu.l3_cache)
  return parts.join(', ')
}

function getGamePct(cpu) {
  if (!cpu || !props.benchCpu) return '-'
  const base = props.benchCpu.abs_game_performance
  return cpu.abs_game_performance && base ? Math.round((cpu.abs_game_performance / base) * 100) : '-'
}

function getMultiPct(cpu) {
  if (!cpu || !props.benchCpu) return '-'
  const base = props.benchCpu.abs_multi_performance
  return cpu.abs_multi_performance && base ? Math.round((cpu.abs_multi_performance / base) * 100) : '-'
}

function getGameValue(cpu) {
  const price = priceInputs[cpu.id]?.price
  if (!cpu || !price || Number(price) <= 0) return '-'
  const perf = cpu.abs_game_performance
  return perf ? Math.round((perf / Number(price)) * 10) : '-'
}

function getMultiValue(cpu) {
  const price = priceInputs[cpu.id]?.price
  if (!cpu || !price || Number(price) <= 0) return '-'
  const perf = cpu.abs_multi_performance
  return perf ? Math.round((perf / Number(price)) * 4) : '-'
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
.cpu-col { min-width: 140px; font-weight: 600; }
.cpu-col.intel { color: var(--brand-intel); }
.cpu-col.amd { color: var(--brand-amd); }
.cpu-name { font-size: 0.95rem; }
.spec-summary {
  font-size: 0.7rem; color: var(--text-secondary); font-weight: 400;
  white-space: normal; word-break: break-word; line-height: 1.3;
}

.label-cell { text-align: left; color: var(--text-secondary); font-weight: 500; font-size: 0.95rem; }
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