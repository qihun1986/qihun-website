<template>
  <div class="gpu-dashboard">
    <!-- 双轮播 -->
    <div class="top-bar-dual">
      <CarouselBanner type="deal" :items="dealItems" @card-click="onDealCardClick" />
      <CarouselBanner type="video" :items="videoItems" />
    </div>

    <!-- 移动端切换栏 -->
    <div class="mobile-switch-bar">
      <div class="mobile-switch-group">
        <button :class="{ active: showMode === 'hot' }" @click="setShowMode('hot')">热门</button>
        <button :class="{ active: showMode === 'all' }" @click="setShowMode('all')">全部</button>
      </div>
      <div class="mobile-switch-group">
        <button :class="{ active: priceType === 'new' }" @click="priceType = 'new'">全新</button>
        <button :class="{ active: priceType === 'used' }" @click="priceType = 'used'">二手</button>
      </div>
    </div>

    <!-- 桌面端搜索栏 -->
    <div class="action-toolbar desktop-only">
      <div class="action-btns">
        <div class="search-bar">
          <input v-model="searchQuery" type="text" placeholder="🔍 搜索型号" />
        </div>
      </div>
    </div>

    <!-- 表格 + 悬浮按钮包装 -->
    <div class="table-with-fab">
      <div class="table-wrapper" ref="tableWrapper">
        <!-- 魂味提示 -->
        <Transition name="tip-fade">
          <div v-if="showAllModeTip || showNearLowTip" class="all-mode-tip">
            <div v-if="showAllModeTip">💡 已切到二手价，魂哥觉得二手显卡性价比更实在</div>
            <div v-if="showNearLowTip">🔥 这 {{ filteredGpus.length }} 款里有 {{ nearLowCount }} 款价格已经到底了，现在下手不亏</div>
          </div>
        </Transition>

        <table class="cpu-table">
          <thead>
            <tr>
              <th class="rank-col"><span class="rank-count">{{ filteredGpus.length }}</span>排名</th>
              <th class="model-col sortable" @click="sort('model')">
                <div class="th-stack">
                  <span>型号 <span class="sort-icon">{{ getSortIcon('model') }}</span></span>
                  <div class="inline-toggle" @click.stop>
                    <button :class="{ active: showMode === 'hot' }" @click.stop="setShowMode('hot')">热门</button>
                    <span class="toggle-sep">/</span>
                    <button :class="{ active: showMode === 'all' }" @click.stop="setShowMode('all')">全部</button>
                  </div>
                </div>
              </th>
              <th class="game-col sortable" @click="sort('game')">
                <div class="th-stack">
                  <span>游戏性能 <span class="sort-icon">{{ getSortIcon('game') }}</span></span>
                  <div class="res-toggle" @click.stop>
                    <button v-for="res in ['1080P', '2K', '4K']" :key="res" :class="{ active: displayRes === res }" @click.stop="setDisplayRes(res)" class="res-btn">{{ res }}</button>
                  </div>
                </div>
              </th>
              <th class="perf-col sortable" @click="sort('render')">
                <div class="th-stack">
                  <span>创作效率 <span class="sort-icon">{{ getSortIcon('render') }}</span></span>
                </div>
              </th>
              <th class="price-col" colspan="2">
                <div class="th-stack">
                  <span class="sortable" @click="sort('price')">价格 <span class="sort-icon">{{ getSortIcon('price') }}</span></span>
                  <div class="th-controls" @click.stop>
                    <div class="inline-toggle">
                      <button :class="{ active: priceType === 'new' }" @click.stop="priceType = 'new'">全新</button>
                      <span class="toggle-sep">/</span>
                      <button :class="{ active: priceType === 'used' }" @click.stop="priceType = 'used'">二手</button>
                    </div>
                  </div>
                </div>
              </th>
              <th class="value-col sortable" @click="sort('value')">
                <div class="th-stack">
                  <span>性价比 <span class="sort-icon">{{ getSortIcon('value') }}</span></span>
                  <select v-model="valueMode" class="value-select" @click.stop>
                    <option value="perf1080">1080P</option>
                    <option value="perf2k">2K</option>
                    <option value="perf4k">4K</option>
                    <option value="render">创作</option>
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(gpu, index) in sortedGpus" :key="gpu.id" class="cpu-row" @click="openSpecs(gpu)">
              <td class="rank">{{ index + 1 }}</td>
              <td class="model">
                <span class="model-name" :class="getBrandClass(gpu.model)">
                  <span v-if="isInCompare(gpu)" class="compare-check">✓</span>
                  <span class="desktop-only">{{ gpu.model }}</span>
                  <span class="mobile-only">{{ shortGpu(gpu.model) }}</span>
                </span>
              </td>
              <td class="game-perf">{{ getDisplayGamePerf(gpu) }}</td>
              <td class="perf">{{ getRelativeRender(gpu) }}</td>
              <td class="price-num-cell" @click.stop="openPriceChart(gpu)">
                <span v-if="getDisplayPrice(gpu)" class="price-value mono">{{ formatPrice(getDisplayPrice(gpu)) }}</span>
                <span v-else class="no-price">-</span>
              </td>
              <td class="price-change-cell" @click.stop="openPriceChart(gpu)">
                <span v-if="getDisplayPrice(gpu)" class="price-change" :class="getPriceChangeClass(gpu)">{{ getPriceChangeText(gpu) }}</span>
                <span v-else class="price-change price-flat">—</span>
                <span v-if="isNearHistoricalLow(gpu)" class="fire-icon">🔥</span>
              </td>
              <td class="value-cell">
                <span class="value-bar" :class="valueLevel(getDisplayValueNum(gpu), 100)">{{ getDisplayValue(gpu) }}</span>
                <span v-if="shouldShowCrown(gpu)" class="crown-icon">👑</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredGpus.length === 0" class="empty">
          这个价位暂时没有符合条件的结果，筛不出来的是纠结——适合自己的最好 😊
        </div>
      </div>

      <!-- 桌面端悬浮按钮组 -->
      <div class="desktop-fab-group">
        <button class="desktop-fab-btn" @click="openDesktopFilter">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1.5 3h13M4 8h8M6.5 13h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>筛选</span>
        </button>
        <button class="desktop-fab-btn" @click="openCompareModal">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="5" height="10" rx="0.5" stroke="currentColor" stroke-width="1.2"/>
            <rect x="10" y="6" width="5" height="7" rx="0.5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          <span>对比</span>
          <span v-if="compareList.length" class="desktop-fab-badge">{{ compareList.length }}</span>
        </button>
      </div>
    </div>

    <!-- 桌面端筛选浮层 -->
    <Transition name="modal">
      <div v-if="desktopFilterVisible" class="desktop-filter-overlay" @click.self="closeDesktopFilter">
        <div class="desktop-filter-panel">
          <div class="filter-panel-header">
            <span>筛选显卡</span>
            <button class="close-btn" @click="closeDesktopFilter">×</button>
          </div>
          <div class="filter-panel-body">
            <div class="filter-section">
              <div class="section-label">价格区间</div>
              <div class="price-inputs">
                <input v-model.number="draftPriceMin" type="number" placeholder="最低" class="price-input" />
                <span class="price-sep">—</span>
                <input v-model.number="draftPriceMax" type="number" placeholder="最高" class="price-input" />
              </div>
              <div class="preset-btns">
                <button v-for="preset in pricePresets" :key="preset.label"
                  :class="{ active: draftPriceMin === preset.min && (preset.max === Infinity ? draftPriceMax === '' : draftPriceMax === preset.max) }"
                  class="preset-btn" @click="applyPreset(preset)">{{ preset.label }}</button>
              </div>
            </div>
            <div class="filter-section">
              <div class="section-label">发售年份</div>
              <div class="year-inputs">
                <input v-model.number="draftYearStart" type="number" placeholder="起始" class="year-input" :class="{ error: yearError }" />
                <span class="price-sep">—</span>
                <input v-model.number="draftYearEnd" type="number" placeholder="截止" class="year-input" :class="{ error: yearError }" />
              </div>
              <div class="preset-btns">
                <button :class="{ active: draftYearPreset === 1 }" class="preset-btn" @click="draftYearPreset = draftYearPreset === 1 ? null : 1">1年内</button>
                <button :class="{ active: draftYearPreset === 3 }" class="preset-btn" @click="draftYearPreset = draftYearPreset === 3 ? null : 3">3年内</button>
              </div>
              <div v-if="yearError" class="warning">⚠️ {{ yearError }}</div>
            </div>
          </div>
          <div class="filter-panel-actions">
            <button class="reset-btn" @click="resetDraft">重置</button>
            <button class="cancel-btn" @click="closeDesktopFilter">取消</button>
            <button class="confirm-btn" @click="applyDesktopFilter">确认</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 移动端筛选浮层 -->
    <div :class="{ show: mobileFilterVisible }" class="mobile-filter-overlay" @click.self="mobileFilterVisible = false">
      <div class="mobile-filter-sheet" @touchstart="onSheetTouchStart" @touchmove="onSheetTouchMove" @touchend="onSheetTouchEnd">
        <div class="sheet-handle"></div>
        <div class="sheet-body">
          <div class="filter-section">
            <div class="section-label">价格区间</div>
            <div class="price-inputs">
              <input v-model.number="draftPriceMin" type="number" placeholder="最低" class="price-input" />
              <span class="price-sep">—</span>
              <input v-model.number="draftPriceMax" type="number" placeholder="最高" class="price-input" />
            </div>
            <div class="preset-btns">
              <button v-for="preset in pricePresets" :key="preset.label"
                :class="{ active: draftPriceMin === preset.min && (preset.max === Infinity ? draftPriceMax === '' : draftPriceMax === preset.max) }"
                class="preset-btn" @click="applyPreset(preset)">{{ preset.label }}</button>
            </div>
          </div>
          <div class="filter-section">
            <div class="section-label">发售年份</div>
            <div class="year-inputs">
              <input v-model.number="draftYearStart" type="number" placeholder="起始" class="year-input" :class="{ error: yearError }" />
              <span class="price-sep">—</span>
              <input v-model.number="draftYearEnd" type="number" placeholder="截止" class="year-input" :class="{ error: yearError }" />
            </div>
            <div class="preset-btns">
              <button :class="{ active: draftYearPreset === 1 }" class="preset-btn" @click="draftYearPreset = draftYearPreset === 1 ? null : 1">1年内</button>
              <button :class="{ active: draftYearPreset === 3 }" class="preset-btn" @click="draftYearPreset = draftYearPreset === 3 ? null : 3">3年内</button>
            </div>
            <div v-if="yearError" class="warning">⚠️ {{ yearError }}</div>
          </div>
        </div>
        <div class="sheet-actions">
          <button class="reset-btn" @click="resetDraft">重置</button>
          <button @click="mobileFilterVisible = false">取消</button>
          <button class="confirm-btn" @click="applyMobileFilter">确定</button>
        </div>
      </div>
    </div>

    <!-- 移动端悬浮按钮组 -->
    <div v-if="isMobile" class="mobile-fab-group" :class="{ collapsed: fabCollapsed }">
      <button class="fab-btn filter-fab" @click="openMobileFilter">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2.5 4h15M5.5 10h9M8.5 16h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="fab-btn compare-fab" @click="openCompareModal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="22" x2="19" y2="22" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="7" x2="3" y2="11" />
          <path d="M1 11 h4 v1.5 a1 1 0 0 1 -1 1 h-2 a1 1 0 0 1 -1 -1 z" />
          <line x1="21" y1="7" x2="21" y2="11" />
          <path d="M19 11 h4 v1.5 a1 1 0 0 1 -1 1 h-2 a1 1 0 0 1 -1 -1 z" />
        </svg>
        <span v-if="compareList.length" class="fab-badge">{{ compareList.length }}</span>
      </button>
    </div>

    <!-- 对比为空提示弹窗 -->
    <div :class="{ show: showEmptyCompareTip }" class="modal-overlay" @click.self="showEmptyCompareTip = false">
      <div class="modal-panel" style="max-width:400px" @touchstart="onTipTouchStart" @touchmove="onTipTouchMove" @touchend="onTipTouchEnd">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <h3>📊 对比栏是空的</h3>
          <button class="nav-modal-close" @click="showEmptyCompareTip = false" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">还没添加显卡哦<br>快去找一个「加到对比」吧</p>
          <button class="nav-modal-btn primary" @click="showEmptyCompareTip = false">知道了</button>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <GpuSpecsModal
      ref="specsModal"
      :benchmark-gpu="specsBenchmark"
      :default-benchmarks="benchmarks"
      :is-in-compare="selectedDetailGpu ? isInCompare(selectedDetailGpu) : false"
      :is-benchmark="selectedDetailGpu && selectedDetailGpu.id === benchmarkGpu?.id"
      :is-compare-full="compareList.length >= 3"
      @add-compare="addToCompareCore"
      @remove-compare="removeFromCompare"
      @set-benchmark="setAsBenchmark"
      @reset-benchmark="resetBenchmark"
    />
    <GpuPriceChartModal ref="chartModal" />
    <GpuCompareModal
      ref="compareModalRef"
      :gpus="compareList"
      :bench-gpu="benchmarkGpu"
      :default-benchmarks="benchmarks"
      :initial-res="displayRes"
      @set-benchmark="setAsBenchmark"
      @remove-compare="removeFromCompare"
    />
    <DealModal ref="dealModal" :deals-text="dealsText" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import CarouselBanner from './CarouselBanner.vue'
