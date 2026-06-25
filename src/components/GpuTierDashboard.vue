<template>
  <div class="tier-page">
    <!-- 全屏遮罩（搜索选中时覆盖整个页面） -->
    <div v-if="selectedSearchCpu" class="global-selection-overlay" @click="clearSearchSelection"></div>

    <!-- 双轮播：独占一行 -->
    <div class="top-bar-dual">
      <CarouselBanner type="deal" :items="dealItems" @card-click="onDealCardClick" />
      <CarouselBanner type="video" :items="videoItems" />
    </div>

    <!-- Tab 切换：下面一行 -->
    <div class="top-bar">
      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'game' }" @click="switchTab('game')">🎮 游戏性能</button>
        <button class="tab-btn" :class="{ active: activeTab === 'render' }" @click="switchTab('render')">✏️ 创作效率</button>
        <button class="tab-btn" :class="{ active: activeTab === 'ai' }" @click="switchTab('ai')">🤖 AI性能</button>
        <button class="tab-btn" :class="{ active: activeTab === 'scores' }" @click="switchTab('scores')">📊 跑分功耗</button>
      </div>
    </div>

    <!-- 基准提示 -->
    <div class="benchmark-hint">
      <template v-if="benchmarkGpu">
        📌 基准：{{ shortGpu(benchmarkGpu.model) }} (100%) · 共 {{ gpus.length }} 款显卡
      </template>
      <template v-else>⚠️ 未找到基准显卡 · 共 {{ gpus.length }} 款显卡</template>
    </div>

    <!-- 桌面端：搜索·对比整合悬浮按钮 -->
    <div class="desktop-search-fab desktop-only">
      <button class="desktop-fab-btn compare-fab-btn" @click.stop="openMobileSearchPanel">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 3h13M4 8h8M6.5 13h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>搜索·对比</span>
        <span v-if="compareList.length" class="desktop-fab-badge">{{ compareList.length }}</span>
      </button>
    </div>

    <!-- 游戏/创作/AI 天梯图内容 -->
    <template v-if="activeTab !== 'scores'">
      <div class="mini-table-box tier-card">
        <!-- 分辨率切换（仅游戏Tab显示） -->
        <div v-if="activeTab === 'game'" class="res-switch-bar">
          <button :class="{ active: displayRes === '1080P' }" @click="displayRes = '1080P'">1080P</button>
          <button :class="{ active: displayRes === '2K' }" @click="displayRes = '2K'">2K</button>
          <button :class="{ active: displayRes === '4K' }" @click="displayRes = '4K'">4K</button>
        </div>

        <!-- 桌面端散点图 -->
        <div class="scatter-container" ref="scatterContainer" v-if="!isMobile">
          <div class="brand-headers">
            <div class="brand-header nvidia-header">NVIDIA</div>
            <div class="brand-header amd-header">AMD</div>
            <div class="brand-header intel-header">INTEL</div>
          </div>
          <div class="scatter-plot" ref="scatterPlot">
            <!-- Tooltip 悬浮提示 -->
            <div v-show="tooltip.visible" class="tier-tooltip" :style="tooltip.style">
              <div class="tooltip-name">{{ tooltip.title }}</div>
              <div class="tooltip-pct">性能 {{ tooltip.percent }}%<span v-if="tooltip.estimated"> (推算)</span></div>
            </div>

            <div class="column-dividers">
              <div v-for="i in 9" :key="i" class="col-divider" :style="getColDividerStyle(i)"></div>
            </div>
            <div class="brand-divider" :style="brandDividerStyle"></div>
            <div
              v-for="item in positionedGpus"
              :key="item.key"
              class="gpu-dot"
              :data-gpu-id="item.gpu.id"
              :class="{
                'is-searched': item.isSearched,
                'is-dimmed': selectedSearchCpu && !item.isSearched,
                nvidia: item.brand === 'NVIDIA',
                amd: item.brand === 'AMD',
                intel: item.brand === 'INTEL'
              }"
              :style="{ left: item.x + '%', top: item.y + '%' }"
              @click="showDetail(item)"
              @mouseenter="showTooltip(item, $event)"
              @mouseleave="hideTooltip"
            >
              <span class="dot-label">{{ item.displayLabel }}</span>
            </div>
            <div v-if="benchmarkY !== null" class="benchmark-line" :style="{ top: benchmarkY + '%' }">
              <span class="benchmark-line-label">基准 100%</span>
            </div>
          </div>
          <div class="x-axis">
            <span v-for="col in columnLabels" :key="col.key" class="x-label" :style="{ left: col.x + '%' }">{{ col.text }}</span>
          </div>
        </div>

        <!-- 移动端双列天梯 -->
        <div class="tier-mobile" v-else>
          <div class="tier-2col" ref="tierMobileList">
            <!-- 品牌表头 -->
            <div class="tier-row tier-header-row">
              <div class="tier-col"><div class="tier-brand nvidia">NVIDIA</div></div>
              <div class="tier-col"><div class="tier-brand amd">AMD</div></div>
            </div>
            <!-- 数据行 -->
            <template v-for="row in tierRows" :key="row.score">
              <div class="tier-row">
                <div class="tier-col">
                  <div v-if="row.left" class="tier-item-group">
                    <div v-for="(item, idx) in row.left" :key="'l-' + item.gpu.id"
                         class="tier-item" :data-gpu-id="item.gpu.id"
                         :class="{ 'is-searched': selectedSearchCpu && item.gpu.id === selectedSearchCpu?.id }"
                         @click="openDetailModal(item.gpu)">
                      <span class="tier-pct" v-if="idx === 0">{{ getCurrentPercent(item.gpu) }}%</span>
                      <span v-else class="tier-pct" style="visibility: hidden">{{ getCurrentPercent(item.gpu) }}%</span>
                      <span class="tier-model nvidia">{{ item.displayLabel }}</span>
                    </div>
                  </div>
                  <div v-else class="tier-empty-cell"></div>
                </div>
                <div class="tier-col">
                  <div v-if="row.right" class="tier-item-group">
                    <div v-for="(item, idx) in row.right" :key="'r-' + item.gpu.id"
                         class="tier-item" :data-gpu-id="item.gpu.id"
                         :class="{ 'is-searched': selectedSearchCpu && item.gpu.id === selectedSearchCpu?.id }"
                         @click="openDetailModal(item.gpu)">
                      <span class="tier-model amd">{{ item.displayLabel }}</span>
                      <span class="tier-pct" v-if="idx === 0">{{ getCurrentPercent(item.gpu) }}%</span>
                      <span v-else class="tier-pct" style="visibility: hidden">{{ getCurrentPercent(item.gpu) }}%</span>
                    </div>
                  </div>
                  <div v-else class="tier-empty-cell"></div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 图例 -->
        <div class="legend-section">
          <div class="unique-title-row">
            <span class="unique-icon">{{ activeTab === 'game' ? '🏆' : activeTab === 'render' ? '✏️' : '🤖' }}</span>
            <strong>{{ activeTab === 'game' ? '显卡游戏性能天梯图' : activeTab === 'render' ? '显卡创作效率天梯图' : '显卡AI性能天梯图' }}</strong>
          </div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="dot-legend bench"></span>
              <div><strong>基准说明</strong><p>我觉得 100% 以上就够用了（2K基准默认为 RTX 4060）。当然，你随时可以手动更改基准。点击型号看详情、加对比。</p></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 跑分功耗 Tab -->
    <template v-if="activeTab === 'scores'">
      <div class="score-tab">
        <div class="score-dimension-switch">
          <button v-for="dim in scoreDimensions" :key="dim.key"
            :class="{ active: currentScoreDim === dim.key }"
            class="dim-btn" @click="currentScoreDim = dim.key">{{ dim.label }}</button>
        </div>

        <!-- 桌面端跑分表格 -->
        <div class="table-wrapper" v-if="!isMobile">
          <table class="cpu-table score-table">
            <colgroup>
              <col span="2" class="col-group-params">
              <col span="3" class="col-group-params">
              <col class="col-spacer">
              <col span="2" class="col-group-scores">
              <col class="col-spacer">
              <col span="1" class="col-group-power">
              <col span="1" class="col-group-other">
            </colgroup>
            <thead>
              <tr>
                <th class="rank-col">排名</th>
                <th class="model-col">型号</th>
                <th class="spec-col">流处理器</th>
                <th class="spec-col">加速频率</th>
                <th class="spec-col">显存</th>
                <th class="spacer-cell"></th>
                <template v-if="currentScoreDim === 'game'">
                  <th class="sortable" @click="sortScore('timespy')">Time Spy <span class="sort-icon">{{ getScoreSortIcon('timespy') }}</span></th>
                  <th class="sortable" @click="sortScore('steel_nomad')">Steel Nomad <span class="sort-icon">{{ getScoreSortIcon('steel_nomad') }}</span></th>
                </template>
                <template v-else>
                  <th class="sortable" @click="sortScore('render_performance')">Blender <span class="sort-icon">{{ getScoreSortIcon('render_performance') }}</span></th>
                  <th class="sortable" @click="sortScore('ai_performance')">AI算力(TOPS) <span class="sort-icon">{{ getScoreSortIcon('ai_performance') }}</span></th>
                </template>
                <th class="spacer-cell"></th>
                <th class="spec-col">官方功耗</th>
                <th class="spec-col">发售日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(gpu, index) in sortedScoreGpus" :key="gpu.id" class="cpu-row"
                :data-gpu-id="gpu.id"
                :class="{ 'is-searched': selectedSearchCpu && gpu.id === selectedSearchCpu.id }"
                @click="openDetailModal(gpu)">
                <td class="rank">{{ index + 1 }}</td>
                <td class="model"><span class="model-name" :class="getBrandClass(gpu.model)">{{ gpu.model }}</span></td>
                <td class="spec-cell">{{ gpu.shader_units || '-' }}</td>
                <td class="spec-cell">{{ gpu.game_freq ? gpu.game_freq + ' MHz' : '-' }}</td>
                <td class="spec-cell">{{ gpu.vram || '-' }}</td>
                <td class="spacer-cell"></td>
                <template v-if="currentScoreDim === 'game'">
                  <td class="value-cell">{{ getScoreField(gpu, 'timespy') ?? '-' }}</td>
                  <td class="value-cell">{{ getScoreField(gpu, 'steel_nomad') ?? '-' }}</td>
                </template>
                <template v-else>
                  <td class="value-cell">{{ getScoreField(gpu, 'render_performance') ?? '-' }}</td>
                  <td class="value-cell">{{ getScoreField(gpu, 'ai_performance') ?? '-' }}</td>
                </template>
                <td class="spacer-cell"></td>
                <td class="spec-cell">{{ gpu.tdp ? gpu.tdp + 'W' : '-' }}</td>
                <td class="spec-cell">{{ gpu.release_date || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 移动端跑分表格 -->
        <div class="table-wrapper" v-else>
          <table class="cpu-table score-table">
            <thead>
              <tr>
                <th class="rank-col">排名</th>
                <th class="model-col">型号</th>
                <template v-if="currentScoreDim === 'game'">
                  <th class="sortable" @click="sortScore('timespy')">Time Spy <span class="sort-icon">{{ getScoreSortIcon('timespy') }}</span></th>
                  <th class="sortable" @click="sortScore('steel_nomad')">Steel Nomad <span class="sort-icon">{{ getScoreSortIcon('steel_nomad') }}</span></th>
                </template>
                <template v-else>
                  <th class="sortable" @click="sortScore('render_performance')">Blender <span class="sort-icon">{{ getScoreSortIcon('render_performance') }}</span></th>
                  <th class="sortable" @click="sortScore('ai_performance')">AI算力 <span class="sort-icon">{{ getScoreSortIcon('ai_performance') }}</span></th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(gpu, index) in sortedScoreGpus" :key="gpu.id" class="cpu-row"
                :data-gpu-id="gpu.id"
                :class="{ 'is-searched': selectedSearchCpu && gpu.id === selectedSearchCpu.id }"
                @click="openDetailModal(gpu)">
                <td class="rank">{{ index + 1 }}</td>
                <td class="model"><span class="model-name" :class="getBrandClass(gpu.model)">{{ shortGpu(gpu.model) }}</span></td>
                <template v-if="currentScoreDim === 'game'">
                  <td class="value-cell">{{ getScoreField(gpu, 'timespy') ?? '-' }}</td>
                  <td class="value-cell">{{ getScoreField(gpu, 'steel_nomad') ?? '-' }}</td>
                </template>
                <template v-else>
                  <td class="value-cell">{{ getScoreField(gpu, 'render_performance') ?? '-' }}</td>
                  <td class="value-cell">{{ getScoreField(gpu, 'ai_performance') ?? '-' }}</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 详情弹窗 -->
    <GpuTierDetailModal
      ref="detailModalRef"
      :benchmark-gpu="benchmarkGpu"
      :is-in-compare="selectedDetailGpu ? isInCompare(selectedDetailGpu) : false"
      :is-benchmark="selectedDetailGpu && selectedDetailGpu.id === benchmarkGpu?.id"
      @set-benchmark="setAsBenchmark"
      @add-compare="addToCompareCore"
      @reset-benchmark="resetBenchmark"
      @remove-compare="removeFromCompare"
    />

    <!-- 对比弹窗 -->
    <GpuTierCompareModal
      ref="compareModalRef"
      :gpus="compareList"
      :benchmark-gpu="benchmarkGpu"
      @set-benchmark="setAsBenchmark"
      @remove-compare="removeFromCompare"
    />

    <!-- 移动端悬浮按钮组 -->
    <div v-if="isMobile" class="mobile-fab-group" :class="{ collapsed: fabCollapsed }">
      <button class="fab-btn search-fab" @click="openMobileSearchPanel">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span v-if="compareList.length" class="fab-badge">{{ compareList.length }}</span>
      </button>
      <button class="fab-btn top-fab" @click="scrollToTop">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>

    <!-- 移动端搜索对比面板 -->
    <Teleport to="body">
      <div v-if="mobileSearchVisible" class="mobile-search-overlay" @click.self="closeMobileSearchPanel">
        <div class="mobile-search-sheet" @touchstart="onSheetTouchStart" @touchmove="onSheetTouchMove" @touchend="onSheetTouchEnd">
          <div class="sheet-handle"></div>
          <div class="search-input-row">
            <input v-model="mobileSearchQuery" type="text" placeholder="🔍 搜索型号" class="mobile-search-input" @input="onMobileSearchInput" />
          </div>
          <div v-if="mobileSearchQuery" class="mobile-search-results">
            <div v-for="item in mobileSearchResults" :key="item.gpu.id" class="mobile-search-item" @click="jumpToGpu(item.gpu)">
              <span class="brand-dot" :class="getBrandClass(item.gpu.model)"></span>
              <span class="result-name">{{ item.label }}</span>
              <div class="result-actions">
                <button class="mini-btn compare-btn" @click.stop.prevent="addToCompareCore(item.gpu)" :disabled="compareList.length >= 3 && !isInCompare(item.gpu)">{{ isInCompare(item.gpu) ? '已加入' : '+对比' }}</button>
                <button class="mini-btn bench-btn" @click.stop="setAsBenchmark(item.gpu)">{{ item.gpu.id === benchmarkGpu?.id ? '已设基准' : '基准' }}</button>
              </div>
            </div>
          </div>
          <div class="compare-section" v-if="compareList.length > 0">
            <div class="compare-section-title">对比栏 ({{ compareList.length }}/3)</div>
            <div class="compare-chips">
              <span v-for="gpu in compareList" :key="gpu.id" class="compare-chip">
                <span class="chip-dot" :class="getBrandClass(gpu.model)"></span>
                <span class="chip-label">{{ shortGpu(gpu.model) }}</span>
                <button class="chip-remove-btn" @click="removeFromCompare(gpu)">×</button>
              </span>
            </div>
            <div class="compare-actions">
              <button class="action-btn clear-btn" @click="clearCompare">清空</button>
              <button class="action-btn open-btn" @click="openCompareModalFromMobile">打开对比弹窗</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import CarouselBanner from './CarouselBanner.vue'
import GpuTierDetailModal from './GpuTierDetailModal.vue'
import GpuTierCompareModal from './GpuTierCompareModal.vue'

const props = defineProps({
  initialGpus: { type: String, required: true },
  initialBenchmark: { type: String, required: true },
  initialDefaultBenchmarks: { type: String, default: '{}' },
  initialDealItems: { type: String, default: '[]' },
  initialVideoItems: { type: String, default: '[]' }
})

const gpus = ref(JSON.parse(props.initialGpus || '[]'))
const dealItems = ref(JSON.parse(props.initialDealItems || '[]'))
const videoItems = ref(JSON.parse(props.initialVideoItems || '[]'))

const activeTab = ref('game')
const displayRes = ref('2K')

const defaultBenchmarks = ref(JSON.parse(props.initialDefaultBenchmarks || '{}'))
const benchmarkGpu = ref(null)
const defaultBenchmarkForRes = computed(() => defaultBenchmarks.value[displayRes.value] || null)
const isBenchmarkManual = ref(false)

benchmarkGpu.value = defaultBenchmarkForRes.value

const compareList = ref([])
const selectedSearchCpu = ref(null)
const searchQuery = ref('')
const showSearchDropdown = ref(false)
const detailModalRef = ref(null)
const compareModalRef = ref(null)
const selectedDetailGpu = ref(null)
const isMobile = ref(false)

const scatterContainer = ref(null)
const scatterPlot = ref(null)
const tooltip = reactive({ visible: false, title: '', percent: 0, estimated: false, style: {} })
const sortScoreKey = ref('timespy')
const sortScoreOrder = ref('desc')
const currentScoreDim = ref('game')

const fabCollapsed = ref(false)
const mobileSearchVisible = ref(false)
const mobileSearchQuery = ref('')
const showFullTip = ref(false)
const tierMobileList = ref(null)

const COLUMNS = [
  { idx: 0, series: 'RTX 10', brand: 'NVIDIA' },
  { idx: 1, series: 'RTX 20/16', brand: 'NVIDIA' },
  { idx: 2, series: 'RTX 30', brand: 'NVIDIA' },
  { idx: 3, series: 'RTX 40', brand: 'NVIDIA' },
  { idx: 4, series: 'RTX 50/GTX9/7', brand: 'NVIDIA' },
  { idx: 5, series: 'RX 9000/VEGA', brand: 'AMD' },
  { idx: 6, series: 'RX 7000/RX5/400', brand: 'AMD' },
  { idx: 7, series: 'RX 6000', brand: 'AMD' },
  { idx: 8, series: 'RX 5000', brand: 'AMD' },
  { idx: 9, series: 'Intel Arc', brand: 'INTEL' }
]

const scoreDimensions = [
  { key: 'game', label: '游戏' },
  { key: 'render', label: '创作' }
]

const shortGpu = (m) => m?.replace(/NVIDIA GeForce |AMD Radeon |INTEL Arc /i, '').replace(/NVIDIA |AMD |INTEL /i, '').replace(/\b(RTX|GTX|RX)\s*/gi, '').trim() || ''
const getBrandClass = (m) => {
  const u = (m || '').toUpperCase()
  if (u.includes('NVIDIA') || u.includes('RTX') || u.includes('GTX')) return 'brand-nvidia'
  if (u.includes('AMD') || u.includes('RX') || u.includes('RADEON')) return 'brand-amd'
  if (u.includes('INTEL') || u.includes('ARC')) return 'brand-intel'
  return ''
}

const getGpuScore = (gpu) => {
  if (activeTab.value === 'game') {
    const field = displayRes.value === '1080P' ? 'abs_game_performance_1080p' :
                  displayRes.value === '2K' ? 'abs_game_performance_2k' :
                  'abs_game_performance_4k'
    return gpu[field]
  } else if (activeTab.value === 'render') {
    return gpu.render_performance
  } else {
    return gpu.ai_performance || 0
  }
}

const getBenchScore = () => {
  if (!benchmarkGpu.value) {
    if (activeTab.value === 'game') {
      return displayRes.value === '1080P' ? 5838.2 :
             displayRes.value === '2K'   ? 6480 :
             displayRes.value === '4K'   ? 5425 : 6480
    }
    if (activeTab.value === 'render') return 3134.5
    if (activeTab.value === 'ai')      return 100
    return 100
  }
  return getGpuScore(benchmarkGpu.value)
}

const getCurrentPercent = (gpu) => {
  if (!benchmarkGpu.value) return 0
  const score = getGpuScore(gpu)
  const base = getBenchScore()
  return base ? Math.round((score / base) * 100) : 0
}

const getScoreField = (gpu, field) => gpu?.[field]

const searchDropdownItems = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.toLowerCase()
  return gpus.value.filter(g => g.model.toLowerCase().includes(q)).slice(0, 8).map(g => ({
    gpu: g,
    label: shortGpu(g.model),
    brandClass: getBrandClass(g.model)
  }))
})

