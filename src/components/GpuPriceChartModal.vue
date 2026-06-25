<template>
  <div :class="{ show: visible, ready: ready }" class="modal-overlay" @click.self="close">
    <div class="modal-panel" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="modal-close-btn" @click="close" aria-label="关闭">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="chart-loading">📊 魂哥正在加载价格数据...</div>
        <div v-else-if="!hasData" class="chart-empty">暂无历史价格记录</div>
        <div v-else>
          <div v-if="minNewPrice || minUsedPrice" class="price-summary">
            <span v-if="minNewPrice">全新最低 <strong>¥{{ minNewPrice }}</strong></span>
            <span v-if="minNewPrice && minUsedPrice"> | </span>
            <span v-if="minUsedPrice">二手最低 <strong>¥{{ minUsedPrice }}</strong></span>
          </div>
          <div ref="chartContainer" class="chart-container"></div>
          <p class="chart-hint">📈 数据来自历史记录，点击可查看详细走势</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getData } from '../lib/getData'

const visible = ref(false)
const ready = ref(false)
const title = ref('')
const loading = ref(false)
const hasData = ref(false)
const minNewPrice = ref(null)
const minUsedPrice = ref(null)
const chartContainer = ref(null)
let chartInstance = null

const cache = new Map()

async function loadHistory(model) {
  if (cache.has(model)) return cache.get(model)
  const { data } = await getData(
    'gpu_price_history',
    'recorded_at,new_price,used_price',
    { eq: ['model', model], order: ['recorded_at', true] }
  )
  cache.set(model, data || [])
  return data || []
}

async function show(gpuModel) {
  title.value = gpuModel ? `${gpuModel} - 历史价格` : '历史价格'
  visible.value = true
  loading.value = true
  hasData.value = false
  minNewPrice.value = null
  minUsedPrice.value = null
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  await nextTick()
  const history = await loadHistory(gpuModel)
  loading.value = false
  if (!history || history.length === 0) { hasData.value = false; return }
  const newPrices = history.map(h => h.new_price).filter(p => p !== null)
  const usedPrices = history.map(h => h.used_price).filter(p => p !== null)
  minNewPrice.value = newPrices.length ? Math.min(...newPrices) : null
  minUsedPrice.value = usedPrices.length ? Math.min(...usedPrices) : null
  hasData.value = true
  await nextTick()
  renderChart(history)
  if (!window.history.state?.modal) history.pushState({ modal: 'gpuPriceChart' }, '')
}

function close() {
  visible.value = false
  minNewPrice.value = null
  minUsedPrice.value = null
  setTimeout(() => { if (chartInstance && !visible.value) { chartInstance.dispose(); chartInstance = null } }, 350)
  if (window.history.state?.modal) history.back()
}