import GpuSpecsModal from './GpuSpecsModal.vue'
import GpuPriceChartModal from './GpuPriceChartModal.vue'
import DealModal from './DealModal.vue'
import GpuCompareModal from './GpuCompareModal.vue'

const props = defineProps({
  initialGpus: String,
  initialMinPriceMap: String,
  initialHotSet: String,
  initialDealItems: String,
  initialDealsText: String,
  initialVideoItems: String,
  initialReleaseDates: String,
  initialBenchmarks: String
})

const releaseDates = ref(JSON.parse(props.initialReleaseDates || '{}'))
const allGpus = ref(JSON.parse(props.initialGpus || '[]'))
const fullDataLoaded = ref(false)
const minPriceMap = ref(new Map(JSON.parse(props.initialMinPriceMap || '[]')))
const hotSet = ref(new Set(JSON.parse(props.initialHotSet || '[]')))
const benchmarks = ref(JSON.parse(props.initialBenchmarks || '{"perf1080":null,"perf2k":null,"perf4k":null,"render":null}'))
const dealItems = ref(JSON.parse(props.initialDealItems || '[]'))
const dealsText = ref(JSON.parse(props.initialDealsText || "''"))
const videoItems = ref(JSON.parse(props.initialVideoItems || '[]'))

// UI 状态
const searchQuery = ref('')
const showMode = ref('hot')
const priceType = ref('new')
const valueMode = ref('perf2k')
const displayRes = ref('2K')
const sortKey = ref('value')
const sortOrder = ref('desc')
const showAllModeTip = ref(false)
const showNearLowTip = ref(false)
let tipTimer = null