function onSearchInput() { showSearchDropdown.value = true }
function onSearchFocus() { if (searchQuery.value) showSearchDropdown.value = true }
function onSearchBlur() { setTimeout(() => { showSearchDropdown.value = false }, 500) }

function onSearchItemClick(gpu) {
  selectedSearchCpu.value = gpu
  searchQuery.value = shortGpu(gpu.model)
  showSearchDropdown.value = false
  nextTick(() => {
    const target = document.querySelector(`[data-gpu-id="${gpu.id}"]`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  setTimeout(() => clearSearchSelection(), 3000)
}

function clearSearchSelection() { selectedSearchCpu.value = null; searchQuery.value = '' }
function jumpToFirstMatch() {
  if (searchDropdownItems.value.length > 0) onSearchItemClick(searchDropdownItems.value[0].gpu)
}

const mobileSearchResults = computed(() => {
  if (!mobileSearchQuery.value) return []
  const q = mobileSearchQuery.value.toLowerCase()
  return gpus.value.filter(g => g.model.toLowerCase().includes(q)).slice(0, 10).map(g => ({
    gpu: g,
    label: shortGpu(g.model),
    brandClass: getBrandClass(g.model)
  }))
})

function onMobileSearchInput() {}
function jumpToGpu(gpu) {
  closeMobileSearchPanel()
  selectedSearchCpu.value = gpu
  setTimeout(() => {
    const target = document.querySelector(`[data-gpu-id="${gpu.id}"]`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
  setTimeout(() => clearSearchSelection(), 3000)
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
  if (benchmarkGpu.value?.id === gpu.id && isBenchmarkManual.value) {
    benchmarkGpu.value = defaultBenchmarkForRes.value
    isBenchmarkManual.value = false
  } else {
    benchmarkGpu.value = gpu
    isBenchmarkManual.value = true
  }
}
function resetBenchmark() {
  benchmarkGpu.value = defaultBenchmarkForRes.value
  isBenchmarkManual.value = false
}
function switchTab(tab) { activeTab.value = tab }
function openDetailModal(gpu) {
  selectedDetailGpu.value = gpu
  detailModalRef.value?.show(gpu, displayRes.value, compareList.value.length >= 3)
}
function openCompareModal() { 
  if (compareList.value.length > 0) compareModalRef.value?.show(displayRes.value) 
}
function isInCompare(gpu) { return compareList.value.some(g => g.id === gpu.id) }
function openMobileSearchPanel() { mobileSearchVisible.value = true }
function closeMobileSearchPanel() { mobileSearchVisible.value = false; mobileSearchQuery.value = '' }
function openCompareModalFromMobile() { 
  closeMobileSearchPanel(); 
  openCompareModal(); 
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

function getColumn(gpu) {
  const m = gpu.model.toUpperCase()
  if (m.includes('NVIDIA') || m.includes('RTX') || m.includes('GTX')) {
    if (m.includes('RTX 50') || m.includes('GTX 9') || m.includes('GTX 7')) return 4
    if (m.includes('RTX 40')) return 3
    if (m.includes('RTX 30')) return 2
    if (m.includes('RTX 20') || m.includes('GTX 16')) return 1
    return 0
  }
  if (m.includes('AMD') || m.includes('RX') || m.includes('RADEON')) {
    const match = m.match(/RX\s*(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= 9000 || m.includes('VEGA')) return 5
      if (num >= 7000) return 6
      if (num >= 6000) return 7
      if (num >= 5000) return 8
      if (num >= 400) return 6
    }
    return 5
  }
  return 9
}

const scoreRange = computed(() => {
  const scores = gpus.value.map(g => getGpuScore(g)).filter(s => s != null && s > 0)
  if (scores.length === 0) return { min: 1000, max: 10000 }
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const safeMin = min / 1.05
  const safeMax = max * 1.05
  return { min: safeMin, max: safeMax }
})

function scoreToY(score) {
  if (!score || score <= 0) return 90
  const { min, max } = scoreRange.value
  if (max <= min) return 50
  const logMin = Math.log(min), logMax = Math.log(max), logVal = Math.log(Math.max(score, min))
  return Math.max(0, Math.min(100, 5 + (1 - (logVal - logMin) / (logMax - logMin)) * 90))
}
function getY(score) { return scoreToY(score) }

const benchmarkY = computed(() => gpus.value.length ? getY(getBenchScore()) : null)

const positionedGpus = computed(() => {
  if (!gpus.value.length) return []
  const items = []
  const colGpus = new Map()
  for (let i = 0; i < 10; i++) colGpus.set(i, [])
  for (const gpu of gpus.value) {
    const col = getColumn(gpu)
    if (colGpus.has(col)) colGpus.get(col).push(gpu)
  }

  for (const [colIdx, list] of colGpus.entries()) {
    const sorted = [...list]
      .filter(gpu => getGpuScore(gpu) != null && getGpuScore(gpu) > 0)
      .sort((a, b) => getGpuScore(b) - getGpuScore(a))
    const usedYs = []
    for (const gpu of sorted) {
      const score = getGpuScore(gpu)
      let y = getY(score)
      while (usedYs.some(uy => Math.abs(uy - y) < 0.8)) y += 0.8
      y = Math.max(0.5, Math.min(99.5, y))
      usedYs.push(y)
      items.push({
        key: String(gpu.id),
        gpu: gpu,
        displayLabel: shortGpu(gpu.model),
        brand: gpu.model.toUpperCase().includes('NVIDIA') || gpu.model.toUpperCase().includes('RTX') || gpu.model.toUpperCase().includes('GTX') ? 'NVIDIA' :
               gpu.model.toUpperCase().includes('AMD') || gpu.model.toUpperCase().includes('RX') ? 'AMD' : 'INTEL',
        column: colIdx,
        score,
        x: (colIdx + 0.3) * (100 / 10),
        y,
        isSearched: selectedSearchCpu.value ? gpu.id === selectedSearchCpu.value.id : false
      })
    }
  }
  return items
})

const tierRows = computed(() => {
  if (!gpus.value.length) return []

  const allItems = []
  for (const gpu of gpus.value) {
    if (gpu.hide_in_ranking) continue
    const score = getGpuScore(gpu)
    if (score == null || score <= 0) continue
    let vramNum = 0
    if (gpu.vram) {
      const match = String(gpu.vram).match(/(\d+)/)
      if (match) vramNum = parseInt(match[1], 10)
    }
    allItems.push({ gpu, score, vramNum })
  }

  allItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.vramNum - a.vramNum
  })

  const TOLERANCE_PCT = 0.02
  const rows = []
  const used = new Set()
  
  for (let i = 0; i < allItems.length; i++) {
    if (used.has(i)) continue
    
    const anchor = allItems[i]
    used.add(i)
    const anchorScore = anchor.score
    const threshold = anchorScore * (1 - TOLERANCE_PCT)
    
    const leftItems = []
    const rightItems = []
    
    if (anchor.gpu.model.toUpperCase().includes('NVIDIA') || anchor.gpu.model.toUpperCase().includes('RTX') || anchor.gpu.model.toUpperCase().includes('GTX')) {
      leftItems.push(anchor)
    } else {
      rightItems.push(anchor)
    }
    
    for (let j = i + 1; j < allItems.length; j++) {
      if (used.has(j)) continue
      const item = allItems[j]
      if (item.score >= threshold) {
        used.add(j)
        if (item.gpu.model.toUpperCase().includes('NVIDIA') || item.gpu.model.toUpperCase().includes('RTX') || item.gpu.model.toUpperCase().includes('GTX')) {
          leftItems.push(item)
        } else {
          rightItems.push(item)
        }
      } else {
        break
      }
    }
    
    const sortFn = (a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.vramNum - a.vramNum
    }
    leftItems.sort(sortFn)
    rightItems.sort(sortFn)
    
    const toDisplay = (items) => items.map(item => ({
      gpu: item.gpu,
      displayLabel: shortGpu(item.gpu.model),
      score: item.score
    }))
    
    rows.push({
      score: anchorScore,
      left: leftItems.length > 0 ? toDisplay(leftItems) : null,
      right: rightItems.length > 0 ? toDisplay(rightItems) : null
    })
  }
  
  return rows
})

const sortedScoreGpus = computed(() => {
  const list = [...gpus.value]
  const key = sortScoreKey.value
  const order = sortScoreOrder.value
  list.sort((a, b) => {
    const va = getScoreField(a, key) ?? 0
    const vb = getScoreField(b, key) ?? 0
    return order === 'asc' ? va - vb : vb - va
  })
  return list
})

function sortScore(key) {
  if (sortScoreKey.value === key) sortScoreOrder.value = sortScoreOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortScoreKey.value = key; sortScoreOrder.value = 'desc' }
}
function getScoreSortIcon(key) {
  if (sortScoreKey.value !== key) return '↕'
  return sortScoreOrder.value === 'asc' ? '↑' : '↓'
}

const columnLabels = computed(() => COLUMNS.map(col => ({
  key: col.series.replace(/\s/g, '-'),
  text: col.series,
  x: (col.idx + 0.5) * (100 / 10)
})))
const brandDividerStyle = { left: '50%', width: '6px', background: 'linear-gradient(to top, var(--value-red-text), var(--value-cyan-text), var(--value-gold-text))', opacity: 0.8 }
function getColDividerStyle(i) { return { left: (i * 100) / 10 + '%' } }

function showTooltip(item, event) {
  tooltip.visible = true
  tooltip.title = item.displayLabel
  tooltip.percent = getCurrentPercent(item.gpu)
  tooltip.estimated = false
  tooltip.style = { position: 'fixed', left: event.clientX + 12 + 'px', top: event.clientY - 40 + 'px' }
}
function hideTooltip() { tooltip.visible = false }
function showDetail(item) { openDetailModal(item.gpu) }

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
function checkMobile() { isMobile.value = window.innerWidth < 768 }
function onDealCardClick() { if (window.__showDealModal) window.__showDealModal() }

let sheetStartY = 0, sheetMoveY = 0
function onSheetTouchStart(e) { sheetStartY = e.touches[0].clientY }
function onSheetTouchMove(e) {
  sheetMoveY = e.touches[0].clientY - sheetStartY
  if (sheetMoveY > 0) e.currentTarget.style.transform = `translateY(${sheetMoveY}px)`
}
function onSheetTouchEnd(e) {
  if (sheetMoveY > 120) closeMobileSearchPanel()
  else e.currentTarget.style.transform = ''
  sheetMoveY = 0
}

watch(displayRes, () => {
  if (!isBenchmarkManual.value) {
    benchmarkGpu.value = defaultBenchmarkForRes.value
  }
})
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', onPageScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', onPageScroll)
})
</script>

<style scoped>
.tier-page { max-width: 1400px; margin: 0 auto; padding: var(--space-md); min-height: 80vh; }

.top-bar-dual { display: flex; gap: var(--space-md); }
.top-bar-dual > * { flex: 1; min-width: 0; }

.top-bar { display: flex; align-items: center; gap: var(--space-md); margin-top: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.tabs { display: flex; gap: var(--space-sm); }
.tab-btn {
  padding: 0.6rem 1.2rem; background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-secondary); font-size: 0.95rem;
  cursor: pointer; transition: all var(--anim-fast);
}
.tab-btn:hover { border-color: var(--accent); }
.tab-btn.active {
  background: transparent;
  border: 2px solid var(--btn-gold);
  color: var(--btn-gold);
  font-weight: 600;
}

.benchmark-hint { text-align: center; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; }

.desktop-search-fab {
  position: fixed;
  right: 1.2rem;
  top: 75%;
  transform: translateY(-50%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.desktop-fab-btn.compare-fab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  background: var(--bg-secondary);
  border: 1px solid var(--table-border-gold);
  border-radius: 10px;
  color: var(--accent);
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: var(--shadow-card);
  white-space: nowrap;
  position: relative;
}
.desktop-fab-btn.compare-fab-btn:hover {
  background: var(--value-gold-bg);
  border-color: var(--table-border-gold);
}
.desktop-fab-btn.compare-fab-btn:active { transform: scale(0.95); }
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

.scatter-container { margin-bottom: 1rem; }
.brand-headers { display: flex; border: 1px solid var(--border); border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0; overflow: hidden; }
.brand-header { text-align: center; padding: 0.5rem 0; font-size: 1.1rem; font-weight: 800; color: #fff; }
.nvidia-header { background: var(--brand-nvidia); flex: 5; }
.amd-header { background: var(--brand-amd); flex: 4; }
.intel-header { background: var(--brand-intel); flex: 1; }
.scatter-plot { position: relative; height: 2000px; background: var(--bg-secondary); border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--radius-md) var(--radius-md); }

.gpu-dot {
  position: absolute; width: 12px; height: 12px; background: var(--accent);
  border-radius: 50%; transform: translate(-50%, -50%); cursor: pointer; z-index: 10;
  box-shadow: 0 0 6px var(--highlight-border); transition: transform var(--anim-fast), box-shadow var(--anim-fast);
}
.gpu-dot.intel {
  background: var(--brand-intel);
  box-shadow: 0 0 6px rgba(0, 83, 167, 0.6);
}
.gpu-dot::before {
  content: ''; position: absolute; left: -6px; top: -12px; width: 130px; height: 30px;
  background: transparent; border-radius: var(--radius-sm);
}
.gpu-dot.hollow { background: transparent; border: 2px solid var(--accent); box-shadow: 0 0 4px var(--highlight-border); }
.dot-label {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--text-primary); font-size: 0.75rem; font-weight: 500;
  white-space: nowrap; pointer-events: none;
  background: transparent; padding: 1px 6px; border-radius: var(--radius-sm); line-height: 1.4;
}
.benchmark-line { position: absolute; left: 0; right: 0; height: 1px; border-top: 1px dashed var(--accent); z-index: 2; }
.benchmark-line-label { position: absolute; right: 8px; top: -14px; font-size: 0.7rem; color: var(--accent); background: var(--bg-secondary); padding: 2px 6px; border-radius: var(--radius-sm); font-weight: 600; }
.x-axis { position: relative; height: 30px; margin-top: 0.25rem; }
.x-label { position: absolute; transform: translateX(-50%); font-size: 0.7rem; color: var(--text-secondary); }
.col-divider { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border); opacity: 0.4; }
.brand-divider { position: absolute; top: 0; bottom: 0; width: 6px; opacity: 0.8; z-index: 3; transform: translateX(-50%); }

