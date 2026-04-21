<template>
  <div class="home">
    <!-- 顶部区域：标签 + 轮播图 -->
    <div class="top-bar">
      <div class="tabs">
        <router-link to="/" class="tab-btn" :class="{ active: $route.path === '/' }">CPU榜</router-link>
        <router-link to="/gpu" class="tab-btn" :class="{ active: $route.path === '/gpu' }">显卡榜</router-link>
      </div>
      
      <div class="top-bar-spacer"></div>
      
      <!-- 顶部轮播图（纯文字占位） -->
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

    <!-- 价格筛选抽屉 -->
    <div class="filter-drawer">
      <!-- 收起时的摘要条 -->
      <div class="filter-summary" @click="filterExpanded = !filterExpanded">
        <span class="filter-summary-text">💰 价格: {{ cpuPriceLabel }}</span>
        <button class="filter-toggle-btn" :class="{ open: filterExpanded }">筛选 <span class="toggle-arrow">▼</span></button>
      </div>
      <!-- 展开面板 -->
      <Transition name="drawer">
        <div v-if="filterExpanded" class="filter-panel">
          <div class="filter-panel-inner">
            <div class="price-inputs">
              <input
                v-model="priceMin"
                type="number"
                placeholder="最低"
                min="0"
                class="price-input"
              />
              <span class="price-sep">—</span>
              <input
                v-model="priceMax"
                type="number"
                placeholder="最高"
                min="0"
                class="price-input"
              />
              <button v-if="priceMin !== '' || priceMax !== ''" class="clear-btn" @click.stop="clearCpuPrice">✕ 清空</button>
            </div>
            <div class="price-presets">
              <button
                v-for="preset in pricePresets"
                :key="preset.label"
                :class="{ active: activePreset === preset }"
                class="preset-btn"
                @click="applyCpuPreset(preset)"
              >{{ preset.label }}</button>
            </div>
          </div>
          <button class="filter-close-btn" @click="filterExpanded = false">✕</button>
        </div>
      </Transition>
    </div>

    <!-- CPU内容区 -->
    <div class="content-area">
      <!-- 骨架屏 -->
      <div v-if="loading" class="skeleton-wrapper" aria-label="正在加载数据">
        <table class="cpu-table skeleton-table">
          <thead>
            <tr>
              <th class="rank-col"><div class="skeleton-bar w60"></div></th>
              <th class="model-col"><div class="skeleton-bar w120"></div></th>
              <th class="perf-col"><div class="skeleton-bar w50"></div></th>
              <th class="perf-col"><div class="skeleton-bar w50"></div></th>
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
      <div v-else class="table-wrapper" role="region" aria-label="CPU性价比排行榜">
        <table class="cpu-table">
          <caption class="sr-only">CPU 性价比排行榜 - 基于实测数据</caption>
          <thead>
            <tr>
              <th class="rank-col" scope="col">
                <div class="rank-header">
                  <span class="rank-count">共{{ filteredCpus.length }}款</span>
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
              <th scope="col" class="sortable perf-col" @click="sort('game')">
                <div class="th-inner th-center">
                  <span class="th-label">
                    游戏性能<span class="sort-icon">{{ getSortIcon('game') }}</span>
                  </span>
                </div>
              </th>
              <th scope="col" class="sortable perf-col" @click="sort('multi')">
                <div class="th-inner th-center">
                  <span class="th-label">
                    多核性能<span class="sort-icon">{{ getSortIcon('multi') }}</span>
                  </span>
                </div>
              </th>
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
                    >全新价</button>
                    <span class="toggle-sep">/</span>
                    <button 
                      :class="{ active: priceType === 'used' }"
                      @click="priceType = 'used'"
                      class="toggle-btn"
                    >二手价</button>
                  </div>
                </div>
              </th>
              <th scope="col" class="sortable value-col" @click="sort('value')">
                <div class="th-inner th-center">
                  <span class="th-label">
                    性价比<span class="sort-icon">{{ getSortIcon('value') }}</span>
                  </span>
                  <div class="inline-toggle value-toggle" @click.stop>
                    <button 
                      :class="{ active: valueMode === 'game' }"
                      @click="valueMode = 'game'"
                      class="toggle-btn"
                    >游戏</button>
                    <span class="toggle-sep">/</span>
                    <button 
                      :class="{ active: valueMode === 'multi' }"
                      @click="valueMode = 'multi'"
                      class="toggle-btn"
                    >多核</button>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(cpu, index) in sortedCpus"
              :key="cpu.id"
              class="cpu-row"
            >
              <td class="rank">{{ index + 1 }}</td>
              <td class="model" @click="showSpecs(cpu)">
                <span class="model-name" :class="getBrandClass(cpu.model)">{{ cpu.model }}</span>
              </td>
              <td class="perf" aria-label="游戏性能">{{ getRelativeGamePerf(cpu) }}</td>
              <td class="perf" aria-label="多核性能">{{ getRelativeMultiPerf(cpu) }}</td>
              <td
                class="price-cell"
                @click="showPriceChart(cpu)"
                :title="getPriceTitle(cpu)"
              >
                <div class="price-content">
                  <span class="price-main">
                    <span v-if="getDisplayPrice(cpu)" class="price-value">
                      {{ getDisplayPrice(cpu) }}
                    </span>
                    <span v-else class="no-price">-</span>
                  </span>
                  <span v-if="getDisplayPrice(cpu)" class="price-indicators">
                    <span
                      class="price-change"
                      :class="{
                        'price-up': getPriceChange(cpu).direction === 'up',
                        'price-down': getPriceChange(cpu).direction === 'down',
                        'price-flat': getPriceChange(cpu).direction === 'flat'
                      }"
                    >{{ priceChangeText(cpu) }}</span>
                    <span
                      class="trend-icon"
                      aria-hidden="true"
                    >{{ getPriceChange(cpu).direction === 'up' ? '📈' : getPriceChange(cpu).direction === 'down' ? '📉' : '📊' }}</span>
                    <span v-if="isNearHistoricalLow(cpu)" class="fire-icon" title="接近历史低价">🔥</span>
                  </span>
                  <span v-else class="trend-icon muted" aria-hidden="true">📊</span>
                </div>
              </td>
              <td class="value-cell" aria-label="性价比" :title="getPreciseValue(cpu)">
                {{ getDisplayValue(cpu) }}<span v-if="shouldShowCrown(cpu)" class="crown-icon">👑</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 无数据提示 -->
      <div v-if="!loading && !error && filteredCpus.length === 0" class="no-data">
        <p>这个价位暂时没有符合条件的结果，筛不出来的是纠结——适合自己的最好 😊</p>
      </div>
    </div>

    <!-- 参数弹窗 -->
    <div v-if="showSpecsModal" class="modal-overlay" @click.self="closeModals" role="dialog" aria-modal="true">
      <div class="modal specs-modal">
        <div class="modal-header">
          <h3>{{ selectedCpu?.model }}</h3>
          <button class="close-btn" @click="closeModals" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">核心/线程</span>
              <span class="spec-value">{{ selectedCpu?.cores || '-' }} / {{ selectedCpu?.threads || '-' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">基础频率</span>
              <span class="spec-value">{{ selectedCpu?.base_freq || '-' }} GHz</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">加速频率</span>
              <span class="spec-value">{{ selectedCpu?.boost_freq || '-' }} GHz</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">TDP</span>
              <span class="spec-value">{{ selectedCpu?.tdp || '-' }} W</span>
            </div>
          </div>
          <div class="perf-display">
            <div class="perf-item">
              <span class="perf-label">游戏性能</span>
              <span class="perf-value game">{{ getRelativeGamePerf(selectedCpu!) }}</span>
            </div>
            <div class="perf-item">
              <span class="perf-label">多核性能</span>
              <span class="perf-value multi">{{ getRelativeMultiPerf(selectedCpu!) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 价格折线图弹窗 -->
    <div v-if="showChartModal" class="modal-overlay" @click.self="closeModals" role="dialog" aria-modal="true">
      <div class="modal chart-modal">
        <div class="modal-header">
          <h3>{{ selectedCpu?.model }} - 历史价格</h3>
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
import {
  priceMin, priceMax, pricePresets, activePreset,
  priceInRange, clearCpuPrice, cpuPriceLabel,
} from '@/components/useFilterBar'

echarts.use([LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])

interface Cpu {
  id: number
  model: string
  abs_game_performance: number
  abs_multi_performance: number
  new_price: number | null
  used_price: number | null
  cores: string
  threads: number
  base_freq: number
  boost_freq: number
  tdp: number
}

interface PriceHistory {
  recorded_at: string
  new_price: number | null
  used_price: number | null
}

// 基准CPU
const BENCHMARK_CPU = 'INTEL Core i5-12490F'
const benchmarkCpu = ref<Cpu | null>(null)

// 状态变量
const cpus = ref<Cpu[]>([])
const priceHistoryMap = ref<Map<string, PriceHistory[]>>(new Map())
const lastPriceMap = ref<Map<string, { prev_new: number | null; prev_used: number | null }>>(new Map())
const minPriceMap = ref<Map<string, { min_new: number | null; min_used: number | null }>>(new Map())
// 热门模式：只显示最近一次更新全新价的型号
const hotModels = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref('')
const showMode = ref<'hot' | 'all'>('hot')
const priceType = ref<'new' | 'used'>('new')
const valueMode = ref<'game' | 'multi'>('game')
const sortKey = ref<string>('game')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 排序专用状态（只在点击表头时更新，完全独立于显示状态）
const sortValueMode = ref<'game' | 'multi'>('game')
const sortPriceType = ref<'new' | 'used'>('new')

// 弹窗状态
const showSpecsModal = ref(false)
const showChartModal = ref(false)
const selectedCpu = ref<Cpu | null>(null)
const chartContainer = ref<HTMLElement | null>(null)
const priceChartLoading = ref(false)

// 轮播图
const currentIndex = ref(0)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

const carouselItems = [
  { image: '/images/banner1.jpg', link: 'https://www.bilibili.com/video/BV1NcdaBMEWu/', title: '5600升级5500x3d,7500f值不值？省流推荐！' },
  { image: '/images/banner2.jpg', link: 'https://www.bilibili.com/video/BV1BD6YBZE9n/', title: '【CPU游戏性能-天梯图】2026年1月29日更新' },
  { image: '/images/banner3.jpg', link: 'https://www.bilibili.com/video/BV121HkzMESh/', title: '2000元CPU 全面对比，生产力 | 游戏 | 功耗' }
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

// 品牌颜色判断
const isAmd = (model: string): boolean => model?.toUpperCase().includes('AMD')
const isIntel = (model: string): boolean => model?.toUpperCase().includes('INTEL')

const getBrandClass = (model: string): string => {
  if (isAmd(model)) return 'brand-amd'
  if (isIntel(model)) return 'brand-intel'
  return ''
}

// 计算相对性能分
const getRelativeGamePerf = (cpu: Cpu | null): string => {
  if (!cpu || !benchmarkCpu.value) return '-'
  const relative = (cpu.abs_game_performance / benchmarkCpu.value.abs_game_performance) * 100
  return Math.round(relative).toString()
}

const getRelativeMultiPerf = (cpu: Cpu | null): string => {
  if (!cpu || !benchmarkCpu.value) return '-'
  const relative = (cpu.abs_multi_performance / benchmarkCpu.value.abs_multi_performance) * 100
  return Math.round(relative).toString()
}

// ─── 价格筛选 ───
const filterExpanded = ref(false)

const applyCpuPreset = (preset: typeof pricePresets[0]) => {
  priceMin.value = preset.min
  priceMax.value = preset.max === Infinity ? '' : preset.max
}

// 价格区间匹配（同时考虑全新价和二手价）
const priceInRangeCpu = (cpu: Cpu): boolean => {
  const min = priceMin.value === '' ? 0 : priceMin.value
  const max = priceMax.value === '' ? Infinity : priceMax.value
  return priceInRange(cpu.new_price, cpu.used_price, min, max)
}

// 筛选CPU
const filteredCpus = computed(() => {
  let list = showMode.value === 'hot'
    ? cpus.value.filter(cpu => hotModels.value.has(cpu.model))
    : cpus.value

  // 价格筛选
  if (priceMin.value !== '' || priceMax.value !== '') {
    list = list.filter(priceInRangeCpu)
  }

  return list
})

// 点击抽屉外部关闭
const onFilterDrawerClick = (e: MouseEvent) => {
  const el = e.target as HTMLElement
  if (!el.closest('.filter-summary') && !el.closest('.filter-panel')) {
    filterExpanded.value = false
  }
}

// 获取显示价格
const getDisplayPrice = (cpu: Cpu): number | null => {
  return priceType.value === 'new' ? cpu.new_price : cpu.used_price
}

// 获取价格悬浮提示
const getPriceTitle = (cpu: Cpu): string => {
  const other = priceType.value === 'new' ? cpu.used_price : cpu.new_price
  const otherLabel = priceType.value === 'new' ? '二手价' : '全新价'
  if (other) {
    return `${otherLabel}: ${other} 元`
  }
  return '-'
}

// 价格涨跌指示
const getPriceChange = (cpu: Cpu): { value: number; direction: 'up' | 'down' | 'flat' } => {
  const currentPrice = getDisplayPrice(cpu)
  if (!currentPrice) return { value: 0, direction: 'flat' }

  const prevRecord = lastPriceMap.value.get(cpu.model)
  if (!prevRecord) return { value: 0, direction: 'flat' }

  const prevPrice = priceType.value === 'new' ? prevRecord.prev_new : prevRecord.prev_used
  if (!prevPrice) return { value: 0, direction: 'flat' }

  const diff = currentPrice - prevPrice
  if (diff > 0) return { value: Math.abs(diff), direction: 'up' }
  if (diff < 0) return { value: Math.abs(diff), direction: 'down' }
  return { value: 0, direction: 'flat' }
}

const priceChangeText = (cpu: Cpu): string => {
  const change = getPriceChange(cpu)
  if (change.direction === 'flat') return '—'
  return `${change.direction === 'up' ? '↑' : '↓'}${change.value}`
}

// 接近历史低价提示（当前价 ≤ 历史最低价 × 1.03）
const isNearHistoricalLow = (cpu: Cpu): boolean => {
  const currentPrice = getDisplayPrice(cpu)
  if (!currentPrice) return false

  const minRecord = minPriceMap.value.get(cpu.model)
  if (!minRecord) return false

  const minPrice = priceType.value === 'new' ? minRecord.min_new : minRecord.min_used
  if (!minPrice) return false

  return currentPrice <= minPrice * 1.03
}

// 计算性价比原始值（用于排序和比较）
const getRawValueScore = (cpu: Cpu): number => {
  const price = getDisplayPrice(cpu)
  if (!price || price <= 0) return 0

  if (valueMode.value === 'game') {
    // 游戏性价比 = 游戏原始分 / 价格 × 10
    return cpu.abs_game_performance / price * 10
  } else {
    // 多核性价比 = 多核原始分 / 价格 × 3
    return cpu.abs_multi_performance / price * 3
  }
}

// 计算性价比（用于排序，完全独立于显示状态）
const getSortValueScore = (cpu: Cpu): number => {
  // 使用排序专用的价格类型
  const price = sortPriceType.value === 'new' ? cpu.new_price : cpu.used_price
  if (!price || price <= 0) return 0

  // 使用排序专用的性价比模式
  if (sortValueMode.value === 'game') {
    return cpu.abs_game_performance / price * 10
  } else {
    return cpu.abs_multi_performance / price * 3
  }
}

// 排序用的价格（独立于显示用的价格类型）
const getSortPrice = (cpu: Cpu): number => {
  return sortPriceType.value === 'new' ? (cpu.new_price || 999999) : (cpu.used_price || 999999)
}

// 显示性价比（四舍五入整数，不乘系数）
const getDisplayValue = (cpu: Cpu): string => {
  const rawScore = getRawValueScore(cpu)
  if (rawScore <= 0) return '-'
  return Math.round(rawScore).toString()
}

// 悬浮显示精确值（四舍五入整数）
const getPreciseValue = (cpu: Cpu): string => {
  const rawScore = getRawValueScore(cpu)
  if (rawScore <= 0) return '-'
  return `性价比: ${Math.round(rawScore)}`
}

// 计算当前筛选条件下，满足条件的最大原始性价比
const maxValueScoreInFilter = computed((): number => {
  let maxScore = 0
  filteredCpus.value.forEach(cpu => {
    const perf = valueMode.value === 'game' 
      ? getRelativeGamePerf(cpu) 
      : getRelativeMultiPerf(cpu)
    // 性能分 >= 100
    if (parseInt(perf) >= 100) {
      const rawScore = getRawValueScore(cpu)
      if (rawScore > maxScore) {
        maxScore = rawScore
      }
    }
  })
  return maxScore
})

// 判断是否显示皇冠图标
const shouldShowCrown = (cpu: Cpu): boolean => {
  const rawScore = getRawValueScore(cpu)
  if (rawScore <= 0) return false
  
  // 检查性能分 >= 100
  const perf = valueMode.value === 'game' 
    ? getRelativeGamePerf(cpu) 
    : getRelativeMultiPerf(cpu)
  if (parseInt(perf) < 100) return false
  
  // 检查是否为最大原始性价比
  return rawScore === maxValueScoreInFilter.value && maxValueScoreInFilter.value > 0
}

// 排序CPU（注意：排序时使用 sortValueMode 而不是 valueMode）
const sortedCpus = computed(() => {
  const sorted = [...filteredCpus.value]

  sorted.sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortKey.value) {
      case 'model':
        aVal = a.model.toLowerCase()
        bVal = b.model.toLowerCase()
        break
      case 'game':
        aVal = a.abs_game_performance || 0
        bVal = b.abs_game_performance || 0
        break
      case 'multi':
        aVal = a.abs_multi_performance || 0
        bVal = b.abs_multi_performance || 0
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

// 获取排序图标
const getSortIcon = (key: string): string => {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

// 排序处理
const sort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
  // 点击性价比表头时，同步排序模式为当前显示模式
  if (key === 'value') {
    sortValueMode.value = valueMode.value
    sortPriceType.value = priceType.value
  }
  // 点击价格表头时，同步排序价格类型为当前显示价格类型
  if (key === 'price') {
    sortPriceType.value = priceType.value
  }
}

// 显示参数弹窗
const showSpecs = (cpu: Cpu) => {
  selectedCpu.value = cpu
  showSpecsModal.value = true
}

// 显示价格图表
const showPriceChart = async (cpu: Cpu) => {
  selectedCpu.value = cpu
  showChartModal.value = true
  priceChartLoading.value = true

  await nextTick()

  if (chartContainer.value) {
    const history = priceHistoryMap.value.get(cpu.model) || []
    renderChart(history)
  }
}

// 图表实例引用（用于内存清理）
let chartInstance: ReturnType<typeof echarts.init> | null = null
let currentResizeHandler: (() => void) | null = null

// 渲染图表
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

// 关闭所有弹窗
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

// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    error.value = ''

    const { data: cpuData, error: cpuError } = await supabase
      .from('cpu_current')
      .select('*')
      .order('abs_game_performance', { ascending: false })

    if (cpuError) throw cpuError

    // 大小写不敏感匹配基准CPU
    const benchUpper = BENCHMARK_CPU.toUpperCase()
    const benchmark = cpuData?.find(cpu =>
      cpu.model.toUpperCase() === benchUpper
    )
    if (benchmark) {
      benchmarkCpu.value = benchmark
    } else {
      // 兜底：模糊匹配 12490F
      const found = cpuData?.find(cpu =>
        cpu.model.toUpperCase().includes('12490F')
      )
      if (found) benchmarkCpu.value = found
    }

    cpus.value = cpuData || []

    // 分页拉取所有历史数据（Supabase 默认每页 1000 条）
    const PAGE_SIZE = 1000
    let allHistoryData: any[] = []
    let pageOffset = 0
    let hasMore = true

    while (hasMore) {
      const { data, error: historyError } = await supabase
        .from('cpu_price_history')
        .select('*')
        .order('recorded_at', { ascending: true })
        .range(pageOffset, pageOffset + PAGE_SIZE - 1)

      if (historyError) throw historyError

      if (data && data.length > 0) {
        allHistoryData.push(...data)
        pageOffset += PAGE_SIZE
        hasMore = data.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    const historyMap = new Map<string, PriceHistory[]>()
    allHistoryData.forEach((item: any) => {
      const existing = historyMap.get(item.model) || []
      existing.push({
        recorded_at: item.recorded_at,
        new_price: item.new_price,
        used_price: item.used_price
      })
      historyMap.set(item.model, existing)
    })

    priceHistoryMap.value = historyMap

    // 构建上次价格 Map（按价格类型分别找上一个有值的记录）和历史最低价 Map
    const tmpLast = new Map<string, { prev_new: number | null; prev_used: number | null }>()
    const tmpMin = new Map<string, { min_new: number | null; min_used: number | null }>()

    historyMap.forEach((history, model) => {
      // 按价格类型分别找倒数第二条有值记录
      const newPriceRecords = history.filter(h => h.new_price !== null)
      const usedPriceRecords = history.filter(h => h.used_price !== null)

      tmpLast.set(model, {
        prev_new: newPriceRecords.length >= 2 ? newPriceRecords[newPriceRecords.length - 2].new_price : null,
        prev_used: usedPriceRecords.length >= 2 ? usedPriceRecords[usedPriceRecords.length - 2].used_price : null
      })

      // 历史最低价（忽略 null）
      const newPrices = history.map(h => h.new_price).filter((p): p is number => p !== null)
      const usedPrices = history.map(h => h.used_price).filter((p): p is number => p !== null)
      if (newPrices.length > 0 || usedPrices.length > 0) {
        tmpMin.set(model, {
          min_new: newPrices.length > 0 ? Math.min(...newPrices) : null,
          min_used: usedPrices.length > 0 ? Math.min(...usedPrices) : null
        })
      }
    })

    lastPriceMap.value = tmpLast
    minPriceMap.value = tmpMin

    // 计算热门型号：所有有全新价的CPU都显示
    const hot = new Set(
      cpus.value
        .filter(cpu => cpu.new_price !== null)
        .map(cpu => cpu.model)
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
  const oldScript = document.querySelector('script[data-jsonld="cpu-list"]')
  if (oldScript) oldScript.remove()

  const items = sortedCpus.value.slice(0, 20).map((cpu, idx) => ({
    "@type": "Product",
    "name": cpu.model,
    "position": idx + 1,
    "offers": {
      "@type": "Offer",
      "price": cpu.new_price || cpu.used_price || 0,
      "priceCurrency": "CNY"
    }
  }))

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "CPU性价比排行榜",
    "description": "基于实测数据的CPU性价比排行，每月更新",
    "numberOfItems": items.length,
    "itemListElement": items
  })

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-jsonld', 'cpu-list')
  script.textContent = jsonLd
  document.head.appendChild(script)
}

onMounted(() => {
  loadData().then(() => nextTick(() => injectJsonLd()))
  startAutoPlay()
  document.addEventListener('click', onFilterDrawerClick, true)
})

// 监听 sortedCpus 变化，实时更新 JSON-LD
watch(sortedCpus, () => {
  injectJsonLd()
}, { deep: false })

onUnmounted(() => {
  stopAutoPlay()
  document.removeEventListener('click', onFilterDrawerClick, true)
})
</script>

<style scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

/* 顶部区域：标签 + 轮播图 */
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

/* 价格筛选抽屉 */
.filter-drawer { margin-bottom: 0.75rem; }
.filter-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.filter-summary:hover { background: rgba(255, 255, 255, 0.05); }
.filter-summary-text { font-size: 0.8rem; color: rgba(255, 255, 255, 0.55); }
.filter-toggle-btn {
  display: flex; align-items: center; gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-toggle-btn:hover {
  background: rgba(255, 215, 0, 0.08);
  border-color: rgba(255, 215, 0, 0.35);
  color: rgba(255, 215, 0, 0.85);
}
.toggle-arrow { font-size: 0.65rem; transition: transform 0.2s; display: inline-block; }
.filter-toggle-btn.open .toggle-arrow { transform: rotate(180deg); }
.filter-panel {
  position: relative;
  margin-top: 0.4rem;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}
.filter-panel-inner { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.price-inputs { display: flex; align-items: center; gap: 0.3rem; }
.price-input {
  width: 68px; padding: 0.25rem 0.4rem;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 5px; color: #e0e0e0; font-size: 0.8rem; text-align: center;
}
.price-input:focus { outline: none; border-color: #FFD700; background: rgba(255, 215, 0, 0.06); }
.price-input::placeholder { color: rgba(255, 255, 255, 0.25); }
.price-sep { color: rgba(255, 255, 255, 0.3); font-size: 0.75rem; }
.price-presets { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.preset-btn {
  padding: 0.28rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.78rem; cursor: pointer; transition: all 0.15s;
}
.preset-btn:hover { border-color: rgba(255, 215, 0, 0.4); color: rgba(255, 215, 0, 0.8); }
.preset-btn.active {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.6); color: #FFD700; font-weight: 600;
}
.clear-btn {
  padding: 0.2rem 0.5rem; background: transparent;
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 20px; color: rgba(255, 120, 120, 0.7);
  font-size: 0.75rem; cursor: pointer; transition: all 0.15s;
}
.clear-btn:hover { background: rgba(255, 80, 80, 0.12); border-color: rgba(255, 80, 80, 0.6); color: #ff8888; }
.filter-close-btn {
  position: absolute; top: 0.5rem; right: 0.5rem;
  width: 24px; height: 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.4); font-size: 0.75rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.filter-close-btn:hover { background: rgba(255, 80, 80, 0.15); border-color: rgba(255, 80, 80, 0.5); color: #ff8888; }

/* 抽屉动画 */
.drawer-enter-active, .drawer-leave-active { transition: all 0.22s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; transform: translateY(-8px); }

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
}

.tab-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.tab-btn.active,
.tab-btn.router-link-exact-active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 600;
}

/* 顶部轮播图（纯文字占位） */
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

.page-info {
  color: var(--text-secondary);
  font-size: 0.85rem;
  flex-shrink: 0;
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

/* 自定义滚动条 */
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
  font-size: 14px;
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
  min-width: 180px;
  text-align: center;
}

.model-col:hover .th-label,
.model-col:hover .th-label.brand-amd,
.model-col:hover .th-label.brand-intel {
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
  min-width: 100px;
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
  line-height: 1.5;
  border-bottom: 1px solid #2A2A4A;
  font-size: 14px;
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

.model:hover .model-name.brand-amd,
.model:hover .model-name.brand-intel {
  color: var(--accent) !important;
  text-decoration: underline;
}

/* 品牌颜色 */
.brand-amd {
  color: #E34F26 !important;
}

.brand-intel {
  color: #0071C5 !important;
}

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

.price-value {
  font-family: 'Roboto Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #E8E8F0;
}

.no-price {
  color: var(--text-secondary);
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

/* 涨跌+图标容器：固定宽度，对齐 */
.price-indicators {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 4.8em;
  justify-content: flex-start;
  flex-shrink: 0;
}

/* 涨跌指示 */
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

/* 趋势小图标 */
.trend-icon {
  font-size: 0.9rem;
  opacity: 0.65;
  flex-shrink: 0;
}

.trend-icon.muted {
  opacity: 0.3;
}

/* 接近历史低价火焰 */
.fire-icon {
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* 皇冠图标 */
.crown-icon {
  margin-left: 0.25rem;
  font-size: 0.9rem;
}

/* 加载和错误 */
.loading,
.error-box,
.no-data,
.placeholder {
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

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.placeholder h2 {
  color: var(--text-primary);
  margin-bottom: 0.3rem;
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
  max-width: 380px;
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
}

/* 性能显示 */
.perf-display {
  display: flex;
  gap: 0.6rem;
}

.perf-item {
  flex: 1;
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

/* ─── 移动端专属优化 ─── */
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
  .toggle-btn {
    min-height: 38px;
    min-width: 38px;
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
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
  .inline-toggle {
    display: flex;
    width: 100%;
  }

  .toggle-sep {
    display: none;
  }

  .price-col .th-inner,
  .value-col .th-inner {
    align-items: stretch;
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
    flex-direction: column;
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
    min-height: 200px;
    text-align: center;
  }

  /* 轮播图点击区域优化 */
  .top-carousel {
    min-height: 50px;
    padding: 0.5rem;
  }

  .carousel-dots {
    bottom: 2px;
  }

  /* 背景与文字对比微调 */
  .table-wrapper {
    background: #1a1a2e;
  }

  /* 表格高度增加以显示更多行 */
  .table-wrapper {
    max-height: 65vh;
  }

  .chart-modal {
    width: 96vw;
  }

  /* 价格变化指示放大 */
  .price-change {
    font-size: 0.85rem;
  }

  .trend-icon {
    display: inline;
    font-size: 1rem;
  }

  .fire-icon {
    font-size: 0.9rem;
  }

  .price-indicators {
    gap: 0.25rem;
    width: auto;
  }

  /* 价格筛选抽屉移动端：只显示收起条+展开面板 */
  .filter-summary { padding: 0.5rem 0.6rem; }
  .filter-summary-text { font-size: 0.75rem; }
  .filter-panel { padding: 0.6rem 0.6rem 0.75rem; }
  .price-input { width: 60px; font-size: 0.75rem; }
  .preset-btn { padding: 0.28rem 0.5rem; font-size: 0.72rem; }
  .price-presets { gap: 0.25rem; }
  .clear-btn { font-size: 0.72rem; }
}
</style>