// 已应用的筛选
const appliedPriceMin = ref('')
const appliedPriceMax = ref('')
const appliedYearStart = ref(null)
const appliedYearEnd = ref(null)
const appliedYearPreset = ref(null)

// 桌面/移动共用草稿
const desktopFilterVisible = ref(false)
const mobileFilterVisible = ref(false)
const draftPriceMin = ref('')
const draftPriceMax = ref('')
const draftYearStart = ref('')
const draftYearEnd = ref('')
const draftYearPreset = ref(null)

const yearError = ref('')

const tableWrapper = ref(null)
const specsModal = ref(null)
const chartModal = ref(null)
const isMobile = ref(false)
const compareList = ref([])
const showFullTip = ref(false)
const selectedDetailGpu = ref(null)
const fabCollapsed = ref(false)
const compareModalRef = ref(null)
const showEmptyCompareTip = ref(false)

const benchmarkGpu = ref(null)
const defaultBenchmarkGpu = computed(() => {
  if (displayRes.value === '1080P') return benchmarks.value.perf1080
  if (displayRes.value === '4K') return benchmarks.value.perf4k
  return benchmarks.value.perf2k
})

benchmarkGpu.value = defaultBenchmarkGpu.value

const pricePresets = [
  { label: '500内', min: 0, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000-2000', min: 1000, max: 2000 },
  { label: '2000-4000', min: 2000, max: 4000 },
  { label: '4000+', min: 4000, max: Infinity }
]

const validateYearDraft = () => {
  const start = draftYearStart.value
  const end = draftYearEnd.value
  yearError.value = ''
  if (start !== '' && (start < 2000 || start > 2027)) { yearError.value = '起始年份需在 2000-2027'; return false }
  if (end !== '' && (end < 2000 || end > 2027)) { yearError.value = '截止年份需在 2000-2027'; return false }
  if (start !== '' && end !== '' && start > end) { yearError.value = '起始年份不能晚于截止年份'; return false }
  return true
}

const getReleaseYear = (model) => {
  const date = releaseDates.value[model]
  if (date) return parseInt(date.slice(0, 4))
  for (const [key, val] of Object.entries(releaseDates.value)) {
    if (model.includes(key) || key.includes(model)) return parseInt(val.slice(0, 4))
  }
  return null
}

const specsBenchmark = computed(() => {
  if (!benchmarks.value) return null
  const b = benchmarks.value
  return {
    abs_game_performance_1080p: b.perf1080?.abs_game_performance_1080p ?? null,
    abs_game_performance_2k: b.perf2k?.abs_game_performance_2k ?? null,
    abs_game_performance_4k: b.perf4k?.abs_game_performance_4k ?? null,
    render_performance: b.render?.render_performance ?? null,
  }
})

const formatPrice = (p) => p != null ? '¥' + p.toLocaleString('zh-CN') : '-'
const getBrandClass = (m) => {
  const u = m?.toUpperCase() || ''
  if (u.includes('NVIDIA') || u.includes('RTX') || u.includes('GTX')) return 'brand-nvidia'
  if (u.includes('AMD') || u.includes('RX')) return 'brand-amd'
  if (u.includes('INTEL') || u.includes('ARC')) return 'brand-intel'
  return ''
}
const shortGpu = (m) => m.replace(/NVIDIA GeForce |AMD Radeon |INTEL Arc /i, '').replace(/NVIDIA |AMD |INTEL /i, '').replace(/\b(RTX|GTX|RX)\s*/gi, '').trim()
const getDisplayPrice = (gpu) => priceType.value === 'new' ? gpu.new_price : gpu.used_price
const getRelativeGamePerf = (gpu) => {
  if (!benchmarks.value) return '-'
  let field, base
  if (displayRes.value === '1080P') {
    field = 'abs_game_performance_1080p'
    base = benchmarks.value.perf1080 ? benchmarks.value.perf1080.abs_game_performance_1080p : null
  } else if (displayRes.value === '2K') {
    field = 'abs_game_performance_2k'
    base = benchmarks.value.perf2k ? benchmarks.value.perf2k.abs_game_performance_2k : null
  } else {
    field = 'abs_game_performance_4k'
    base = benchmarks.value.perf4k ? benchmarks.value.perf4k.abs_game_performance_4k : null
  }
  if (!gpu[field] || !base) return '-'
  return Math.round((gpu[field] / base) * 100).toString()
}
const getDisplayGamePerf = (gpu) => getRelativeGamePerf(gpu)
const getRelativeRender = (gpu) => {
  if (!benchmarks.value.render || !gpu.render_performance) return '-'
  const base = benchmarks.value.render.render_performance
  if (!base) return '-'
  return Math.round((gpu.render_performance / base) * 100).toString()
}
const getPriceChangeText = (gpu) => {
  const dir = priceType.value === 'new' ? gpu.price_change_direction : gpu.price_used_direction
  const ch = priceType.value === 'new' ? gpu.price_change : gpu.price_used_change
  if (!dir || dir === 'flat' || !ch) return '—'
  return (dir === 'up' ? '↑' : '↓') + Math.abs(ch)
}
const getPriceChangeClass = (gpu) => {
  const dir = priceType.value === 'new' ? gpu.price_change_direction : gpu.price_used_direction
  if (dir === 'up') return 'price-up'
  if (dir === 'down') return 'price-down'
  return ''
}
const isNearHistoricalLow = (gpu) => {
  const price = getDisplayPrice(gpu)
  if (!price) return false
  const rec = minPriceMap.value.get(gpu.model)
  if (!rec) return false
  const min = priceType.value === 'new' ? rec.min_new : rec.min_used
  return min && price <= min * 1.03
}
const getDisplayValueNum = (gpu) => {
  const isNew = priceType.value === 'new'
  const key = valueMode.value === 'perf1080' ? 'value_score_1080p' : valueMode.value === 'perf2k' ? 'value_score_2k' : valueMode.value === 'perf4k' ? 'value_score_4k' : 'value_score_render'
  const keyUsed = key + '_used'
  return isNew ? (gpu[key] || 0) : (gpu[keyUsed] || 0)
}
const getDisplayValue = (gpu) => {
  const raw = getDisplayValueNum(gpu)
  if (raw <= 0) return '-'
  const multiplier = valueMode.value === 'perf1080' ? 1.05 : 1
  return Math.round(raw * multiplier).toString()
}
const valueLevel = (score, max) => {
  const r = score / max
  if (r >= 0.8) return 'val-legendary'
  if (r >= 0.6) return 'val-normal'
  return 'val-bad'
}
const getSortIcon = (key) => {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

const filteredGpus = computed(() => {
  let list = allGpus.value
  if (showMode.value === 'hot') list = list.filter(g => hotSet.value.has(g.model))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(g => g.model.toLowerCase().includes(q))
  }
  const min = appliedPriceMin.value !== '' ? Number(appliedPriceMin.value) : 0
  const max = appliedPriceMax.value !== '' ? Number(appliedPriceMax.value) : Infinity
  list = list.filter(g => {
    const p = getDisplayPrice(g)
    return p != null && p >= min && p <= max
  })
  if (appliedYearPreset.value) {
    const cutoff = 2026 - appliedYearPreset.value
    list = list.filter(g => {
      const yr = getReleaseYear(g.model)
      return yr && yr >= cutoff
    })
  } else {
    if (appliedYearStart.value) list = list.filter(g => { const yr = getReleaseYear(g.model); return yr && yr >= appliedYearStart.value })
    if (appliedYearEnd.value) list = list.filter(g => { const yr = getReleaseYear(g.model); return yr && yr <= appliedYearEnd.value })
  }
  return list
})

const sortedGpus = computed(() => {
  const list = [...filteredGpus.value]
  const key = sortKey.value
  const order = sortOrder.value
  list.sort((a, b) => {
    let va, vb
    if (key === 'model') { va = a.model.toLowerCase(); vb = b.model.toLowerCase() }
    else if (key === 'price') { va = getDisplayPrice(a) ?? Infinity; vb = getDisplayPrice(b) ?? Infinity }
    else if (key === 'value') { va = getDisplayValueNum(a); vb = getDisplayValueNum(b) }
    else if (key === 'game') {
      const field = displayRes.value === '1080P' ? 'abs_game_performance_1080p' : displayRes.value === '2K' ? 'abs_game_performance_2k' : 'abs_game_performance_4k'
      va = a[field] || 0; vb = b[field] || 0
    }
    else if (key === 'render') { va = a.render_performance || 0; vb = b.render_performance || 0 }
    else return 0
    return order === 'asc' ? va - vb : vb - va
  })
  return list
})

const nearLowCount = computed(() => filteredGpus.value.filter(g => isNearHistoricalLow(g)).length)

const shouldShowCrown = (gpu) => {
  const max = Math.max(...filteredGpus.value.map(g => getDisplayValueNum(g)))
  return getDisplayValueNum(gpu) === max && max > 0 && getRelativeGamePerf(gpu) !== '-' && parseInt(getRelativeGamePerf(gpu)) >= 100
}

function sort(key) {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortOrder.value = 'desc' }
  scrollToTop()
}
function scrollToTop() { nextTick(() => tableWrapper.value?.scrollTo(0, 0)) }
function setShowMode(mode) {
  if (mode === 'all' && !fullDataLoaded.value) {
    fetch('/data/gpu-all.json')
      .then(res => res.json())
      .then(data => {
        allGpus.value = data
        fullDataLoaded.value = true
      })
      .catch(err => console.error('加载完整显卡数据失败，将使用默认热门数据', err))
  }

  showMode.value = mode
  if (mode === 'all') {
    priceType.value = 'used'
    showAllModeTip.value = true
    showNearLowTip.value = nearLowCount.value > 0
    clearTimeout(tipTimer)
    tipTimer = setTimeout(() => {
      showAllModeTip.value = false
      showNearLowTip.value = false
    }, 3000)
  } else {
    showAllModeTip.value = false
    if (nearLowCount.value > 0) {
      showNearLowTip.value = true
      clearTimeout(tipTimer)
      tipTimer = setTimeout(() => { showNearLowTip.value = false }, 3000)
    } else {
      showNearLowTip.value = false
    }
  }
  scrollToTop()
}
function setDisplayRes(res) { displayRes.value = res; valueMode.value = res === '1080P' ? 'perf1080' : res === '2K' ? 'perf2k' : 'perf4k' }