.tier-mobile { display: none; }

.table-wrapper {
  max-height: 70vh; overflow: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--table-border-gold);
  outline: 1.5px solid var(--table-outline-blue);
  outline-offset: 2px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.cpu-table { width: 100%; border-collapse: collapse; }
.cpu-table th {
  padding: 0.5rem 0.4rem; background: var(--bg-tertiary); color: var(--thead-text);
  font-weight: 600; border-bottom: 1px solid var(--border);
}
.cpu-table td {
  padding: 0.65rem 0.4rem; border-bottom: 1px solid var(--table-divider); color: var(--text-primary);
}
.cpu-row:hover { background: var(--highlight-bg); }
.cpu-row:active { background: var(--value-gold-bg); transform: scale(var(--active-scale)); }

.mobile-fab-group {
  position: fixed; right: 1rem; bottom: 3rem; z-index: 500;
  display: flex; flex-direction: column; gap: 12px;
  transition: transform var(--anim-slow), opacity var(--anim-slow);
}
.mobile-fab-group.collapsed { transform: translateX(60%); opacity: 0.5; }
.fab-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--bg-secondary); border: 1.5px solid var(--table-border-gold);
  color: var(--accent); cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-fab); transition: all var(--anim-fast);
}
.fab-btn:active { transform: scale(var(--active-scale)); }

