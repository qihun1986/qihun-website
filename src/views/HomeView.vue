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

    <!-- CPU内容区 -->
    <div class="content-area">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>加载中...</span>
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
        <p>暂无数据</p>
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
  { image: '/images/banner1.jpg', link: 'https://www.bilibili.com/video/BV1BD6YBZE9n/', title: '【CPU游戏性能-天梯图】2026年1月29日更新' },
  { image: '/images/banner2.jpg', link: 'https://space.bilibili.com/3546785037420940', title: 'B站主页' },
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

// 筛选CPU
const filteredCpus = computed(() => {
  if (showMode.value === 'hot') {
    return cpus.value.filter(cpu => cpu.new_price && cpu.new_price > 0)
  }
  return cpus.value
})

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
})

// 监听 sortedCpus 变化，实时更新 JSON-LD
watch(sortedCpus, () => {
  injectJsonLd()
}, { deep: false })

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
  color: var(--text-secondary);
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
  color: var(--text-secondary);
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
  color: var(--text-secondary);
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
  background: var(--bg-tertiary);
}

.cpu-table td {
  padding: 0.6rem 0.4rem;
  border-bottom: 1px solid var(--border);
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
  color: var(--text-primary);
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
  font-size: 0.7rem;
  font-family: 'Roboto Mono', monospace;
  white-space: nowrap;
  min-width: 2.4em;
  text-align: left;
}

.price-up { color: #f87171; }
.price-down { color: #4ade80; }
.price-flat { color: #a0a0a0; }

/* 趋势小图标 */
.trend-icon {
  font-size: 0.75rem;
  opacity: 0.65;
  flex-shrink: 0;
}

.trend-icon.muted {
  opacity: 0.3;
}

/* 接近历史低价火焰 */
.fire-icon {
  font-size: 0.7rem;
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
  color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid var(--danger);
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
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 0.15rem;
}

.spec-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
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
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 0.2rem;
}

.perf-value {
  font-size: 1.2rem;
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
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
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  .home {
    padding: 0.8rem;
  }

  .tab-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.85rem;
  }

  .table-wrapper {
    max-height: 55vh;
  }

  .cpu-table td {
    font-size: 12px;
    padding: 0.5rem 0.3rem;
  }

  .toggle-btn {
    min-height: 36px;
    min-width: 40px;
    font-size: 0.65rem;
  }

  .specs-grid {
    grid-template-columns: 1fr;
  }

  .perf-display {
    flex-direction: column;
  }

  .chart-modal {
    width: 96vw;
  }

  .chart-container {
    height: 180px;
  }

  .price-change,
  .fire-icon {
    font-size: 0.6rem;
  }
}
</style>