watch(nearLowCount, (newVal) => {
  if (showAllModeTip.value) return
  if (newVal > 0) {
    if (!showNearLowTip.value) {
      showNearLowTip.value = true
      clearTimeout(tipTimer)
      tipTimer = setTimeout(() => { showNearLowTip.value = false }, 3000)
    }
  } else {
    showNearLowTip.value = false
  }
}, { immediate: true })

function openDesktopFilter() {
  draftPriceMin.value = appliedPriceMin.value
  draftPriceMax.value = appliedPriceMax.value
  draftYearStart.value = appliedYearStart.value ?? ''
  draftYearEnd.value = appliedYearEnd.value ?? ''
  draftYearPreset.value = appliedYearPreset.value
  yearError.value = ''
  desktopFilterVisible.value = true
}
function closeDesktopFilter() { desktopFilterVisible.value = false }
function applyPreset(p) {
  if (draftPriceMin.value === p.min && (p.max === Infinity ? draftPriceMax.value === '' : draftPriceMax.value === p.max)) {
    draftPriceMin.value = ''
    draftPriceMax.value = ''
  } else {
    draftPriceMin.value = p.min
    draftPriceMax.value = p.max === Infinity ? '' : p.max
  }
}
function resetDraft() {
  draftPriceMin.value = ''; draftPriceMax.value = ''
  draftYearStart.value = ''; draftYearEnd.value = ''; draftYearPreset.value = null
  yearError.value = ''
}
function applyDesktopFilter() {
  if (!validateYearDraft()) return
  appliedPriceMin.value = draftPriceMin.value
  appliedPriceMax.value = draftPriceMax.value
  appliedYearStart.value = draftYearStart.value || null
  appliedYearEnd.value = draftYearEnd.value || null
  appliedYearPreset.value = draftYearPreset.value
  desktopFilterVisible.value = false
  scrollToTop()
}