function renderChart(history) {
  // 从 CSS 变量读取颜色（支持浅色/深色自适应）
  const rootStyle = getComputedStyle(document.documentElement)
  const C = s => rootStyle.getPropertyValue(s).trim()
  const chartText    = C('--chart-text') || 'var(--chart-text)'
  const chartBorder  = C('--chart-border') || 'var(--chart-border)'
  const chartLabel   = C('--chart-label') || 'var(--chart-label)'
  const chartLegend  = C('--chart-legend') || 'var(--chart-legend)'
  const chartSplit   = C('--chart-split') || 'var(--chart-tooltip-bg)'
  const chartTooltipBg    = C('--chart-tooltip-bg') || 'var(--chart-tooltip-bg)'
  const chartTooltipBorder = C('--chart-tooltip-border') || 'var(--chart-border)'
  const chartLinePrimary   = C('--chart-line-primary') || 'var(--chart-line-primary)'
  const chartLineSecondary = C('--chart-line-secondary') || 'var(--chart-line-secondary)'

  if (!chartContainer.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartContainer.value)
  const dates = history.map(item => item.recorded_at.slice(5))
  const newPrices = history.map(item => item.new_price)
  const usedPrices = history.map(item => item.used_price)
  chartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: chartTooltipBg, borderColor: chartTooltipBorder, textStyle: { color: chartText } },
    legend: { data: ['全新价', '二手价'], textStyle: { color: chartLegend, fontSize: 13 }, top: 10 },
    grid: { left: '12%', right: '8%', bottom: '15%', top: '22%' },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: chartBorder } }, axisLabel: { color: chartLabel, rotate: 45, fontSize: 12 } },
    yAxis: { type: 'value', scale: true, axisLine: { lineStyle: { color: chartBorder } }, axisLabel: { color: chartLabel, fontSize: 12 }, splitLine: { lineStyle: { color: chartSplit } } },
    series: [
      { name: '全新价', type: 'line', data: newPrices, smooth: false, lineStyle: { color: chartLinePrimary, width: 2 }, itemStyle: { color: chartLinePrimary }, connectNulls: true },
      { name: '二手价', type: 'line', data: usedPrices, smooth: false, lineStyle: { color: chartLineSecondary, width: 2, type: 'dashed' }, itemStyle: { color: chartLineSecondary }, connectNulls: true }
    ]
  })
}

let startY = 0, movedY = 0
const onTouchStart = (e) => { startY = e.touches[0].clientY }
const onTouchMove = (e) => { movedY = e.touches[0].clientY - startY; if (movedY > 0) e.currentTarget.style.transform = `translateY(${movedY}px)` }
const onTouchEnd = () => { if (movedY > 120) close(); else e.currentTarget.style.transform = ''; movedY = 0 }

const onPopState = () => { if (visible.value) close() }

onMounted(() => {
  ready.value = true
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
  if (chartInstance) chartInstance.dispose()
})

defineExpose({ show })
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; pointer-events: none; transition: none; }
.modal-overlay.ready { transition: opacity 0.25s ease, visibility 0.25s ease; }
.modal-overlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.modal-panel {
  background: var(--modal-bg); border-radius: 20px 20px 0 0;
  width: 100%; max-height: 85vh; display: flex; flex-direction: column;
  box-shadow: var(--shadow-modal);   /* ★ 全局阴影 */
  transform: translateY(100%);
}
.modal-overlay.ready .modal-panel { transition: transform 0.3s ease; }
.modal-overlay.show .modal-panel { transform: translateY(0); }
.modal-handle {
  width: 36px; height: 4px;
  background: var(--modal-handle);   /* ★ 全局横杠颜色 */
  border-radius: 2px; margin: 8px auto 0;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 1rem; border-bottom: 1px solid var(--border);
  border-radius: 20px 20px 0 0; flex-shrink: 0;
  background: var(--modal-deal-header-bg);   /* ★ 中性渐变背景 */
}
.modal-header h3 { color: var(--accent); margin: 0; font-size: 1rem; }
.modal-close-btn {
  background: none; border: none; color: var(--text-secondary);
  font-size: 1.4rem; cursor: pointer;
  min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.modal-close-btn:active { transform: scale(0.85); color: var(--text-primary); }   /* ★ 全局文字色 */
.modal-body { flex: 1; overflow-y: auto; padding: 1rem; }
.price-summary { display: flex; justify-content: center; gap: 0.8rem; margin-bottom: 0.8rem; font-size: 0.9rem; color: var(--text-secondary); }
.price-summary strong { color: var(--accent); font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; }
.chart-container { width: 100%; height: 220px; }
.chart-loading, .chart-empty { display: flex; align-items: center; justify-content: center; height: 220px; color: var(--text-secondary); font-size: 0.9rem; }
.chart-hint { text-align: center; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; }
@media (min-width: 769px) {
  .modal-overlay { align-items: center; }
  .modal-panel { max-width: 680px; border-radius: 16px; }
  .modal-header { border-radius: 16px 16px 0 0; }
}
</style>