<template>
  <div class="home">
    <!-- 顶部区域：标签 + 轮播图 -->
    <div class="top-bar">
      <div class="tabs">
        <router-link to="/" class="tab-btn" :class="{ active: $route.path === '/' }">CPU榜</router-link>
        <router-link to="/gpu" class="tab-btn" :class="{ active: $route.path === '/gpu' }">显卡榜</router-link>
      </div>

      <div class="top-bar-spacer"></div>

      <!-- 顶部轮播图（纯文字占位，与CPU榜一致） -->
      <a 
        :href="carouselItems[currentIndex].link" 
        target="_blank" 
        rel="noopener"
        class="top-carousel"
        @mouseenter="stopAutoPlay" 
        @mouseleave="startAutoPlay"
      >
        <span class="carousel-text">{{ carouselItems[currentIndex].title }}</span>
        <div class="carousel-dots">
          <button 
            v-for="(_, idx) in carouselItems" 
            :key="idx"
            :class="{ active: idx === currentIndex }"
            @click.prevent="goToSlide(idx)"
            class="dot-btn"
            :aria-label="`切换到第${idx + 1}张`"
          ></button>
        </div>
      </a>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="skeleton-wrapper" aria-label="正在加载数据">
      <table class="cpu-table skeleton-table">
        <thead>
          <tr>
            <th class="rank-col"><div class="skeleton-bar w60"></div></th>
            <th class="model-col"><div class="skeleton-bar w120"></div></th>
            <th class="game-col"><div class="skeleton-bar w60"></div></th>
            <th class="perf-col"><div class="skeleton-bar w60"></div></th>
            <th class="price-col"><div class="skeleton-bar w80"></div></th>
            <th class="value-col"><div class="skeleton-bar w60"></div></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in 12" :key="i" class="skeleton-row">
            <td><div class="skeleton-bar w20"></div></td>
            <td><div class="skeleton-bar" :style="{ width: (50 + (i % 3) * 25) + 'px' }"></div></td>
            <td><div class="skeleton-bar w30"></div></td>
            <td><div class="skeleton-bar w30"></div></td>
            <td><div class="skeleton-bar w70"></div></td>
            <td><div class="skeleton-bar w40"></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-box">
      {{ error }}
    </div>

    <!-- 表格 -->
    <div v-else class="table-wrapper" role="region" aria-label="显卡性价比排行榜">
      <table class="cpu-table">
        <caption class="sr-only">显卡性价比排行榜 - 基于实测数据</caption>
        <thead>
          <tr>
            <th class="rank-col" scope="col">
              <div class="rank-header">
                <span class="rank-count">共{{ filteredGpus.length }}款</span>
                <span class="rank-label">排名</span>
              </div>
            </th>
            <th scope="col" class="sortable model-col" @click="sort('model')">
              <div class="th-inner">
                <span class="th-label">
                  型号<span class="sort-icon">{{ getSortIcon('model') }}</span>
                </span>
                <div class="inline-toggle" @click.stop>
                  <button
                    :class="{ active: showMode === 'hot' }"
                    @click="showMode = 'hot'"
                    class="toggle-btn"
                  >热门</button>
                  <span class="toggle-sep">/</span>
                  <button
                    :class="{ active: showMode === 'all' }"
                    @click="showMode = 'all'; priceType = 'used'"
                    class="toggle-btn"
                  >全部</button>
                </div>
              </div>
            </th>

            <!-- 游戏性能（可切换分辨率） -->
            <th scope="col" class="game-col" @click="sort('game')">
              <div class="th-inner th-center">
                <span class="th-label">
                  游戏性能<span class="sort-icon">{{ getSortIcon('game') }}</span>
                </span>
                <!-- 分辨率切换按钮 -->
                <div class="res-toggle" @click.stop>
                  <button
                    v-for="res in ['1080P', '2K', '4K']"
                    :key="res"
                    :class="{ active: displayRes === res }"
                    @click="displayRes = res as any"
                    class="res-btn"
                  >{{ res }}</button>
                </div>
              </div>
            </th>

            <!-- 创作效率 -->
            <th scope="col" class="sortable perf-col" @click="switchToRender()">
              <div class="th-inner th-center">
                <span class="th-label">
                  创作效率
                  <span class="sort-icon">{{ getSortIcon('render') }}</span>
                </span>
              </div>
            </th>

            <!-- 价格 -->
            <th scope="col" class="sortable price-col" @click="sort('price')">
              <div class="th-inner th-center">
                <span class="th-label">
                  价格<span class="sort-icon">{{ getSortIcon('price') }}</span>
                  <span class="price-hint" @click.stop title="点击查看历史价格">ⓘ</span>
                </span>
                <div class="inline-toggle" @click.stop>
                  <button
                    :class="{ active: priceType === 'new' }"
                    @click="priceType = 'new'"
                    class="toggle-btn"
                  >全新</button>
                  <span class="toggle-sep">/</span>
                  <button
                    :class="{ active: priceType === 'used' }"
                    @click="priceType = 'used'"
                    class="toggle-btn"
                  >二手</button>
                </div>
              </div>
            </th>

            <!-- 性价比 -->
            <th scope="col" class="sortable value-col" @click="sort('value')">
              <div class="th-inner th-center">
                <span class="th-label">
                  性价比
                  <span class="sort-icon">{{ getSortIcon('value') }}</span>
                </span>
                <div class="inline-toggle value-toggle" @click.stop>
                  <select
                    :value="valueMode"
                    @change="valueMode = ($event.target as HTMLSelectElement).value as any"
                    class="value-select"
                  >
                    <option value="perf1080">1080P性价比</option>
                    <option value="perf2k">2K性价比</option>
                    <option value="perf4k">4K性价比</option>
                    <option value="render">创作性价比</option>
                  </select>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(gpu, index) in sortedGpus"
            :key="gpu.id"
            class="cpu-row"
          >
            <td class="rank">{{ index + 1 }}</td>
            <td class="model" @click="showSpecs(gpu)">
              <span class="model-name" :class="getBrandClass(gpu.model)">{{ gpu.model }}</span>
            </td>
            <!-- 游戏性能：显示当前分辨率的相对分 -->
            <td class="game-perf" aria-label="游戏性能">
              {{ getDisplayGamePerf(gpu) }}
            </td>
            <!-- 创作效率：显示相对分 -->
            <td class="perf" aria-label="创作效率">{{ getRelativeRender(gpu) }}</td>
            <!-- 价格 -->
            <td
              class="price-cell"
              @click="showPriceChart(gpu)"
              :title="getPriceTitle(gpu)"
            >
              <div class="price-content">
                <span class="price-main">
                  <span v-if="getDisplayPrice(gpu)" class="price-value">{{ getDisplayPrice(gpu) }}</span>
                  <span v-else class="no-price">-</span>
                </span>
                <span v-if="getDisplayPrice(gpu)" class="price-indicators">
                  <span
                    class="price-change"
                    :class="{
                      'price-up': getPriceChange(gpu).direction === 'up',
                      'price-down': getPriceChange(gpu).direction === 'down',
                      'price-flat': getPriceChange(gpu).direction === 'flat'
                    }"
                  >{{ priceChangeText(gpu) }}</span>
                  <span class="trend-icon" aria-hidden="true">{{ getPriceChange(gpu).direction === 'up' ? '📈' : getPriceChange(gpu).direction === 'down' ? '📉' : '📊' }}</span>
                  <span v-if="isNearHistoricalLow(gpu)" class="fire-icon" title="接近历史低价">🔥</span>
                </span>
                <span v-else class="trend-icon muted" aria-hidden="true">📊</span>
              </div>
            </td>
            <!-- 性价比 -->
            <td class="value-cell" aria-label="性价比" :title="getPreciseValue(gpu)">
              {{ getDisplayValue(gpu) }}<span v-if="shouldShowCrown(gpu)" class="crown-icon">👑</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 无数据提示 -->
    <div v-if="!loading && !error && filteredGpus.length === 0" class="no-data">
      <p>暂无数据</p>
    </div>

    <!-- 参数弹窗 -->
    <div v-if="showSpecsModal" class="modal-overlay" @click.self="closeModals" role="dialog" aria-modal="true">
      <div class="modal specs-modal">
        <div class="modal-header">
          <h3>
            {{ selectedGpu?.model }}
            <span v-if="getReleaseDate(selectedGpu?.model || '')" class="release-badge">
              ({{ getReleaseDate(selectedGpu?.model || '') }})
            </span>
          </h3>
          <button class="close-btn" @click="closeModals" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">显存</span>
              <span class="spec-value">{{ selectedGpu?.vram || '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">流处理器/光追单元</span>
              <span class="spec-value">{{ selectedGpu?.shader_units || '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">核心频率</span>
              <span class="spec-value">{{ selectedGpu?.game_freq ? `${selectedGpu.game_freq} MHz` : '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">TDP</span>
              <span class="spec-value">{{ selectedGpu?.tdp ? `${selectedGpu.tdp} W` : '-' }}</span>
            </div>
          </div>
          <div class="perf-display">
            <div class="perf-item">
              <span class="perf-label">1080P 相对分</span>
              <span class="perf-value game">{{ getRelativePerf1080(selectedGpu!) }}</span>
            </div>
            <div class="perf-item">
              <span class="perf-label">2K 相对分</span>
              <span class="perf-value game">{{ getRelativePerf2k(selectedGpu!) }}</span>
            </div>
            <div class="perf-item">
              <span class="perf-label">4K 相对分</span>
              <span class="perf-value game">{{ getRelativePerf4k(selectedGpu!) }}</span>
            </div>
            <div class="perf-item">
              <span class="perf-label">创作效率</span>
              <span class="perf-value multi">{{ getRelativeRender(selectedGpu!) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 价格折线图弹窗 -->
    <div v-if="showChartModal" class="modal-overlay" @click.self="closeModals" role="dialog" aria-modal="true">
      <div class="modal chart-modal">
        <div class="modal-header">
          <h3>{{ selectedGpu?.model }} - 历史价格</h3>
          <button class="close-btn" @click="closeModals" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <div ref="chartContainer" class="chart-container"></div>
          <div v-if="priceChartLoading" class="chart-loading">
            <div class="spinner"></div>
            <span>加载历史价格...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { supabase } from '@/lib/supabase'
import gpuReleaseDates from '@/assets/gpu_release_dates.json'

echarts.use([LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

interface Gpu {
  id: number
  model: string
  abs_game_performance_1080p: number | null
  abs_game_performance_2k: number | null
  abs_game_performance_4k: number | null
  render_performance: number | null
  ai_performance: number | null
  new_price: number | null
  used_price: number | null
  shader_units: string | null
  game_freq: string | null
  vram: string | null
  tdp: number | null
}

interface PriceHistory {
  recorded_at: string
  new_price: number | null
  used_price: number | null
}

// 1080P 性价比显示系数（仅1080P模式生效）
const PERF1080_DISPLAY_MULTIPLIER = 1.05

// 基准显卡配置
const BENCHMARK_CONFIG = {
  perf1080: { model: 'NVIDIA RTX 2060 12GB', field: 'abs_game_performance_1080p' as const },
  perf2k: { model: 'NVIDIA RTX 4060', field: 'abs_game_performance_2k' as const },
  perf4k: { model: 'NVIDIA RTX 5070', field: 'abs_game_performance_4k' as const },
  render: { model: 'NVIDIA RTX 4060', field: 'render_performance' as const }
}

const benchmarkGpu = ref<{
  perf1080: Gpu | null
  perf2k: Gpu | null
  perf4k: Gpu | null
  render: Gpu | null
}>({
  perf1080: null,
  perf2k: null,
  perf4k: null,
  render: null
})

// 发售日期查询函数（精确匹配型号）
function getReleaseDate(model: string): string {
  // 先精确匹配
  if (gpuReleaseDates[model]) {
    const d = gpuReleaseDates[model]
    // 返回格式：2025-01
    return d.slice(0, 7)
  }
  // 模糊匹配（如 "RTX 4060 Ti 8G" 可能写成 "RTX 4060 Ti"）
  for (const [key, val] of Object.entries(gpuReleaseDates)) {
    if (model.includes(key) || key.includes(model)) {
      return (val as string).slice(0, 7)
    }
  }
  return ''
}

// ===================== 状态变量 =====================
// 游戏性能显示分辨率（用户切换，只影响显示）
const displayRes = ref<'1080P' | '2K' | '4K'>('2K')

// 状态变量
const gpus = ref<Gpu[]>([])
const priceHistoryMap = ref<Map<string, PriceHistory[]>>(new Map())
const lastPriceMap = ref<Map<string, { prev_new: number | null; prev_used: number | null }>>(new Map())
const minPriceMap = ref<Map<string, { min_new: number | null; min_used: number | null }>>(new Map())
// 热门模式：只显示最近一次更新全新价的型号
const hotModels = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref('')
const showMode = ref<'hot' | 'all'>('hot')
const priceType = ref<'new' | 'used'>('new')
const valueMode = ref<'perf1080' | 'perf2k' | 'perf4k' | 'render'>('perf2k')
const sortKey = ref<string>('perf2k')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 排序专用状态（与显示状态隔离）
// 记录性价比排序时用的 valueMode 和 priceType
const sortValueMode = ref<'perf1080' | 'perf2k' | 'perf4k' | 'render'>('perf2k')
const sortPriceType = ref<'new' | 'used'>('new')

// ===================== 显示状态联动 =====================
// 切换分辨率时，性价比模式同步切换（游戏相关）
watch(displayRes, (newRes) => {
  valueMode.value = newRes === '1080P' ? 'perf1080' : newRes === '2K' ? 'perf2k' : 'perf4k'
})

// 点击"创作效率"列时：切换到创作性价比并排序
const switchToRender = () => {
  valueMode.value = 'render'
  sort('render')
}
// 记录游戏性能排序时用的分辨率
const sortGameRes = ref<'1080P' | '2K' | '4K'>('2K')

// 弹窗状态
const showSpecsModal = ref(false)
const showChartModal = ref(false)
const selectedGpu = ref<Gpu | null>(null)
const chartContainer = ref<HTMLElement | null>(null)
const priceChartLoading = ref(false)

// 轮播图
const currentIndex = ref(0)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

const carouselItems = [
  { image: '/images/banner1.jpg', link: 'https://www.bilibili.com/video/BV1WhXjBDE5p', title: '5060TI、9070GRE~11款游戏对比横评！' },
  { image: '/images/banner2.jpg', link: 'https://www.bilibili.com/video/BV1sxgAzbEg5', title: '最新显卡评测' },
  { image: '/images/banner3.jpg', link: 'https://www.bilibili.com/', title: '显卡天梯图预告' }
]

const startAutoPlay = () => {
  stopAutoPlay()
  autoPlayTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % carouselItems.length
  }, 5000)
}

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

const goToSlide = (idx: number) => {
  currentIndex.value = idx
  startAutoPlay()
}

// ===================== 品牌颜色判断 =====================
const isNvidia = (model: string): boolean => {
  const upper = model?.toUpperCase() || ''
  return upper.includes('NVIDIA') || upper.includes('RTX') || upper.includes('GTX')
}
const isAmd = (model: string): boolean => {
  const upper = model?.toUpperCase() || ''
  return upper.includes('AMD') || upper.includes('RX') || upper.includes('RADEON')
}
const isIntel = (model: string): boolean => {
  const upper = model?.toUpperCase() || ''
  return upper.includes('INTEL') || upper.includes('INTEL ARC')
}

const getBrandClass = (model: string): string => {
  if (isNvidia(model)) return 'brand-nvidia'
  if (isAmd(model)) return 'brand-amd'
  if (isIntel(model)) return 'brand-intel'
  return ''
}

// ===================== 相对性能计算 =====================
// 1080P 相对分
const getRelativePerf1080 = (gpu: Gpu | null): string => {
  if (!gpu || !gpu.abs_game_performance_1080p) return '-'
  const base = benchmarkGpu.value.perf1080?.abs_game_performance_1080p
  if (!base) return '-'
  const relative = (gpu.abs_game_performance_1080p / base) * 100
  return Math.round(relative).toString()
}

// 2K 相对分
const getRelativePerf2k = (gpu: Gpu | null): string => {
  if (!gpu || !gpu.abs_game_performance_2k) return '-'
  const base = benchmarkGpu.value.perf2k?.abs_game_performance_2k
  if (!base) return '-'
  const relative = (gpu.abs_game_performance_2k / base) * 100
  return Math.round(relative).toString()
}

// 4K 相对分
const getRelativePerf4k = (gpu: Gpu | null): string => {
  if (!gpu || !gpu.abs_game_performance_4k) return '-'
  const base = benchmarkGpu.value.perf4k?.abs_game_performance_4k
  if (!base) return '-'
  const relative = (gpu.abs_game_performance_4k / base) * 100
  return Math.round(relative).toString()
}

// 创作效率相对分
const getRelativeRender = (gpu: Gpu | null): string => {
  if (!gpu || !gpu.render_performance) return '-'
  const base = benchmarkGpu.value.render?.render_performance
  if (!base) return '-'
  const relative = (gpu.render_performance / base) * 100
  return Math.round(relative).toString()
}

// 根据显示分辨率返回对应的相对分
const getDisplayGamePerf = (gpu: Gpu): string => {
  switch (displayRes.value) {
    case '1080P': return getRelativePerf1080(gpu)
    case '2K': return getRelativePerf2k(gpu)
    case '4K': return getRelativePerf4k(gpu)
    default: return '-'
  }
}

// 根据显示分辨率返回对应的原始分（用于排序）
const getGameRawScore = (gpu: Gpu): number => {
  switch (displayRes.value) {
    case '1080P': return gpu.abs_game_performance_1080p || 0
    case '2K': return gpu.abs_game_performance_2k || 0
    case '4K': return gpu.abs_game_performance_4k || 0
    default: return 0
  }
}

// 根据排序分辨率返回对应的原始分（用于性价比排序）
const getSortGameRawScore = (gpu: Gpu): number => {
  switch (sortGameRes.value) {
    case '1080P': return gpu.abs_game_performance_1080p || 0
    case '2K': return gpu.abs_game_performance_2k || 0
    case '4K': return gpu.abs_game_performance_4k || 0
    default: return 0
  }
}

// ===================== 筛选与价格 =====================
const filteredGpus = computed(() => {
  if (showMode.value === 'hot') {
    return gpus.value.filter(gpu => hotModels.value.has(gpu.model))
  }
  return gpus.value
})

const getDisplayPrice = (gpu: Gpu): number | null => {
  return priceType.value === 'new' ? gpu.new_price : gpu.used_price
}

const getPriceChange = (gpu: Gpu): { value: number; direction: 'up' | 'down' | 'flat' } => {
  const currentPrice = getDisplayPrice(gpu)
  if (!currentPrice) return { value: 0, direction: 'flat' }
  const prevRecord = lastPriceMap.value.get(gpu.model)
  if (!prevRecord) return { value: 0, direction: 'flat' }
  const prevPrice = priceType.value === 'new' ? prevRecord.prev_new : prevRecord.prev_used
  if (!prevPrice) return { value: 0, direction: 'flat' }
  const diff = currentPrice - prevPrice
  if (diff > 0) return { value: Math.abs(diff), direction: 'up' }
  if (diff < 0) return { value: Math.abs(diff), direction: 'down' }
  return { value: 0, direction: 'flat' }
}

const priceChangeText = (gpu: Gpu): string => {
  const change = getPriceChange(gpu)
  if (change.direction === 'flat') return '-'
  return (change.direction === 'up' ? '↑' : '↓') + change.value
}

const isNearHistoricalLow = (gpu: Gpu): boolean => {
  const currentPrice = getDisplayPrice(gpu)
  if (!currentPrice) return false
  const minRecord = minPriceMap.value.get(gpu.model)
  if (!minRecord) return false
  const minPrice = priceType.value === 'new' ? minRecord.min_new : minRecord.min_used
  if (!minPrice) return false
  return currentPrice <= minPrice * 1.03
}

const getPriceTitle = (gpu: Gpu): string => {
  const other = priceType.value === 'new' ? gpu.used_price : gpu.new_price
  const otherLabel = priceType.value === 'new' ? '二手价' : '全新价'
  if (other) {
    return `${otherLabel}: ${other} 元`
  }
  return '-'
}

const getSortPrice = (gpu: Gpu): number => {
  return sortPriceType.value === 'new' ? (gpu.new_price || 999999) : (gpu.used_price || 999999)
}

// ===================== 性价比 =====================
const getPerfScore = (gpu: Gpu, mode: string): number | null => {
  switch (mode) {
    case 'perf1080': return gpu.abs_game_performance_1080p ?? null
    case 'perf2k': return gpu.abs_game_performance_2k ?? null
    case 'perf4k': return gpu.abs_game_performance_4k ?? null
    case 'render': return gpu.render_performance ?? null
    default: return null
  }
}

// 游戏性价比乘数
const getGameMultiplier = (): number => 20
// 创作性价比乘数
const getRenderMultiplier = (): number => 40

// 计算性价比（用于显示，依赖 valueMode）
const getValueScore = (gpu: Gpu): number => {
  const price = getDisplayPrice(gpu)
  if (!price || price <= 0) return 0
  const perf = getPerfScore(gpu, valueMode.value)
  if (!perf || perf <= 0) return 0
  const multiplier = valueMode.value === 'render' ? getRenderMultiplier() : getGameMultiplier()
  return (perf / price) * multiplier
}

// 计算性价比（用于排序，依赖 sortValueMode）
const getSortValueScore = (gpu: Gpu): number => {
  const price = sortPriceType.value === 'new' ? gpu.new_price : gpu.used_price
  if (!price || price <= 0) return 0
  let perf: number | null = null
  if (sortValueMode.value === 'perf1080' || sortValueMode.value === 'perf2k' || sortValueMode.value === 'perf4k') {
    perf = getSortGameRawScore(gpu)
  } else {
    perf = gpu.render_performance ?? null
  }
  if (!perf || perf <= 0) return 0
  const multiplier = sortValueMode.value === 'render' ? getRenderMultiplier() : getGameMultiplier()
  return (perf / price) * multiplier
}

// 显示性价比：仅1080P乘1.05，其他保持原始值，全部四舍五入取整
const getDisplayValue = (gpu: Gpu): string => {
  const rawScore = getValueScore(gpu)
  if (rawScore <= 0) return '-'
  const multiplier = valueMode.value === 'perf1080' ? PERF1080_DISPLAY_MULTIPLIER : 1
  return Math.round(rawScore * multiplier).toString()
}

// 精确值显示（用于title，同样逻辑）
const getPreciseValue = (gpu: Gpu): string => {
  const rawScore = getValueScore(gpu)
  if (rawScore <= 0) return '-'
  const multiplier = valueMode.value === 'perf1080' ? PERF1080_DISPLAY_MULTIPLIER : 1
  return `性价比: ${Math.round(rawScore * multiplier)}`
}

// 计算当前筛选条件下，满足条件的最大原始性价比
const maxValueScoreInFilter = computed((): number => {
  let maxScore = 0
  filteredGpus.value.forEach(gpu => {
    // 获取当前性价比模式对应的性能分
    const perf = getDisplayGamePerfForCrown(gpu)
    // 性能分 >= 100
    if (parseInt(perf) >= 100) {
      const rawScore = getValueScore(gpu)
      if (rawScore > maxScore) {
        maxScore = rawScore
      }
    }
  })
  return maxScore
})

// 根据valueMode获取对应的性能分（用于皇冠判断）
const getDisplayGamePerfForCrown = (gpu: Gpu): string => {
  switch (valueMode.value) {
    case 'perf1080': return getRelativePerf1080(gpu)
    case 'perf2k': return getRelativePerf2k(gpu)
    case 'perf4k': return getRelativePerf4k(gpu)
    case 'render': return getRelativeRender(gpu)
    default: return '-'
  }
}

// 判断是否显示皇冠图标
const shouldShowCrown = (gpu: Gpu): boolean => {
  const rawScore = getValueScore(gpu)
  if (rawScore <= 0) return false
  
  // 检查性能分 >= 100
  const perf = getDisplayGamePerfForCrown(gpu)
  if (parseInt(perf) < 100) return false
  
  // 检查是否为最大原始性价比
  return rawScore === maxValueScoreInFilter.value && maxValueScoreInFilter.value > 0
}

// ===================== 排序 =====================
const sortedGpus = computed(() => {
  const sorted = [...filteredGpus.value]

  sorted.sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortKey.value) {
      case 'model':
        aVal = a.model.toLowerCase()
        bVal = b.model.toLowerCase()
        break
      // 游戏性能排序：基于当前 displayRes 对应的原始分
      case 'game':
        aVal = getGameRawScore(a)
        bVal = getGameRawScore(b)
        break
      case 'render':
        aVal = a.render_performance || 0
        bVal = b.render_performance || 0
        break
      case 'price':
        aVal = getSortPrice(a)
        bVal = getSortPrice(b)
        break
      case 'value':
        aVal = getSortValueScore(a)
        bVal = getSortValueScore(b)
        break
      default:
        return 0
    }

    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  return sorted
})

const getSortIcon = (key: string): string => {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

const sort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = key === 'model' || key === 'price' ? 'asc' : 'desc'
  }

  // 记录排序时的状态快照
  if (key === 'value') {
    sortValueMode.value = valueMode.value
    sortPriceType.value = priceType.value
  }
  if (key === 'price') {
    sortPriceType.value = priceType.value
  }
  if (key === 'game') {
    // 记录当前显示分辨率作为排序用的分辨率
    sortGameRes.value = displayRes.value
    // 点击"游戏性能"列 → 性价比也切到对应分辨率
    valueMode.value = displayRes.value === '1080P' ? 'perf1080' : displayRes.value === '2K' ? 'perf2k' : 'perf4k'
  }
}

// ===================== 弹窗 =====================
const showSpecs = (gpu: Gpu) => {
  selectedGpu.value = gpu
  showSpecsModal.value = true
}

const showPriceChart = async (gpu: Gpu) => {
  selectedGpu.value = gpu
  showChartModal.value = true
  priceChartLoading.value = true

  await nextTick()

  if (chartContainer.value) {
    const history = priceHistoryMap.value.get(gpu.model) || []
    renderChart(history)
  }
}

// 图表实例引用（用于内存清理）
let chartInstance: ReturnType<typeof echarts.init> | null = null
let currentResizeHandler: (() => void) | null = null

const renderChart = (history: PriceHistory[]) => {
  if (!chartContainer.value) return

  // 清理旧实例和监听器
  if (currentResizeHandler) {
    window.removeEventListener('resize', currentResizeHandler)
    currentResizeHandler = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  chartInstance = echarts.init(chartContainer.value)

  const dates = history.map(h => h.recorded_at.slice(5))
  const newPrices = history.map(h => h.new_price)
  const usedPrices = history.map(h => h.used_price)

  const validNew = newPrices.filter(p => p !== null) as number[]
  const validUsed = usedPrices.filter(p => p !== null) as number[]
  const minNew = validNew.length > 0 ? Math.min(...validNew) : null
  const minUsed = validUsed.length > 0 ? Math.min(...validUsed) : null

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1a2e',
      borderColor: '#2a2a4a',
      textStyle: { color: '#e0e0e0' },
      formatter: (params: any) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach((item: any) => {
          if (item.value !== null) {
            result += `${item.marker}${item.seriesName}: ${item.value}<br/>`
          }
        })
        return result
      }
    },
    legend: {
      data: [
        `全新价 💰最低${minNew}元`,
        `二手价 💰最低${minUsed}元`
      ],
      textStyle: { color: '#e8e8f0', fontSize: 13 },
      top: 10
    },
    grid: {
      left: '12%',
      right: '8%',
      bottom: '15%',
      top: '22%'
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#2a2a4a' } },
      axisLabel: { color: '#a0a0b0', rotate: 45, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#2a2a4a' } },
      axisLabel: { color: '#a0a0b0', formatter: '{value}', fontSize: 12 },
      splitLine: { lineStyle: { color: '#1a1a2e' } }
    },
    series: [
      {
        name: `全新价 💰最低${minNew}元`,
        type: 'line',
        data: newPrices,
        smooth: false,
        lineStyle: { color: '#ff8c00', width: 2 },
        itemStyle: { color: '#ff8c00' },
        connectNulls: true
      },
      {
        name: `二手价 💰最低${minUsed}元`,
        type: 'line',
        data: usedPrices,
        smooth: false,
        lineStyle: { color: '#4ecdc4', width: 2, type: 'dashed' },
        itemStyle: { color: '#4ecdc4' },
        connectNulls: true
      }
    ]
  }

  chartInstance.setOption(option)
  priceChartLoading.value = false

  currentResizeHandler = () => chartInstance?.resize()
  window.addEventListener('resize', currentResizeHandler)
}

const closeModals = () => {
  showSpecsModal.value = false
  showChartModal.value = false
  // 清理图表实例
  if (currentResizeHandler) {
    window.removeEventListener('resize', currentResizeHandler)
    currentResizeHandler = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

// ===================== 数据加载 =====================
const findBenchmarkGpu = (model: string, field: keyof Gpu): Gpu | null => {
  const found = gpus.value.find(gpu => gpu.model === model)
  if (found) return found
  // 模糊匹配
  const fuzzy = gpus.value.find(gpu => gpu.model.includes(model.replace('NVIDIA ', '')))
  if (fuzzy) return fuzzy
  return null
}

const loadData = async () => {
  try {
    loading.value = true
    error.value = ''

    const { data: gpuData, error: gpuError } = await supabase
      .from('gpu_current')
      .select('*')
      .order('abs_game_performance_2k', { ascending: false })

    if (gpuError) throw gpuError

    gpus.value = gpuData || []

    // 查找基准显卡（必须在 gpus.value 赋值之后）
    benchmarkGpu.value.perf1080 = findBenchmarkGpu(BENCHMARK_CONFIG.perf1080.model, 'abs_game_performance_1080p')
    benchmarkGpu.value.perf2k = findBenchmarkGpu(BENCHMARK_CONFIG.perf2k.model, 'abs_game_performance_2k')
    benchmarkGpu.value.perf4k = findBenchmarkGpu(BENCHMARK_CONFIG.perf4k.model, 'abs_game_performance_4k')
    benchmarkGpu.value.render = findBenchmarkGpu(BENCHMARK_CONFIG.render.model, 'render_performance')

    const { data: historyData, error: historyError } = await supabase
      .from('gpu_price_history')
      .select('*')
      .order('recorded_at', { ascending: true })

    if (historyError) throw historyError

    const historyMap = new Map<string, PriceHistory[]>()
    historyData?.forEach(item => {
      const existing = historyMap.get(item.model) || []
      existing.push({
        recorded_at: item.recorded_at,
        new_price: item.new_price,
        used_price: item.used_price
      })
      historyMap.set(item.model, existing)
    })

    priceHistoryMap.value = historyMap

    const tmpLast = new Map()
    const tmpMin = new Map()
    historyMap.forEach((history, model) => {
      const newPriceRecords = history.filter(h => h.new_price !== null)
      const usedPriceRecords = history.filter(h => h.used_price !== null)
      tmpLast.set(model, {
        prev_new: newPriceRecords.length >= 2 ? newPriceRecords[newPriceRecords.length - 2].new_price : null,
        prev_used: usedPriceRecords.length >= 2 ? usedPriceRecords[usedPriceRecords.length - 2].used_price : null
      })
      const newPrices = history.map(h => h.new_price).filter(p => p !== null)
      const usedPrices = history.map(h => h.used_price).filter(p => p !== null)
      if (newPrices.length > 0 || usedPrices.length > 0) {
        tmpMin.set(model, {
          min_new: newPrices.length > 0 ? Math.min(...newPrices) : null,
          min_used: usedPrices.length > 0 ? Math.min(...usedPrices) : null
        })
      }
    })
    lastPriceMap.value = tmpLast
    minPriceMap.value = tmpMin

    // 计算热门型号：所有有全新价的GPU都显示
    const hot = new Set(
      gpus.value
        .filter(gpu => gpu.new_price !== null)
        .map(gpu => gpu.model)
    )
    hotModels.value = hot

  } catch (err: any) {
    error.value = err.message || '加载数据失败'
  } finally {
    loading.value = false
  }
}

// JSON-LD 动态注入
const injectJsonLd = () => {
  const oldScript = document.querySelector('script[data-jsonld="gpu-list"]')
  if (oldScript) oldScript.remove()

  const items = sortedGpus.value.slice(0, 20).map((gpu, idx) => ({
    "@type": "Product",
    "name": gpu.model,
    "position": idx + 1,
    "offers": {
      "@type": "Offer",
      "price": gpu.new_price || gpu.used_price || 0,
      "priceCurrency": "CNY"
    }
  }))

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "显卡性价比排行榜",
    "description": "基于实测数据的显卡性价比排行，每月更新",
    "numberOfItems": items.length,
    "itemListElement": items
  })

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-jsonld', 'gpu-list')
  script.textContent = jsonLd
  document.head.appendChild(script)
}

onMounted(() => {
  loadData().then(() => nextTick(() => injectJsonLd()))
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<style scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

/* 顶部区域 */
.top-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.top-bar-spacer {
  flex: 1;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  text-decoration: none;
  display: flex;
  align-items: center;
}

.tab-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.tab-btn.active,
.tab-btn.router-link-active,
.tab-btn.router-link-exact-active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 600;
}

/* 滚动条样式 */
.table-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: #3A3A5A;
  border-radius: 3px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #4A4A6A;
}

.table-wrapper::-webkit-scrollbar-corner {
  background: var(--bg-primary);
}

/* 轮播图 */
.top-carousel {
  flex: 1;
  min-width: 240px;
  max-width: 450px;
  height: 44px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.2s;
}

.top-carousel:hover {
  border-color: var(--accent);
}

.carousel-text {
  font-size: 0.82rem;
  color: var(--text-secondary);
  padding: 0 0.8rem;
  text-align: center;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carousel-dots {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.dot-btn {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.dot-btn.active {
  background: var(--accent);
}

.dot-btn:hover {
  background: var(--accent-hover);
}

/* 表格 */
.table-wrapper {
  max-height: 82vh;
  overflow-y: auto;
  overflow-x: auto;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}

.cpu-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.cpu-table thead {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--bg-tertiary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.cpu-table thead::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
}

.cpu-table th {
  padding: 0.6rem 0.4rem;
  text-align: left;
  font-weight: 600;
  color: #C0C0D0;
  white-space: nowrap;
  position: relative;
  font-size: 12px;
}

.cpu-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.cpu-table th.sortable:hover .th-label {
  color: var(--accent);
}

.sort-icon {
  color: var(--accent);
  font-size: 0.7rem;
  margin-left: 0.2rem;
}

.price-hint {
  color: #f59e0b;
  font-size: 0.75rem;
  margin-left: 0.25rem;
  cursor: help;
  opacity: 0.8;
  transition: opacity 0.2s;
  vertical-align: middle;
}

.price-hint:hover {
  opacity: 1;
}

/* 表头内部布局 */
.th-inner {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.th-center {
  align-items: center;
}

.th-right {
  align-items: flex-end;
}

.th-label {
  font-size: 0.8rem;
  color: #B0B0C0;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.th-label-text {
  display: inline;
}

/* 内联切换按钮 */
.inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}

.toggle-btn {
  padding: 0.15rem 0.35rem;
  font-size: 0.68rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 24px;
  min-width: 32px;
}

.toggle-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.toggle-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 700;
}

.toggle-sep {
  color: var(--text-secondary);
  font-size: 0.65rem;
  user-select: none;
}

.value-toggle {
  margin-top: 0.15rem;
}

.value-select {
  padding: 0.15rem 0.35rem;
  font-size: 0.68rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  min-height: 24px;
}

.value-select:focus {
  outline: none;
  border-color: var(--accent);
}

/* 分辨率切换按钮 */
.res-toggle {
  display: inline-flex;
  gap: 1px;
  margin-top: 0.1rem;
}

.res-btn {
  padding: 0.1rem 0.35rem;
  font-size: 0.65rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 22px;
  min-width: 34px;
}

.res-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.res-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 700;
}

/* 列宽 */
.rank-col {
  width: 60px;
  text-align: center;
  vertical-align: middle;
}

.rank-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rank-count {
  font-size: 10px;
  color: #B0B0C0;
  font-weight: 400;
}

.rank-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.model-col {
  min-width: 160px;
  text-align: center;
}

.model-col:hover .th-label {
  color: var(--accent);
}

.game-col {
  min-width: 90px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.game-col:hover .th-label {
  color: var(--accent);
}

.perf-col {
  min-width: 80px;
  text-align: center;
}

.price-col {
  min-width: 140px;
  text-align: center;
}

.price-col:hover .th-label {
  color: var(--accent);
}

.value-col {
  min-width: 110px;
  text-align: center;
}

/* 表格内容 */
.cpu-table tbody tr {
  transition: background 0.2s;
}

.cpu-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

.cpu-table td {
  padding: 0.8rem 0.5rem;
  border-bottom: 1px solid #2A2A4A;
  font-size: 14px;
  color: #E8E8F0;
  line-height: 1.5;
}

.rank {
  text-align: center;
  color: var(--text-secondary);
}

.model {
  cursor: pointer;
}

.model-name {
  font-weight: 500;
  color: #E0E0F0;
}

.model:hover .model-name {
  color: var(--accent) !important;
  text-decoration: underline;
}

/* 品牌颜色 */
.brand-nvidia {
  color: #76B900 !important;
}

.brand-amd {
  color: #E34F26 !important;
}

.brand-intel {
  color: #0071C5 !important;
}

.model:hover .model-name.brand-nvidia,
.model:hover .model-name.brand-amd,
.model:hover .model-name.brand-intel {
  color: var(--accent) !important;
  text-decoration: underline;
}

.game-perf,
.perf,
.value-cell {
  text-align: center;
  font-family: 'Roboto Mono', 'Fira Code', Consolas, monospace;
  font-variant-numeric: tabular-nums;
  color: #E8E8F0;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.price-cell {
  text-align: center;
  cursor: pointer;
  padding-right: 0.5rem !important;
}

.price-cell:hover {
  color: var(--accent);
}

/* 价格布局：数字在左，图标在右 */
.price-content {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: center;
}

.price-main {
  min-width: 3.2em;
  text-align: right;
  flex-shrink: 0;
}

.price-value {
  font-family: 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #E8E8F0;
}

.no-price {
  color: var(--text-secondary);
}

.chart-icon {
  margin-left: 0.3rem;
  opacity: 0.5;
  font-size: 0.75rem;
}

/* 皇冠图标 */
.crown-icon {
  margin-left: 0.25rem;
  font-size: 0.9rem;
}

/* 价格布局：数字在左，指示器在右 */
.price-indicators {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 4.8em;
  justify-content: flex-start;
  flex-shrink: 0;
}

/* 价格变化指示 */
.price-change {
  font-size: 0.8rem;
  font-family: 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 2.4em;
  text-align: left;
  font-weight: 500;
}

.price-up { color: #ff7b7b; }
.price-down { color: #6ee7b7; }
.price-flat { color: #a0a0a0; }

/* 趋势小图表 */
.trend-icon {
  font-size: 0.9rem;
  opacity: 0.65;
  flex-shrink: 0;
}

.trend-icon.muted {
  opacity: 0.3;
}

/* 接近历史低价火星 */
.fire-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* 加载和错误 */
.loading,
.error-box,
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error-box {
  color: #F87171;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid #F87171;
  border-radius: 12px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.3s;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border);
}

.specs-modal {
  width: 100%;
  max-width: 420px;
}

.chart-modal {
  width: 95vw;
  max-width: 680px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  color: var(--accent);
  font-size: 0.95rem;
  word-break: break-all;
}

.release-badge {
  color: var(--text-muted, #888);
  font-size: 0.82em;
  font-weight: 400;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  min-height: 44px;
  min-width: 44px;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.2rem;
}

/* 参数网格 */
.specs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.spec-item {
  background: var(--bg-tertiary);
  padding: 0.6rem;
  border-radius: 8px;
}

.spec-label {
  display: block;
  color: #B0B0C0;
  font-size: 0.75rem;
  margin-bottom: 0.15rem;
}

.spec-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #F0F0FA;
  word-break: break-all;
}

/* 性能显示 */
.perf-display {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}

.perf-item {
  background: var(--bg-tertiary);
  padding: 0.7rem;
  border-radius: 8px;
  text-align: center;
}

.perf-label {
  display: block;
  color: #B0B0C0;
  font-size: 0.75rem;
  margin-bottom: 0.2rem;
}

.perf-value {
  font-size: 1.2rem;
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
  color: #F0F0FA;
}

.perf-value.game { color: var(--accent); }
.perf-value.multi { color: #4ecdc4; }

/* 图表 */
.chart-container {
  width: 100%;
  height: 220px;
}

.chart-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* 无障碍隐藏 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: #FFB86C;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 骨架屏 */
.skeleton-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.skeleton-table {
  width: 100%;
  border-collapse: collapse;
}

.skeleton-table thead th {
  background: var(--bg-secondary);
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}

.skeleton-table tbody td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border-dark);
}

.skeleton-row:last-child td {
  border-bottom: none;
}

.skeleton-bar {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    rgba(255, 255, 255, 0.05) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  display: block;
}

.w20 { width: 20px; }
.w30 { width: 30px; }
.w40 { width: 40px; }
.w50 { width: 50px; }
.w60 { width: 60px; }
.w70 { width: 70px; }
.w80 { width: 80px; }
.w120 { width: 120px; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 响应式 */
@media (max-width: 900px) {
  .top-bar {
    flex-wrap: wrap;
  }

  .top-carousel {
    order: 3;
    width: 100%;
    max-width: 100%;
    height: 80px;
    margin-top: 0.5rem;
  }
}

@media (max-width: 600px) {
  /* 全局字体紧凑 */
  .cpu-table td {
    font-size: 12px;
    padding: 0.45rem 0.25rem;
    color: #f0f0fa;
  }

  .cpu-table th {
    padding: 0.4rem 0.25rem;
  }

  .th-label {
    font-size: 0.7rem;
  }

  .tab-btn {
    font-size: 0.85rem;
    padding: 0.4rem 0.6rem;
    min-height: 36px;
    flex: 1;
    text-align: center;
  }

  .tabs {
    justify-content: center;
  }

  /* 按钮热区优化 */
  .toggle-btn,
  .res-btn {
    min-height: 38px;
    min-width: 38px;
    padding: 0.25rem 0.5rem;
    font-size: 0.6rem;
    flex: 1;
    text-align: center;
  }

  .dot-btn {
    width: 6px;
    height: 6px;
  }

  .close-btn {
    min-height: 44px;
    min-width: 44px;
  }

  .model {
    cursor: default;
  }

  .price-cell {
    cursor: default;
  }

  /* 顶部区域垂直重排 */
  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .top-bar-spacer {
    display: none;
  }

  .top-carousel {
    max-width: 100%;
    height: 38px;
    min-height: 38px;
  }

  .carousel-text {
    font-size: 0.75rem;
    white-space: normal;
    line-height: 1.2;
  }

  /* 表内切换按钮组等宽化 */
  .inline-toggle,
  .res-toggle {
    display: flex;
    width: 100%;
  }

  .toggle-btn,
  .res-btn {
    min-height: 38px;
    min-width: 38px;
    flex: 1;
    text-align: center;
  }

  .res-btn {
    min-height: 32px;
    min-width: 36px;
    font-size: 0.65rem;
  }

  .toggle-sep {
    display: none;
  }

  .price-col .th-inner,
  .value-col .th-inner {
    align-items: stretch;
  }

  .value-select {
    width: 100%;
    text-align: center;
    min-height: 32px;
    font-size: 0.7rem;
    padding: 0.25rem 0.4rem;
  }

  /* 弹窗底部抽屉式适配 */
  .modal-overlay {
    padding: 0.3rem;
    align-items: flex-end;
  }

  .specs-modal,
  .chart-modal {
    width: 100%;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUpMobile 0.3s;
  }

  @keyframes slideUpMobile {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .modal-body {
    padding: 0.75rem;
  }

  .specs-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .perf-display {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .chart-container {
    height: 180px;
  }

  /* 价格信息同行动态显示 */
  .price-content {
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
  }

  .price-main {
    text-align: left;
    min-width: auto;
  }

  .price-indicators {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    flex-wrap: wrap;
  }

  .trend-icon {
    display: inline;
    font-size: 0.9rem;
  }

  /* 加载与错误区域高度保障 */
  .loading,
  .error-box,
  .no-data {
    min-height: 180px;
    text-align: center;
  }

  /* 背景与文字对比微调 */
  .table-wrapper {
    background: #1a1a2e;
  }

  /* 表格高度增加以显示更多行 */
  .table-wrapper {
    max-height: 70vh;
  }

  .chart-modal {
    width: 96vw;
  }

  /* 价格变化指示放大 */
  .price-change {
    font-size: 0.8rem;
  }

  .fire-icon {
    font-size: 0.85rem;
  }
}

/* 价格指示器（桌面端） */
.price-indicators {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 4.8em;
  justify-content: flex-start;
  flex-shrink: 0;
}

.price-change {
  font-size: 0.8rem;
  font-family: 'Roboto Mono', monospace;
  white-space: nowrap;
  min-width: 2.4em;
  text-align: left;
  font-weight: 500;
}

.price-up {
  color: #ff7b7b;
}

.price-down {
  color: #6ee7b7;
}

.price-flat {
  color: #a0a0a0;
}

.trend-icon {
  font-size: 0.9rem;
  opacity: 0.65;
  flex-shrink: 0;
}

.trend-icon.muted {
  opacity: 0.3;
}

.fire-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
}
</style>