function openMobileFilter() {
  draftPriceMin.value = appliedPriceMin.value
  draftPriceMax.value = appliedPriceMax.value
  draftYearStart.value = appliedYearStart.value ?? ''
  draftYearEnd.value = appliedYearEnd.value ?? ''
  draftYearPreset.value = appliedYearPreset.value
  yearError.value = ''
  mobileFilterVisible.value = true
}
function applyMobileFilter() {
  if (!validateYearDraft()) return
  appliedPriceMin.value = draftPriceMin.value
  appliedPriceMax.value = draftPriceMax.value
  appliedYearStart.value = draftYearStart.value || null
  appliedYearEnd.value = draftYearEnd.value || null
  appliedYearPreset.value = draftYearPreset.value
  mobileFilterVisible.value = false
  scrollToTop()
}

let sheetStartY = 0, sheetMoveY = 0
function onSheetTouchStart(e) { sheetStartY = e.touches[0].clientY }
function onSheetTouchMove(e) { sheetMoveY = e.touches[0].clientY - sheetStartY; if (sheetMoveY > 0) e.currentTarget.style.transform = `translateY(${sheetMoveY}px)` }
function onSheetTouchEnd(e) { if (sheetMoveY > 120) mobileFilterVisible.value = false; else e.currentTarget.style.transform = ''; sheetMoveY = 0 }

function openSpecs(gpu) {
  selectedDetailGpu.value = gpu
  specsModal.value?.show(gpu, displayRes.value)
}

function addToCompareCore(gpu) {
  const index = compareList.value.findIndex(g => g.id === gpu.id)
  if (index !== -1) {
    compareList.value.splice(index, 1)
  } else {
    if (compareList.value.length >= 3) return
    compareList.value.push(gpu)
    if (compareList.value.length === 3) {
      showFullTip.value = true
      setTimeout(() => { showFullTip.value = false }, 2000)
    }
  }
}
function removeFromCompare(gpu) { compareList.value = compareList.value.filter(g => g.id !== gpu.id) }
function clearCompare() { compareList.value = [] }
function setAsBenchmark(gpu) {
  if (benchmarkGpu.value?.id === gpu.id) {
    benchmarkGpu.value = defaultBenchmarkGpu.value
  } else {
    benchmarkGpu.value = gpu
  }
}
function resetBenchmark() { benchmarkGpu.value = defaultBenchmarkGpu.value }
function isInCompare(gpu) { return compareList.value.some(g => g.id === gpu.id) }
function openCompareModal() {
  if (compareList.value.length === 0) {
    showEmptyCompareTip.value = true
    return
  }
  compareModalRef.value?.show(displayRes.value)
}