.mobile-search-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  display: flex; align-items: flex-end; justify-content: center; z-index: 1100;
}
.mobile-search-sheet {
  background: var(--bg-secondary); border-radius: var(--radius-full) var(--radius-full) 0 0;
  width: 100%; max-height: 75vh; display: flex; flex-direction: column; padding: 1rem;
  transition: transform var(--anim-slow);
}
.sheet-handle { width: 36px; height: 4px; background: rgba(128,128,128,0.3); border-radius: 2px; margin: 0 auto 0.75rem; }
.search-input-row { margin-bottom: 0.75rem; }
.mobile-search-input { width: 100%; padding: 0.6rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.9rem; }
.mobile-search-results { max-height: 40vh; overflow-y: auto; margin-bottom: 0.75rem; }
.mobile-search-item { display: flex; align-items: center; gap: var(--space-sm); padding: 0.5rem 0; border-bottom: 1px solid var(--table-divider); cursor: pointer; }
.mobile-search-item:active { background: var(--highlight-bg); }
.result-name { flex: 1; font-size: 0.85rem; color: var(--text-primary); }
.result-actions { display: flex; gap: 0.3rem; }
.mini-btn { padding: 0.2rem 0.5rem; font-size: 0.7rem; border-radius: var(--radius-sm); cursor: pointer; background: rgba(128,128,128,0.08); border: 1px solid var(--border); color: var(--text-secondary); transition: all var(--anim-fast); }
.mini-btn:active { transform: scale(var(--active-scale)); }
.mini-btn.compare-btn { color: var(--accent); border-color: var(--highlight-border); }
.mini-btn.bench-btn { color: var(--brand-intel); border-color: rgba(74,144,217,0.3); }
.compare-section { border-top: 1px solid var(--border); padding-top: 0.75rem; }
.compare-section-title { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
.compare-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
.compare-chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: rgba(128,128,128,0.08); border: 1px solid var(--border); border-radius: var(--radius-full); font-size: 0.8rem; }
.chip-dot { width: 6px; height: 6px; border-radius: 50%; }
.chip-dot.intel { background: var(--brand-intel); }
.chip-dot.amd { background: var(--brand-amd); }
.chip-dot.nvidia { background: var(--brand-nvidia); }
.chip-label { color: var(--text-primary); }
.chip-remove-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; padding: 0; line-height: 1; }
.compare-actions { display: flex; gap: var(--space-sm); }
.action-btn { padding: 0.4rem 0.8rem; border-radius: var(--radius-md); font-size: 0.8rem; cursor: pointer; border: 1px solid var(--border); transition: all var(--anim-fast); }
.action-btn:active { transform: scale(var(--active-scale)); }
.action-btn.clear-btn { background: rgba(128,128,128,0.08); color: var(--text-secondary); }
.action-btn.open-btn { background: var(--accent); color: #000; font-weight: 600; border: none; }

.legend-section { margin-top: 1.5rem; padding: 1rem; background: var(--highlight-bg); border-radius: var(--radius-md); }
.unique-title-row { display: flex; align-items: center; gap: 8px; }
.unique-title-row strong { color: var(--accent); }
.legend-items { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.legend-item { display: flex; gap: 0.5rem; font-size: 0.8rem; }
.dot-legend { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; }
.dot-legend.filled { background: var(--accent); }
.dot-legend.hollow { background: transparent; border: 2px solid rgba(255,255,255,0.5); }
.dot-legend.bench { background: transparent; border: 1px dashed var(--accent); }

.brand-intel { color: var(--brand-intel); }
.brand-amd { color: var(--brand-amd); }
.brand-nvidia { color: var(--brand-nvidia); }

.global-selection-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 15;
  cursor: pointer;
}
@media (prefers-color-scheme: dark) {
  .global-selection-overlay { background: rgba(0, 0, 0, 0.5); }
}

.tier-tooltip {
  background: var(--modal-bg);
  border: 1px solid var(--table-border-gold);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.82rem;
  color: var(--text-primary);
  pointer-events: none;
  white-space: nowrap;
  box-shadow: var(--shadow-card);
  z-index: 50;
}
.tooltip-name { font-weight: 600; color: var(--accent); }
.tooltip-pct { font-family: 'JetBrains Mono', monospace; }

.gpu-dot.is-searched {
  z-index: 20 !important;
  transform: translate(-50%, -50%) scale(1.5);
  background: var(--accent);
  box-shadow: 0 0 12px 4px var(--highlight-border);
  border: 2px solid #fff;
}

.tier-item.is-searched {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  z-index: 20;
  position: relative;
}

tr.is-searched {
  background: rgba(255, 215, 0, 0.15) !important;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  z-index: 10;
  position: relative;
}

.rank-col { width: 20px; min-width: 10px; }
.model-col { width: 180px; min-width: 140px; }
.spec-col { width: 80px; min-width: 70px; }
.value-cell { width: 75px; min-width: 60px; }
.col-spacer { width: 50px; }
.spacer-cell { padding: 0 !important; background: transparent !important; pointer-events: none; }

@media (max-width: 768px) {
  .score-table .rank-col { width: 12%; }
  .score-table .model-col { width: 40%; }
  .score-table .value-col { width: 24%; }
  .tabs { justify-content: center; width: 100%; }
  .tab-btn { flex: 1; text-align: center; padding: 0.4rem; font-size: 0.8rem; }
  .top-bar-dual { flex-direction: column; width: 100%; }
  .scatter-container { display: none; }
  .tier-mobile { display: block; }
}
.mobile-only { display: none; }
@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: inline !important; }
}