function getChipBrandClass(gpu) {
  const u = (gpu?.model || '').toUpperCase()
  if (u.includes('NVIDIA') || u.includes('RTX') || u.includes('GTX')) return 'nvidia'
  if (u.includes('AMD') || u.includes('RX')) return 'amd'
  if (u.includes('INTEL') || u.includes('ARC')) return 'intel'
  return ''
}
function openPriceChart(gpu) { chartModal.value?.show(gpu.model) }

let tipStartY = 0, tipMovedY = 0
function onTipTouchStart(e) { tipStartY = e.touches[0].clientY }
function onTipTouchMove(e) {
  tipMovedY = e.touches[0].clientY - tipStartY
  if (tipMovedY > 0) e.currentTarget.style.transform = `translateY(${tipMovedY}px)`
}
function onTipTouchEnd(e) {
  if (tipMovedY > 120) showEmptyCompareTip.value = false
  else if (e && e.currentTarget) e.currentTarget.style.transform = ''
  tipMovedY = 0
}
function onDealCardClick() { if (window.__showDealModal) window.__showDealModal() }

function checkMobile() { isMobile.value = window.innerWidth < 768 }
let lastScrollY = 0
function onPageScroll() {
  const currentY = window.scrollY
  if (currentY > window.innerHeight) {
    fabCollapsed.value = currentY > lastScrollY
  } else {
    fabCollapsed.value = false
  }
  lastScrollY = currentY
}

function onPopState() {
  if (desktopFilterVisible.value) closeDesktopFilter()
  if (mobileFilterVisible.value) { mobileFilterVisible.value = false; history.forward() }
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', onPageScroll, { passive: true })
  window.addEventListener('popstate', onPopState)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', onPageScroll)
  window.removeEventListener('popstate', onPopState)
  clearTimeout(tipTimer)
})
</script>

<style scoped>
/* ═══════════ 顶部双轮播 ═══════════ */
.top-bar-dual { display: flex; gap: 1rem; margin-bottom: 1rem; }
.top-bar-dual > * { flex: 1; min-width: 0; }

/* ═══════════ 移动端切换栏 ═══════════ */
.mobile-switch-bar { display: none; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; }
.mobile-switch-group { display: flex; gap: 0.25rem; }
.mobile-switch-group button {
  padding: 0.3rem 0.6rem; font-size: 0.75rem; font-weight: 500;
  background: var(--highlight-bg); border: 1px solid var(--table-border-gold);
  border-radius: 6px; color: var(--accent); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.mobile-switch-group button.active { background: var(--value-gold-bg); color: var(--value-gold-text); font-weight: 600; border-color: var(--table-border-gold); }

/* ═══════════ 桌面端搜索栏 ═══════════ */
.action-toolbar { display: flex; justify-content: flex-end; margin-bottom: 0.5rem; }
.action-btns { display: flex; align-items: center; width: 100%; }
.search-bar { flex: 1; max-width: 300px; }
.search-bar input {
  width: 100%; padding: 0.3rem 0.5rem; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--text-primary); font-size: 0.85rem;
}

/* ═══════════ 表格 + 悬浮按钮包装 ═══════════ */
.table-with-fab {
  position: relative;
}

/* ═══════════ 表头堆叠布局 ═══════════ */
.th-stack { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.th-controls { display: flex; align-items: center; justify-content: center; gap: 0.4rem; flex-wrap: wrap; }

/* ═══════════ 表头切换按钮 ═══════════ */
.inline-toggle { display: inline-flex; align-items: center; gap: 0.15rem; }
.inline-toggle button {
  padding: 0.12rem 0.45rem; font-size: 0.7rem;
  background: var(--highlight-bg); border: 1px solid var(--highlight-border);
  border-radius: 4px; color: var(--accent); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.inline-toggle button:hover { background: var(--value-gold-bg); border-color: var(--highlight-border); }
.inline-toggle button.active { background: var(--value-gold-bg); color: var(--value-gold-text); font-weight: 600; border-color: var(--table-border-gold); }
.toggle-sep { color: var(--text-secondary); font-size: 0.65rem; }

/* ═══════════ 表格容器 ═══════════ */
.table-wrapper {
  max-height: 75vh; overflow: auto; background: var(--bg-secondary);
  border: 1px solid var(--table-border-gold); outline: 1.5px solid var(--table-outline-blue);
  outline-offset: 2px; border-radius: 12px; box-shadow: var(--shadow-card);
}
.table-wrapper::-webkit-scrollbar { width: 6px; height: 6px; }
.table-wrapper::-webkit-scrollbar-track { background: transparent; }
.table-wrapper::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }

/* ═══════════ 桌面端悬浮按钮组 ═══════════ */
.desktop-fab-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: absolute;
  right: -76px;
  top: 75%;
  z-index: 30;
}
.desktop-fab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  background: var(--bg-secondary);
  border: 1px solid var(--table-border-gold);
  border-radius: 8px;
  color: var(--accent);
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: var(--shadow-card);
  white-space: nowrap;
  position: relative;
}
.desktop-fab-btn:hover {
  background: var(--value-gold-bg);
  border-color: var(--table-border-gold);
}
.desktop-fab-btn:active { transform: scale(0.95); }
.desktop-fab-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--accent);
  color: #000;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* ═══════════ 表格 ═══════════ */
.cpu-table { width: 100%; border-collapse: collapse; table-layout: auto; }
.cpu-table thead { position: sticky; top: 0; z-index: 20; }
.cpu-table th {
  padding: 0.5rem 0.4rem; font-weight: 600; color: var(--thead-text);
  font-size: 0.82rem; white-space: nowrap; text-align: center;
  background: var(--bg-tertiary); border-bottom: 1px solid var(--border);
}
.cpu-table td {
  padding: 0.65rem 0.4rem; font-size: 0.88rem; color: var(--text-primary);
  border-bottom: 1px solid var(--table-divider);
}
.cpu-row { cursor: pointer; transition: background 0.15s; }
.cpu-row:hover { background: var(--highlight-bg); }
.cpu-row:active { background: var(--value-gold-bg); }

/* 桌面列宽 */
.rank-col { width: 50px; }
.model-col { width: 28%; text-align: left; }
.game-col { width: 15%; }
.perf-col { width: 12%; }
.price-col { width: 22%; }
.value-col { width: 23%; }

/* 表格单元格 */
.rank { text-align: center; color: var(--text-secondary); }
.rank-count { font-size: 0.65rem; display: block; color: var(--thead-text); }
.model-name { font-weight: 500; }
.brand-nvidia { color: var(--brand-nvidia); }
.brand-amd { color: var(--brand-amd); }
.brand-intel { color: var(--brand-intel); }
.game-perf, .perf { text-align: center; font-family: 'JetBrains Mono', monospace; }
.price-num-cell { text-align: right; cursor: pointer; }
.price-change-cell { text-align: left; cursor: pointer; padding-left: 0.2rem; }
.price-value { font-size: 0.88rem; font-weight: 500; }
.no-price { color: var(--text-secondary); }
.price-up { color: var(--price-up); }
.price-down { color: var(--price-down); }
.price-flat { color: var(--text-secondary); }
.fire-icon { font-size: 0.8rem; margin-left: 0.15rem; }
.value-cell { text-align: center; }
.value-bar {
  display: inline-block; padding: 2px 10px; border-radius: 12px;
  font-size: 0.82rem; font-weight: 600; min-width: 46px;
}
.val-legendary { background: var(--value-gold-bg); color: var(--value-gold-text); }
.val-normal { background: var(--value-cyan-bg); color: var(--value-cyan-text); }
.val-bad { background: var(--value-red-bg); color: var(--value-red-text); }
.crown-icon { font-size: 0.85rem; margin-left: 0.2rem; }
.sort-icon {
  display: inline-block; padding: 2px 6px; border-radius: 4px;
  background: var(--value-gold-bg); color: var(--accent); font-size: 0.65rem;
  cursor: pointer; margin-left: 0.2rem;
}

/* ═══════════ 对号小标 ═══════════ */
.compare-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  color: #000;
  font-size: 0.65rem;
  font-weight: 700;
  margin-right: 0.3rem;
  flex-shrink: 0;
}

/* ═══════════ 魂味提示 ═══════════ */
.all-mode-tip {
  text-align: center; font-size: 0.8rem; color: var(--accent);
  padding: 0.5rem; background: var(--highlight-bg);
}
.tip-fade-enter-active, .tip-fade-leave-active { transition: opacity 0.3s ease; }
.tip-fade-enter-from, .tip-fade-leave-to { opacity: 0; }

.empty { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.9rem; }

/* ═══════════ 弹窗过渡动画 ═══════════ */
.modal-enter-active { transition: opacity 0.25s ease; }
.modal-enter-active .desktop-filter-panel, .modal-enter-active .mobile-filter-sheet { transition: transform 0.3s ease; }
.modal-leave-active { transition: opacity 0.25s ease; }
.modal-leave-active .desktop-filter-panel, .modal-leave-active .mobile-filter-sheet { transition: transform 0.3s ease; }
.modal-enter-from { opacity: 0; }
.modal-enter-from .desktop-filter-panel, .modal-enter-from .mobile-filter-sheet { transform: translateY(100%); }
.modal-leave-to { opacity: 0; }
.modal-leave-to .desktop-filter-panel, .modal-leave-to .mobile-filter-sheet { transform: translateY(100%); }

/* ═══════════ 桌面筛选浮层 ═══════════ */
.desktop-filter-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.desktop-filter-panel { background: var(--bg-secondary); border-radius: 16px; width: 90%; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: var(--shadow-modal); border: 1px solid var(--border); }
.filter-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem; border-bottom: 1px solid var(--border); font-weight: 600; color: var(--accent); }
.close-btn { background: none; border: none; color: var(--text-secondary); font-size: 1.2rem; cursor: pointer; min-width: 44px; min-height: 44px; }
.close-btn:active { transform: scale(0.85); }
.filter-panel-body { padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; flex: 1; }
.filter-section { display: flex; flex-direction: column; gap: 0.4rem; }
.section-label { font-size: 0.8rem; color: var(--text-secondary); }
.price-inputs { display: flex; align-items: center; gap: 0.4rem; }
.price-input { flex: 1; padding: 0.25rem 0.4rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px; color: var(--text-primary); font-size: 0.8rem; text-align: center; }
.price-sep { color: var(--text-secondary); }
.preset-btns, .option-btns { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.preset-btn { padding: 0.2rem 0.6rem; font-size: 0.75rem; background: var(--highlight-bg); border: 1px solid var(--border); border-radius: 20px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.preset-btn:hover { border-color: var(--highlight-border); color: var(--accent); }
.preset-btn:active { transform: scale(0.95); }
.preset-btn.active { background: var(--value-gold-bg); border-color: var(--accent); color: var(--value-gold-text); font-weight: 600; }
.warning { font-size: 0.72rem; color: var(--accent); background: var(--value-gold-bg); border: 1px solid var(--highlight-border); border-radius: 6px; padding: 0.3rem 0.5rem; }
.filter-panel-actions { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid var(--border); }
.filter-panel-actions button { flex: 1; padding: 0.5rem; border-radius: 10px; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; }
.reset-btn { background: var(--highlight-bg); border: 1px solid var(--border); color: var(--text-secondary); }
.cancel-btn { background: var(--highlight-bg); border: 1px solid var(--border); color: var(--text-primary); }
.confirm-btn { background: var(--accent); color: var(--btn-gold-text); font-weight: 600; border: none; }
.confirm-btn:active { transform: scale(0.95); }

/* 移动端筛选浮层动画 */
.mobile-filter-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
  opacity: 0; visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}
.mobile-filter-overlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.mobile-filter-sheet {
  background: var(--bg-secondary); border-radius: 20px 20px 0 0;
  width: 100%; max-height: 80vh; display: flex; flex-direction: column;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}
.mobile-filter-overlay.show .mobile-filter-sheet { transform: translateY(0); }
.sheet-handle {
  width: 36px; height: 4px;
  background: var(--modal-handle);
  border-radius: 2px; margin: 0 auto 0.75rem;
}
.sheet-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.sheet-actions {
  display: flex; gap: 0.5rem; padding-top: 0.75rem;
  border-top: 1px solid var(--border); flex-shrink: 0;
}
.sheet-actions button {
  flex: 1; padding: 0.6rem; border-radius: 10px; font-size: 0.85rem;
  cursor: pointer; background: var(--highlight-bg);
  border: 1px solid var(--border); color: var(--text-primary);
  transition: all 0.15s;
}
.sheet-actions button:active { transform: scale(0.95); }
.sheet-actions .confirm-btn { background: var(--accent); color: var(--btn-gold-text); font-weight: 600; border: none; }

/* 移动端悬浮按钮 */
.mobile-fab-group {
  position: fixed; right: 1rem; bottom: 3rem; z-index: 500;
  display: flex; flex-direction: column; gap: 12px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.mobile-fab-group.collapsed { transform: translateX(60%); opacity: 0.5; }
.fab-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--bg-secondary); border: 1.5px solid var(--highlight-border);
  color: var(--accent); box-shadow: var(--shadow-card);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  position: relative;
}
.fab-btn:active { transform: scale(0.95); }
.fab-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 18px; height: 18px; border-radius: 9px;
  background: var(--accent); color: #000;
  font-size: 0.65rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px;
}