.sort-icon {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--value-gold-bg);
  color: var(--accent);
  font-size: 0.65rem;
  cursor: pointer;
  margin-left: 0.2rem;
  user-select: none;
  transition: all 0.15s;
}
.sort-icon:hover { background: var(--brand-border-strong); }
.sort-icon:active { transform: scale(0.9); }

.tier-2col { position: relative; display: block; margin-top: 0.5rem; }
.tier-2col::after {
  content: '';
  position: absolute;
  top: 35px;
  bottom: 0;
  left: calc(50% - 2px);
  width: 4px;
  background: linear-gradient(to top, var(--value-red-text), var(--value-cyan-text), var(--value-gold-text));
  z-index: 0;
  pointer-events: none;
}
.tier-row { display: flex; align-items: stretch; }
.tier-row .tier-col { flex: 1; display: flex; flex-direction: column; }
.tier-empty-cell { min-height: 28px; }
.tier-header-row .tier-brand {
  text-align: center; font-size: 0.85rem; font-weight: 800;
  padding: 0.4rem 0; color: #fff !important;
}
.tier-header-row .tier-brand.nvidia { background: var(--brand-nvidia); }
.tier-header-row .tier-brand.amd { background: var(--brand-amd); }
.tier-header-row .tier-brand.intel { background: var(--brand-intel); }
.tier-item-group { display: flex; flex-direction: column; }
.tier-item { display: flex; align-items: center; padding: 0.2rem 0; min-height: 22px; gap: 0.6rem; cursor: pointer; }
.tier-item:active {
  transform: scale(0.96);
  background: var(--value-gold-bg);
  transition: transform 0.06s, background 0.06s;
}
.tier-pct { font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; color: var(--text-secondary); min-width: 40px; text-align: center; }
.tier-model { font-size: 0.85rem; font-weight: 600; }
.tier-model.nvidia { color: var(--brand-nvidia); }
.tier-model.amd { color: var(--brand-amd); }
.tier-model.intel { color: var(--brand-intel); }

.gpu-dot:active {
  transform: translate(-50%, -50%) scale(0.85);
  background: var(--accent);
  box-shadow: 0 0 12px var(--highlight-border);
  transition: transform 0.08s, background 0.08s;
}

@media (min-width: 769px) {
  .mobile-search-overlay {
    align-items: flex-end;
    justify-content: center;
  }
  .mobile-search-sheet {
    border-radius: 20px 20px 0 0;
    max-width: 480px;
    width: 90%;
    margin: 0 auto;
  }
}
/* 分辨率切换条 */
.res-switch-bar {
  display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.2rem;
}
.res-switch-bar button {
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.res-switch-bar button.active {
  background: transparent;
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
</style>