/* 年份输入 */
.year-inputs { display: flex; gap: 0.4rem; }
.year-input { width: 80px; padding: 0.25rem 0.4rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 5px; color: var(--text-primary); font-size: 0.8rem; text-align: center; }
.year-input.error { border-color: var(--price-up); }

/* 性价比下拉 */
.value-select { padding: 0.15rem 0.3rem; font-size: 0.68rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary); cursor: pointer; }

/* 分辨率切换按钮 */
.res-toggle { display: inline-flex; gap: 0.1rem; }
.res-btn { padding: 0.12rem 0.35rem; font-size: 0.68rem; background: var(--value-gold-bg); border: 1px solid var(--value-gold-bg); border-radius: 4px; color: var(--accent); cursor: pointer; transition: all 0.15s; }
.res-btn:hover { background: rgba(255,215,0,0.18); }
.res-btn.active { background: var(--accent); color: var(--btn-gold-text); font-weight: 600; border-color: var(--accent); }

/* ═══════════ 响应式 ═══════════ */
@media (max-width: 768px) {
  .top-bar-dual { flex-direction: column; }
  .mobile-switch-bar { display: none; }
  .desktop-fab-group { display: none; }
  .action-toolbar { display: none; }
  .game-col, .perf-col { display: none; }
  .cpu-table td:nth-child(3), .cpu-table td:nth-child(4), .cpu-table th:nth-child(3), .cpu-table th:nth-child(4) { display: none; }
  .rank-col { width: 12% !important; }
  .model-col { width: 42% !important; }
  .price-col { width: 26% !important; }
  .value-col { width: 20% !important; }
  .cpu-table td.rank, .cpu-table th.rank-col { padding: 0.3rem 0.1rem; font-size: 0.75rem; }
  .rank-count { display: block; font-size: 0.5rem; color: var(--thead-text); line-height: 1; margin-bottom: 1px; }
  .cpu-table th { white-space: normal; word-break: break-word; font-size: 0.72rem; }
  .cpu-table td { font-size: 0.82rem; padding: 0.5rem 0.3rem; }
  .table-wrapper { overflow-x: hidden; }
  .cpu-table { table-layout: fixed; width: 100%; }
  .value-col .th-stack > span { white-space: nowrap; }
}

.desktop-only { display: table-cell; }
.mobile-only { display: none; }
@media (max-width: 768px) {
  .desktop-only { display: none; }
  .mobile-only { display: inline; }
}

/* 空状态弹窗全局样式 */
.modal-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 3000;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}
.modal-overlay.show {
  opacity: 1; visibility: visible; pointer-events: auto;
}
.modal-panel {
  background: var(--modal-bg);
  border-radius: 20px 20px 0 0;
  width: 100%; max-height: 85vh; display: flex; flex-direction: column;
  box-shadow: var(--shadow-modal);
  transform: translateY(100%);
  transition: transform 0.3s ease;
}
.modal-overlay.show .modal-panel { transform: translateY(0); }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 1rem; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--modal-deal-header-bg);
  border-radius: 20px 20px 0 0;
}
.modal-header h3 { color: var(--accent); margin: 0; font-size: 1rem; }
.modal-handle {
  width: 36px; height: 4px;
  background: var(--modal-handle);
  border-radius: 2px; margin: 8px auto 0;
}
.nav-modal-close {
  background: none; border: none; color: var(--text-secondary);
  font-size: 1.4rem; cursor: pointer;
  min-width: 44px; min-height: 44px;
  display: flex; align-items: center; justify-content: center;
}
.nav-modal-close:active { transform: scale(0.85); color: var(--text-primary); }
.modal-body { padding: 1.5rem; text-align: center; }
.modal-text { color: var(--text-secondary); margin-bottom: 1.5rem; }
.nav-modal-btn.primary {
  background: var(--accent);
  color: var(--btn-gold-text);
  font-weight: 600; border: none;
  padding: 0.65rem 1.5rem; border-radius: 10px;
  cursor: pointer; font-size: 0.85rem; width: 100%;
}
.nav-modal-btn.primary:active { transform: scale(0.95); }
@media (min-width: 769px) {
  .modal-overlay { align-items: center; }
  .modal-panel { max-width: 480px; border-radius: 16px; }
}
</style>