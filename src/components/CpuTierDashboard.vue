<template>
  <div class="tier-page">
    <!-- 全屏遮罩（搜索选中时覆盖整个页面） -->
    <div v-if="selectedSearchCpu" class="global-selection-overlay" @click="clearSearchSelection"></div>

    <!-- 顶部区域：Tab切换 + 双轮播 -->
        <div class="top-bar-dual">
      <CarouselBanner type="deal" :items="dealItems" @card-click="onDealCardClick" />
      <CarouselBanner type="video" :items="videoItems" />
    </div>

    <div class="top-bar">
      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'game' }" @click="switchTab('game')">🎮 游戏性能</button>
        <button class="tab-btn" :class="{ active: activeTab === 'multi' }" @click="switchTab('multi')">⚡ 多核性能</button>
        <button class="tab-btn" :class="{ active: activeTab === 'scores' }" @click="switchTab('scores')">📊 跑分功耗</button>
      </div>
    </div>

    <!-- 基准提示 -->
        <div class="benchmark-hint">
      <template v-if="benchmarkCpu">
        📌 基准：{{ benchmarkCpu.model_short || benchmarkCpu.model }} (100%) · 共 {{ cpus.length }} 款CPU
      </template>
      <template v-else>⚠️ 未找到基准CPU · 共 {{ cpus.length }} 款CPU</template>
    </div>

    <!-- 桌面端：搜索·对比整合悬浮按钮 + 面板（固定定位，不受页面内容影响） -->
        <div class="desktop-search-fab desktop-only">
      <button class="desktop-fab-btn compare-fab-btn" @click.stop="openMobileSearchPanel">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 3h13M4 8h8M6.5 13h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>搜索·对比</span>
        <span v-if="compareList.length" class="desktop-fab-badge">{{ compareList.length }}</span>
      </button>
    </div>

    <!-- 游戏/多核 天梯图内容 -->
    <template v-if="activeTab === 'game' || activeTab === 'multi'">
      <div class="mini-table-box tier-card">
        <!-- 桌面端散点图 -->
        <div class="scatter-container" ref="scatterContainer" v-if="!isMobile">
          <div class="brand-headers">
            <div class="brand-header intel-header">INTEL</div>
            <div class="brand-header amd-header">AMD</div>
          </div>
          <div class="scatter-plot" ref="scatterPlot">
            <!-- Tooltip 悬浮提示 -->
            <div v-show="tooltip.visible" class="tier-tooltip" :style="tooltip.style">
              <div class="tooltip-name">{{ tooltip.title }}</div>
              <div class="tooltip-pct">性能 {{ tooltip.percent }}%<span v-if="tooltip.estimated"> (推算)</span></div>
            </div>

            <div class="column-dividers">
              <div v-for="i in 7" :key="i" class="col-divider" :style="getColDividerStyle(i)"></div>
            </div>
            <div class="brand-divider" :style="brandDividerStyle"></div>
            <div
              v-for="item in positionedCpus"
              :key="item.key"
              class="cpu-dot"
              :data-cpu-id="item.cpus[0].id"
              :class="{
                'is-merged': item.merged && item.cpus.length > 1,
                'is-searched': item.isSearched,
                'is-dimmed': selectedSearchCpu && !item.isSearched,
                intel: item.brand === 'INTEL',
                amd: item.brand === 'AMD',
                hollow: item.isEstimated && activeTab === 'game'
              }"
              :style="{ left: item.x + '%', top: item.y + '%' }"
              @click="showDetail(item)"
              @mouseenter="showTooltip(item, $event)"
              @mouseleave="hideTooltip"
            >
              <span class="dot-label">{{ item.displayLabel }}</span>
            </div>
            <div
              v-for="label in seriesLabels"
              :key="label.key"
              class="series-label"
              :class="label.brand.toLowerCase()"
              :style="{ left: label.x + '%', top: label.y + '%' }"
              @click="label.cpu && showDetailFromCpu(label.cpu)"
              @mouseenter="label.cpu && showLabelTooltip(label, $event)"
              @mouseleave="hideTooltip"
            >
              {{ label.text }}
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
      <div class="tier-col"><div class="tier-brand intel">INTEL</div></div>
      <div class="tier-col"><div class="tier-brand amd">AMD</div></div>
    </div>
    <!-- 数据行 -->
    <template v-for="row in tierRows" :key="row.score">
      <div class="tier-row">
        <div class="tier-col">
          <div v-if="row.left" class="tier-item-group">
            <div v-for="(item, idx) in row.left" :key="'l-' + item.cpus[0].id"
                 class="tier-item" :data-cpu-id="item.cpus[0].id"
                 :class="{ 'is-searched': selectedSearchCpu && item.cpus.some(c => c.id === selectedSearchCpu.id) }"
                 @click="openDetailModal(item.cpus[0])">
              <span class="tier-pct" v-if="idx === 0">{{ getCurrentPercent(item.cpus[0]) }}%</span>
              <span v-else class="tier-pct" style="visibility: hidden">{{ getCurrentPercent(item.cpus[0]) }}%</span>
              <span class="tier-model intel">{{ item.displayLabel }}</span>
            </div>
          </div>
          <div v-else class="tier-empty-cell"></div>
        </div>
        <div class="tier-col">
          <div v-if="row.right" class="tier-item-group">
            <div v-for="(item, idx) in row.right" :key="'r-' + item.cpus[0].id"
                 class="tier-item" :data-cpu-id="item.cpus[0].id"
                 :class="{ 'is-searched': selectedSearchCpu && item.cpus.some(c => c.id === selectedSearchCpu.id) }"
                 @click="openDetailModal(item.cpus[0])">
              <span class="tier-model amd">{{ item.displayLabel }}</span>
              <span class="tier-pct" v-if="idx === 0">{{ getCurrentPercent(item.cpus[0]) }}%</span>
              <span v-else class="tier-pct" style="visibility: hidden">{{ getCurrentPercent(item.cpus[0]) }}%</span>
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
            <span class="unique-icon">{{ activeTab === 'game' ? '🏆' : '⚡' }}</span>
            <strong>{{ activeTab === 'game' ? ' 全网独一份 · 实测CPU游戏性能天梯图' : 'CPU多核性能天梯图' }}</strong>
            <span v-if="activeTab === 'game'" class="unique-badge">实测 + 同架构推算</span>
          </div>
          <div class="legend-items">
            <div v-if="activeTab === 'game'" class="legend-item">
              <span class="dot-legend filled"></span>
              <div><strong>实心圆点 = 实测型号</strong><p>实心圆点 = 实测型号，我亲自跑过，数据为默认设置下10款热门游戏平均表现。</p></div>
            </div>
            <div v-if="activeTab === 'game'" class="legend-item">
              <span class="dot-legend hollow"></span>
              <div><strong>空心圆点 = 同架构推算</strong><p>同架构推算，基于实测数据推算，误差通常在 ±5% 以内。</p></div>
            </div>
            <div class="legend-item">
              <span class="dot-legend bench"></span>
              <div><strong>基准说明</strong><p>默认以 i5-12490F = 100% 为标准，觉得不合适，你可以手动更改基准型号。点击CPU还能看详情、加对比。</p></div>
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
    <col span="2" class="col-group-params">  <!-- 排名 + 型号 -->
    <col span="3" class="col-group-params">  <!-- 核心/线程 + 频率 + 三缓 -->
    <col class="col-spacer">                 <!-- 分隔空列 1 -->
    <col span="2" class="col-group-scores">  <!-- 单核 + 多核 -->
    <col class="col-spacer">                 <!-- 分隔空列 2 -->
    <col span="3" class="col-group-power">   <!-- 官方功耗 + 满载功耗 + 游戏功耗 -->
  </colgroup>
  <thead>
    <tr>
      <th class="rank-col">排名</th>
      <th class="model-col">型号</th>
      <th class="spec-col">核心/线程</th>
      <th class="spec-col">频率</th>
      <th class="spec-col">三缓</th>
      <th class="spacer-cell"></th>  <!-- 空表头 -->
      <th class="sortable" @click="sortScore('single')">单核 <span class="sort-icon">{{ getScoreSortIcon('single') }}</span></th>
      <th class="sortable" @click="sortScore('multi')">多核 <span class="sort-icon">{{ getScoreSortIcon('multi') }}</span></th>
      <th class="spacer-cell"></th>  <!-- 空表头 -->
      <th class="spec-col">官方功耗</th>
      <th class="sortable" @click="sortScore('power_full')">满载功耗 <span class="sort-icon">{{ getScoreSortIcon('power_full') }}</span></th>
      <th class="sortable" @click="sortScore('power_game')">游戏功耗 <span class="sort-icon">{{ getScoreSortIcon('power_game') }}</span></th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="(cpu, index) in sortedScoreCpus" :key="cpu.id" class="cpu-row"
      :data-cpu-id="cpu.id"
      :class="{ 'is-searched': selectedSearchCpu && cpu.id === selectedSearchCpu.id }"
      @click="openDetailModal(cpu)">
      <td class="rank">{{ index + 1 }}</td>
      <td class="model"><span class="model-name" :class="getBrandClass(cpu.model)">{{ cpu.model }}</span></td>
      <td class="spec-cell">{{ cpu.cores }}核{{ cpu.threads }}线程</td>
      <td class="spec-cell">{{ cpu.base_freq }}-{{ cpu.boost_freq }}GHz</td>
      <td class="spec-cell">{{ cpu.l3_cache || '-' }}</td>
      <td class="spacer-cell"></td>  <!-- 空数据格 -->
      <td class="value-cell">{{ getScoreField(cpu, currentScoreDim + '_single') ?? '-' }}</td>
      <td class="value-cell">{{ getScoreField(cpu, currentScoreDim + '_multi') ?? '-' }}</td>
      <td class="spacer-cell"></td>  <!-- 空数据格 -->
      <td class="spec-cell">{{ cpu.tdp ? cpu.tdp + 'W' : '-' }}</td>
      <td class="value-cell">{{ cpu.power_full ? cpu.power_full + 'W' : '-' }}</td>
      <td class="value-cell">{{ cpu.power_game ? cpu.power_game + 'W' : '-' }}</td>
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
                <th class="sortable" @click="sortScore('single')">单核 <span class="sort-icon">{{ getScoreSortIcon('single') }}</span></th>
                <th class="sortable" @click="sortScore('multi')">多核 <span class="sort-icon">{{ getScoreSortIcon('multi') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(cpu, index) in sortedScoreCpus" :key="cpu.id" class="cpu-row"
                :data-cpu-id="cpu.id"
                :class="{ 'is-searched': selectedSearchCpu && cpu.id === selectedSearchCpu.id }"
                @click="openDetailModal(cpu)">
                <td class="rank">{{ index + 1 }}</td>
                <td class="model"><span class="model-name" :class="getBrandClass(cpu.model)">{{ cpu.model_short || cpu.model }}</span></td>
                <td class="value-cell">{{ getScoreField(cpu, currentScoreDim + '_single') ?? '-' }}</td>
                <td class="value-cell">{{ getScoreField(cpu, currentScoreDim + '_multi') ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 详情弹窗 -->
    <CpuTierDetailModal
      ref="detailModalRef"
      :benchmark-cpu="benchmarkCpu"
      :is-in-compare="selectedDetailCpu ? isInCompare(selectedDetailCpu) : false"
      :is-benchmark="selectedDetailCpu && selectedDetailCpu.id === benchmarkCpu?.id"
      @set-benchmark="setAsBenchmark"
      @add-compare="addToCompareCore"
      @remove-compare="removeFromCompare" @reset-benchmark="resetBenchmark"
    />

    <!-- 对比弹窗 -->
    <CpuTierCompareModal
      ref="compareModalRef"
      :cpus="compareList"
      :benchmark-cpu="benchmarkCpu"
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
            <div v-for="item in mobileSearchResults" :key="item.cpu.id" class="mobile-search-item" @click="jumpToCpu(item.cpu)">
              <span class="brand-dot" :class="isIntel(item.cpu) ? 'intel' : 'amd'"></span>
              <span class="result-name">{{ item.label }}</span>
              <div class="result-actions">
                <button class="mini-btn compare-btn" @click.stop="addToCompareCore(item.cpu)">{{ isInCompare(item.cpu) ? '已加入' : '+对比' }}</button>
                <button class="mini-btn bench-btn" @click.stop="setAsBenchmark(item.cpu)">{{ item.cpu.id === benchmarkCpu?.id ? '已设基准' : '基准' }}</button>
              </div>
            </div>
          </div>
          <div class="compare-section" v-if="compareList.length > 0">
            <div class="compare-section-title">对比栏 ({{ compareList.length }}/3)</div>
            <div class="compare-chips">
              <span v-for="cpu in compareList" :key="cpu.id" class="compare-chip">
                <span class="chip-dot" :class="isIntel(cpu) ? 'intel' : 'amd'"></span>
                <span class="chip-label">{{ cpu.model_short || cpu.model }}</span>
                <button class="chip-remove-btn" @click="removeFromCompare(cpu)">×</button>
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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import CarouselBanner from './CarouselBanner.vue'
import CpuTierDetailModal from './CpuTierDetailModal.vue'
import CpuTierCompareModal from './CpuTierCompareModal.vue'

const props = defineProps({
  initialCpus: { type: String, required: true },
  initialBenchmark: { type: String, required: true },
  initialDealItems: { type: String, default: '[]' },
  initialVideoItems: { type: String, default: '[]' }
})

const cpus = ref(JSON.parse(props.initialCpus || '[]'))
const dealItems = ref(JSON.parse(props.initialDealItems || '[]'))
const videoItems = ref(JSON.parse(props.initialVideoItems || '[]'))

const activeTab = ref('game')
const benchmarkCpu = ref(JSON.parse(props.initialBenchmark || 'null'))
const defaultBenchmark = ref(JSON.parse(props.initialBenchmark || 'null'))

const compareList = ref([])
const selectedSearchCpu = ref(null)
const searchQuery = ref('')
const showSearchDropdown = ref(false)
const detailModalRef = ref(null)
const compareModalRef = ref(null)
const selectedDetailCpu = ref(null)
const isMobile = ref(false)

const scatterContainer = ref(null)
const scatterPlot = ref(null)
const tooltip = reactive({ visible: false, title: '', percent: 0, estimated: false, style: {} })
const sortScoreKey = ref('multi')
const sortScoreOrder = ref('desc')
const currentScoreDim = ref('r23')

const fabCollapsed = ref(false)
const mobileSearchVisible = ref(false)
const mobileSearchQuery = ref('')
const showFullTip = ref(false)
const tierMobileList = ref(null)

const COLUMNS = [
  { idx: 0, series: 'Core i3 / Ultra 200', brand: 'INTEL' },
  { idx: 1, series: 'Core i5', brand: 'INTEL' },
  { idx: 2, series: 'Core i7', brand: 'INTEL' },
  { idx: 3, series: 'Core i9', brand: 'INTEL' },
  { idx: 4, series: 'Ryzen 9', brand: 'AMD' },
  { idx: 5, series: 'Ryzen 7', brand: 'AMD' },
  { idx: 6, series: 'Ryzen 5', brand: 'AMD' },
  { idx: 7, series: 'Ryzen 3', brand: 'AMD' }
]

const scoreDimensions = [
  { key: 'r23', label: 'R23' },
  { key: '3dmark', label: '3DMark' },
  { key: 'cpuz', label: 'CPU-Z' }
]

const TESTED_MODELS = new Set([
  'INTEL Core i7-14700K', 'INTEL Core i7-14700KF',
  'INTEL Core i7-12700K', 'INTEL Core i7-12700KF',
  'INTEL Core i5-14600K', 'INTEL Core i5-14600KF',
  'INTEL Core i5-13600K', 'INTEL Core i5-13600KF',
  'INTEL Core i5-12600K', 'INTEL Core i5-12600KF',
  'INTEL Core i5-13400', 'INTEL Core i5-13400F',
  'INTEL Core i5-11600K', 'INTEL Core i5-11600KF',
  'INTEL Core i5-12500', 'INTEL Core i5-12490F',
  'INTEL Core Ultra 5 265K', 'INTEL Core Ultra 5 265KF',
  'INTEL Core i3-14100', 'INTEL Core i3-14000F',
  'AMD Ryzen 9 7900X3D', 'AMD Ryzen 9 9800X3D',
  'AMD Ryzen 7 7800X3D', 'AMD Ryzen 7 9700X',
  'AMD Ryzen 7 9700X (官方TDP)', 'AMD Ryzen 7 7700',
  'AMD Ryzen 7 5800', 'AMD Ryzen 7 5700X',
  'AMD Ryzen 5 7600X3D', 'AMD Ryzen 5 9600X',
  'AMD Ryzen 5 7600X', 'AMD Ryzen 5 5500X3D',
  'AMD Ryzen 5 7500F', 'AMD Ryzen 5 5600X',
  'AMD Ryzen 5 5600', 'AMD Ryzen 5 5500',
  'AMD Ryzen 3 3600', 'AMD Ryzen 3 3500X',
  'AMD Ryzen 3 3100',
])

const isIntel = (cpu) => cpu?.model?.toUpperCase().includes('INTEL')
const getBrandClass = (m) => m?.toUpperCase().includes('AMD') ? 'brand-amd' : 'brand-intel'
const isIntelCpu = (cpu) => cpu ? isIntel(cpu) : false

// ---------- 核心辅助函数 (桌面端和移动端共用) ----------
/** 去除型号后缀，得到基础型号，如 "INTEL Core i5-13600K" → "INTEL Core i5-13600" */
function getBaseModel(model) {
  return model
    .replace(/(KF|KS|K|F|X|XT|X3D|G|GT|GE?)(\s|$)/i, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
}

/** 在一组 CPU 列表中，将“同基础型号 + 同分数”的CPU合并为一个条目 */
function mergeVariants(cpuList, currentScoreFn) {
  const map = new Map()
  for (const cpu of cpuList) {
    const score = currentScoreFn(cpu)
    const base = getBaseModel(cpu.model)
    const key = `${base}|||${score}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(cpu)
  }
  
  const merged = []
  for (const [key, cpus] of map.entries()) {
    const firstCpu = cpus[0]
    const score = currentScoreFn(firstCpu)
    let displayLabel = ''
    if (cpus.length > 1) {
      const parts = cpus.map(cpu => {
        const ms = String(cpu.model_short || cpu.model)
        const match = ms.match(/^(\d+)(.*)$/)
        return match ? { base: match[1], suffix: match[2] || '' } : { base: ms, suffix: '' }
      })
      const base = parts[0].base
      // 提取所有后缀（包括空字符串）
      const allSuffixes = parts.map(p => p.suffix)
      // 排序：空后缀在最前，非 F 后缀中间，F 后缀在最后
      allSuffixes.sort((a, b) => {
        // 空后缀排最前
        if (a === '' && b !== '') return -1
        if (b === '' && a !== '') return 1
        // 以 F 结尾的排后面
        const aIsF = a.endsWith('F') || a.endsWith('f')
        const bIsF = b.endsWith('F') || b.endsWith('f')
        if (aIsF && !bIsF) return 1
        if (!aIsF && bIsF) return -1
        return a.localeCompare(b)
      })
      // 拼接：如果只有一个后缀且为空，直接显示 base；否则用 / 连接
      const meaningful = allSuffixes.filter(s => s !== '')
      if (meaningful.length === 0) {
        displayLabel = base
      } else {
        displayLabel = base + allSuffixes.join('/')
      }
    } else {
      displayLabel = String(firstCpu.model_short || firstCpu.model)
    }
    
    merged.push({
      cpus,
      displayLabel,
      score,
      brand: isIntel(firstCpu) ? 'intel' : 'amd',   // ← 这一行是必须的！
      sortKey: parseInt(String(firstCpu.model_short || firstCpu.model).match(/(\d+)/)?.[0] || '0')
    })
  }
  return merged.sort((a, b) => b.sortKey - a.sortKey)
}

// ---------- 性能分数 ----------
const getCpuScore = (cpu) => activeTab.value === 'game' ? cpu.abs_game_performance : cpu.abs_multi_performance
const getBenchScore = () => {
  if (!benchmarkCpu.value) return activeTab.value === 'game' ? 5673 : 15000
  return activeTab.value === 'game' ? benchmarkCpu.value.abs_game_performance : benchmarkCpu.value.abs_multi_performance
}
const getCurrentPercent = (cpu) => {
  if (!benchmarkCpu.value) return 0
  const score = getCpuScore(cpu)
  const base = getBenchScore()
  return base ? Math.round((score / base) * 100) : 0
}
const getScoreField = (cpu, field) => cpu?.[field]

// ---------- 搜索下拉 ----------
const searchDropdownItems = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.toLowerCase()
  return cpus.value.filter(c => c.model.toLowerCase().includes(q)).slice(0, 8).map(c => ({
    cpu: c,
    label: c.model_short || c.model,
    isIntel: isIntel(c)
  }))
})

function onSearchInput() { showSearchDropdown.value = true }
function onSearchFocus() { if (searchQuery.value) showSearchDropdown.value = true }
function onSearchBlur() { setTimeout(() => { showSearchDropdown.value = false }, 500) }

function onSearchItemClick(cpu) {
  selectedSearchCpu.value = cpu
  searchQuery.value = cpu.model_short || cpu.model
  showSearchDropdown.value = false
  nextTick(() => {
    const target = document.querySelector(`[data-cpu-id="${cpu.id}"]`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  setTimeout(() => clearSearchSelection(), 3000)
}

function clearSearchSelection() { selectedSearchCpu.value = null; searchQuery.value = '' }
function jumpToFirstMatch() {
  if (searchDropdownItems.value.length > 0) onSearchItemClick(searchDropdownItems.value[0].cpu)
}

// ---------- 移动端搜索 ----------
const mobileSearchResults = computed(() => {
  if (!mobileSearchQuery.value) return []
  const q = mobileSearchQuery.value.toLowerCase()
  return cpus.value.filter(c => c.model.toLowerCase().includes(q)).slice(0, 10).map(c => ({
    cpu: c,
    label: c.model_short || c.model,
    isIntel: isIntel(c)
  }))
})

function onMobileSearchInput() {}
function jumpToCpu(cpu) {
  closeMobileSearchPanel()
  selectedSearchCpu.value = cpu
  setTimeout(() => {
    const target = document.querySelector(`[data-cpu-id="${cpu.id}"]`)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
  setTimeout(() => clearSearchSelection(), 3000)
}

// ---------- 对比 ----------
function addToCompareCore(cpu) {
  const index = compareList.value.findIndex(c => c.id === cpu.id)
  if (index !== -1) {
    compareList.value.splice(index, 1)
  } else {
    if (compareList.value.length >= 3) return
    compareList.value.push(cpu)
    if (compareList.value.length === 3) {
      showFullTip.value = true
      setTimeout(() => { showFullTip.value = false }, 2000)
    }
  }
}
function removeFromCompare(cpu) { compareList.value = compareList.value.filter(c => c.id !== cpu.id) }
function clearCompare() { compareList.value = [] }
function setAsBenchmark(cpu) {
  if (benchmarkCpu.value?.id === cpu.id) {
    resetBenchmark()
  } else {
    benchmarkCpu.value = cpu
  }
}
function resetBenchmark() { benchmarkCpu.value = defaultBenchmark.value }
function switchTab(tab) { activeTab.value = tab }
function openDetailModal(cpu) {
  selectedDetailCpu.value = cpu
  detailModalRef.value?.show(cpu, compareList.value.length >= 3)
}
function openCompareModal() { if (compareList.value.length > 0) compareModalRef.value?.show() }
function isInCompare(cpu) { return compareList.value.some(c => c.id === cpu.id) }
function openMobileSearchPanel() { mobileSearchVisible.value = true }
function closeMobileSearchPanel() { mobileSearchVisible.value = false; mobileSearchQuery.value = '' }
function openCompareModalFromMobile() { closeMobileSearchPanel(); openCompareModal() }

// ---------- Y 轴映射 ----------
const scoreRange = computed(() => {
  const scores = cpus.value.map(cpu => getCpuScore(cpu)).filter(s => s != null && s > 0)
  if (scores.length === 0) return { min: 1000, max: 10000 }
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = max - min
  return { min: min - span * 0.05, max: max + span * 0.05 }
})

function scoreToY(score) {
  if (!score || score <= 0) return 90
  const { min, max } = scoreRange.value
  if (max <= min) return 50
  const logMin = Math.log(min), logMax = Math.log(max), logVal = Math.log(Math.max(score, min))
  return Math.max(0, Math.min(100, 5 + (1 - (logVal - logMin) / (logMax - logMin)) * 90))
}
function getY(score) { return scoreToY(score) }
const benchmarkY = computed(() => cpus.value.length ? getY(getBenchScore()) : null)

// ---------- 桌面端散点图 (使用 mergeVariants) ----------
const positionedCpus = computed(() => {
  if (!cpus.value.length) return []
  const items = []
  const colCpus = new Map()
  for (let i = 0; i < 8; i++) colCpus.set(i, [])
  for (const cpu of cpus.value) {
    const col = getColumn(cpu)
    if (colCpus.has(col)) colCpus.get(col).push(cpu)
  }

  for (const [colIdx, list] of colCpus.entries()) {
    // 1. 合并同型号同分数变体（13600K/KF 等）
    const mergedGroups = mergeVariants(list, getCpuScore)
    if (mergedGroups.length === 0) continue // 空列跳过

    // 2. 按分数从高到低排序
    mergedGroups.sort((a, b) => b.score - a.score)

    // 3. 将分数差距小于 2%（相对于基准分）的圆点归为一组
    const scoreGroups = []
    let currentGroup = [mergedGroups[0]]
    for (let i = 1; i < mergedGroups.length; i++) {
      const prevScore = mergedGroups[i - 1].score
      const currScore = mergedGroups[i].score
      const diffPct = (prevScore - currScore) / (getBenchScore() || 1)
      if (diffPct < 0.02) {
        currentGroup.push(mergedGroups[i])
      } else {
        scoreGroups.push(currentGroup)
        currentGroup = [mergedGroups[i]]
      }
    }
    if (currentGroup.length > 0) scoreGroups.push(currentGroup)

    // 4. 处理每一组：组内圆点纵向排列，组间保持原有 Y 距离
    const usedYs = []
    for (const group of scoreGroups) {
      const baseScore = group[0].score
      let baseY = getY(baseScore)
      while (usedYs.some(uy => Math.abs(uy - baseY) < 0.8)) baseY += 0.8
      baseY = Math.max(0.5, Math.min(99.5, baseY))

      for (let k = 0; k < group.length; k++) {
        const g = group[k]
        const y = k === 0 ? baseY : Math.max(0.5, Math.min(99.5, usedYs[usedYs.length - 1] + 0.8))
        // ★ 微调点：组内纵向间距，当前为 0.8（占图表高度的 0.8%）。改大则组内圆点更分散，改小则更紧密 ★
        usedYs.push(y)

        const firstCpu = g.cpus[0]
        items.push({
          key: g.cpus.map(c => c.id).join('-'),
          cpus: g.cpus,
          displayLabel: g.displayLabel,
          brand: isIntel(firstCpu) ? 'INTEL' : 'AMD',
          column: colIdx,
          score: g.score,
          x: (colIdx + 0.3) * (100 / 8),
          y,
          merged: g.cpus.length > 1,
          isSearched: selectedSearchCpu.value ? g.cpus.some(c => c.id === selectedSearchCpu.value.id) : false,
          isEstimated: activeTab.value === 'game' && !TESTED_MODELS.has(firstCpu.model)
        })
      }
    }
  }
  return items
})

function getColumn(cpu) {
  const m = cpu.model.toUpperCase()
  if (m.includes('INTEL')) {
    if (m.includes('I9')) return 3; if (m.includes('I7')) return 2; if (m.includes('I5')) return 1
    if (m.includes('I3') || m.includes('ULTRA')) return 0; return 1
  }
  if (m.includes('RYZEN 9') || m.includes('R9')) return 4; if (m.includes('RYZEN 7') || m.includes('R7')) return 5
  if (m.includes('RYZEN 5') || m.includes('R5')) return 6; if (m.includes('RYZEN 3') || m.includes('R3')) return 7
  return 6
}

// ---------- 移动端双列天梯 (使用 mergeVariants) ----------
const tierRows = computed(() => {
  if (!cpus.value.length) return []

  // 1. 收集所有 CPU，用 mergeVariants 合并变体（12400/F、13600K/KF）
  const allItems = []
  for (const cpu of cpus.value) {
    if (cpu.hide_in_ranking) continue
    const score = getCpuScore(cpu)
    allItems.push({ cpu, score })
  }
  const mergedItems = mergeVariants(allItems.map(i => i.cpu), getCpuScore)
  // mergedItems 每个元素: { cpus, displayLabel, score, brand }

  // 2. 按绝对分数从高到低统一排序
  mergedItems.sort((a, b) => b.score - a.score)

  // 3. 按“每行基准分数 × 2%”的规则分组
  const TOLERANCE_PCT = 0.02

  const rows = []
  let i = 0
  while (i < mergedItems.length) {
    const anchor = mergedItems[i]
    const anchorScore = anchor.score
    const allowedDiff = anchorScore * TOLERANCE_PCT

    const left = []
    const right = []

    // 把锚点放入对应侧
    if (anchor.brand === 'intel') left.push(anchor)
    else right.push(anchor)

    // 往后收集：差值在允许范围内就归入同一行
    let j = i + 1
    while (j < mergedItems.length) {
      const next = mergedItems[j]
      const diff = anchorScore - next.score
      if (diff <= allowedDiff) {
        if (next.brand === 'intel') left.push(next)
        else right.push(next)
        j++
      } else {
        break
      }
    }

    rows.push({
      score: anchorScore,
      left: left.length > 0 ? left : null,
      right: right.length > 0 ? right : null
    })

    i = j
  }

  return rows
})

function sortScore(key) {
  if (sortScoreKey.value === key) sortScoreOrder.value = sortScoreOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortScoreKey.value = key; sortScoreOrder.value = 'desc' }
}
function getScoreSortIcon(key) {
  if (sortScoreKey.value !== key) return '↕'
  return sortScoreOrder.value === 'asc' ? '↑' : '↓'
}
// ---------- 跑分表格 ----------
const sortedScoreCpus = computed(() => {
  const list = [...cpus.value]
  const key = sortScoreKey.value
  const order = sortScoreOrder.value
  list.sort((a, b) => {
    const va = getScoreField(a, currentScoreDim.value + '_' + key) ?? 0
    const vb = getScoreField(b, currentScoreDim.value + '_' + key) ?? 0
    return order === 'asc' ? va - vb : vb - va
  })
  return list
})

// ---------- 提示 / 详情 ----------
const seriesLabels = computed(() => [])
const columnLabels = computed(() => COLUMNS.map(col => ({
  key: col.series.replace(/\s/g, '-'),
  text: col.series,
  x: (col.idx + 0.5) * (100 / 8)
})))
const brandDividerStyle = { left: '50%', width: '6px', background: 'linear-gradient(to bottom, var(--value-gold-text), var(--value-cyan-text), var(--value-red-text))', opacity: 0.8 }
function getColDividerStyle(i) { return { left: (i * 100) / 8 + '%' } }

function showTooltip(item, event) {
  const cpu = item.cpus[0]
  tooltip.visible = true
  tooltip.title = item.displayLabel
  tooltip.percent = getCurrentPercent(cpu)
  tooltip.estimated = item.isEstimated
  tooltip.style = { position: 'fixed', left: event.clientX + 12 + 'px', top: event.clientY - 40 + 'px' }
}
function showLabelTooltip(label, event) {
  if (!label.cpu) return
  tooltip.visible = true
  tooltip.title = label.cpu.model_short || label.cpu.model
  tooltip.percent = getCurrentPercent(label.cpu)
  tooltip.estimated = false
  tooltip.style = { position: 'fixed', left: event.clientX + 12 + 'px', top: event.clientY - 40 + 'px' }
}
function hideTooltip() { tooltip.visible = false }
function showDetail(item) { openDetailModal(item.cpus[0]) }
function showDetailFromCpu(cpu) { openDetailModal(cpu) }

// ---------- 悬浮按钮 ----------
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

// ---------- 手势 ----------
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
/* ═══════════ 全站统一变量及组件样式 ═══════════ */
.tier-page { max-width: 1400px; margin: 0 auto; padding: var(--space-md); min-height: 80vh; }

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
.top-bar-spacer { flex: 1; min-width: 0; }
.top-bar-dual { display: flex; gap: var(--space-md); }
.top-bar-dual > * { flex: 1; min-width: 0; }

/* 搜索 & 对比栏 */
.search-compare-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  align-items: stretch;
}
.search-bar {
  min-width: 0;
  overflow: visible;
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.3rem 0.5rem;
  position: relative;
}
.search-bar input {
  flex: 1; background: transparent; border: none; color: var(--text-primary); font-size: 0.9rem; padding: 0.4rem;
}
.search-bar input:focus { outline: none; }
.search-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-secondary);
  border: 1px solid var(--border); z-index: 100; max-height: 240px; overflow-y: auto;
}
.search-dropdown-item { display: flex; align-items: center; gap: var(--space-sm); padding: 0.4rem 0.8rem; cursor: pointer; }
.search-dropdown-item:hover { background: var(--highlight-bg); }
.search-dropdown-empty { padding: 0.6rem 0.8rem; color: var(--text-secondary); text-align: center; font-size: 0.85rem; }

.compare-inline {
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.4rem 0.6rem;
}
.compare-inline-label { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; }
.compare-inline-items { display: flex; gap: 0.3rem; flex-wrap: nowrap; overflow-x: auto; flex: 1; }
.compare-inline-chip {
  display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem;
  background: rgba(128,128,128,0.08); border: 1px solid var(--border); border-radius: var(--radius-full);
  font-size: 0.8rem;
}
.compare-inline-chip.is-benchmark { border-color: var(--accent); }
.chip-brand { font-size: 0.65rem; }
.chip-brand.intel { color: var(--brand-intel); }
.chip-brand.amd { color: var(--brand-amd); }
.chip-name { color: var(--text-primary); font-weight: 500; max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.chip-remove { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem; }
.compare-inline-clear,
.compare-inline-bench {
  padding: 0.25rem 0.5rem; background: transparent; border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; font-size: 0.75rem;
}
.compare-bench-btn {
  padding: 0.25rem 0.6rem; background: var(--accent); color: #000; border: none;
  border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.75rem;
}
.compare-bench-btn.disabled { opacity: 0.4; cursor: not-allowed; }

/* 轻提示 */
.compare-full-tip {
  font-size: 0.72rem;
  color: var(--accent);
  white-space: nowrap;
  animation: fadeInOut 2s ease;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  15% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}
.benchmark-hint { text-align: center; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; }

/* 散点图 */
.scatter-container { margin-bottom: 1rem; }
.brand-headers { display: flex; border: 1px solid var(--border); border-bottom: none; border-radius: var(--radius-md) var(--radius-md) 0 0; overflow: hidden; }
.brand-header { flex: 1; text-align: center; padding: 0.5rem 0; font-size: 1.1rem; font-weight: 800; color: #fff; }
.intel-header { background: var(--brand-intel); }
.amd-header { background: var(--brand-amd); }
.scatter-plot { position: relative; height: 2000px; background: var(--bg-secondary); border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--radius-md) var(--radius-md); }

.cpu-dot {
  position: absolute; width: 12px; height: 12px; background: var(--accent);
  border-radius: 50%; transform: translate(-50%, -50%); cursor: pointer; z-index: 10;
  box-shadow: 0 0 6px var(--highlight-border); transition: transform var(--anim-fast), box-shadow var(--anim-fast);
}
.cpu-dot:active {
  transform: translate(-50%, -50%) scale(0.85);
  background: var(--accent);
  box-shadow: 0 0 12px var(--highlight-border);
  transition: transform 0.08s, background 0.08s;
}
.cpu-dot::before {
  content: ''; position: absolute; left: -6px; top: -12px; width: 130px; height: 30px;
  background: transparent; border-radius: var(--radius-sm);
}
.cpu-dot.hollow { background: transparent; border: 2px solid var(--accent); box-shadow: 0 0 4px var(--highlight-border); }
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
.col-divider { display: none; }
.brand-divider { position: absolute; top: 0; bottom: 0; width: 6px; opacity: 0.8; z-index: 3; transform: translateX(-50%); }

/* 移动端双列天梯 */
.tier-mobile { display: none; }

/* ─── 移动端行式布局（新增） ─── */
.tier-2col { display: block; margin-top: 0.5rem; }
.tier-row { display: flex; align-items: stretch; }
.tier-row .tier-col { flex: 1; display: flex; flex-direction: column; }
.tier-empty-cell { min-height: 28px; }
.tier-header-row .tier-brand {
  text-align: center; font-size: 0.85rem; font-weight: 800;
  padding: 0.4rem 0; color: #fff !important;
}
.tier-header-row .tier-brand.intel { background: var(--brand-intel); }
.tier-header-row .tier-brand.amd { background: var(--brand-amd); }
.tier-header-row .tier-brand.nvidia { background: var(--brand-nvidia); }
.tier-item-group { display: flex; flex-direction: column; }
.tier-item {
  display: flex; align-items: center; padding: 0.2rem 0; min-height: 22px; gap: 0.6rem;
  cursor: pointer;
}
.tier-item:active {
  transform: scale(0.96);
  background: var(--value-gold-bg);
  transition: transform 0.06s, background 0.06s;
}

/* 跑分表格 */
.score-dimension-switch { display: flex; gap: var(--space-sm); margin-bottom: 1rem; }
.dim-btn {
  padding: 0.4rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer;
}
.dim-btn.active {
  background: transparent;
  border-color: var(--accent);
  color: var(--accent);
}

.spec-col {
  width: auto; white-space: nowrap; text-align: center; padding: 0.5rem 0.4rem;
  font-weight: 600; color: var(--thead-text); font-size: 0.82rem;
  border-bottom: 1px solid var(--border); background: var(--bg-tertiary);
}
.spec-cell {
  text-align: center; font-size: 0.82rem; color: var(--text-secondary);
  padding: 0.65rem 0.4rem; border-bottom: 1px solid var(--table-divider);
}

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

/* 移动端悬浮按钮 */
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

/* 移动端搜索面板 */
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
.chip-label { color: var(--text-primary); }
.chip-remove-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem; padding: 0; line-height: 1; }
.compare-actions { display: flex; gap: var(--space-sm); }
.action-btn { padding: 0.4rem 0.8rem; border-radius: var(--radius-md); font-size: 0.8rem; cursor: pointer; border: 1px solid var(--border); transition: all var(--anim-fast); }
.action-btn:active { transform: scale(var(--active-scale)); }
.action-btn.clear-btn { background: rgba(128,128,128,0.08); color: var(--text-secondary); }
.action-btn.open-btn { background: var(--accent); color: #000; font-weight: 600; border: none; }

/* 图例 */
.legend-section { margin-top: 1.5rem; padding: 1rem; background: var(--highlight-bg); border-radius: var(--radius-md); }
.unique-title-row { display: flex; align-items: center; gap: 8px; }
.unique-title-row strong { color: var(--accent); }
.legend-items { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
.legend-item { display: flex; gap: 0.5rem; font-size: 0.8rem; }
.dot-legend { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; }
.dot-legend.filled { background: var(--accent); }
.dot-legend.hollow { background: transparent; border: 2px solid rgba(255,255,255,0.5); }
.dot-legend.bench { background: transparent; border: 1px dashed var(--accent); }

/* 品牌色 */
.brand-intel { color: var(--brand-intel); }
.brand-amd { color: var(--brand-amd); }

/* 全屏遮罩 */
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

/* Tooltip */
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
  z-index: 50;   /* ★ 确保浮在圆点之上，不被遮挡 */
}
.tooltip-name { font-weight: 600; color: var(--accent); }
.tooltip-pct { font-family: 'JetBrains Mono', monospace; }

/* 被选中的圆点：放大、发光、浮在遮罩之上 */
.cpu-dot.is-searched {
  z-index: 20 !important;
  transform: translate(-50%, -50%) scale(1.5);
  background: var(--accent);
  box-shadow: 0 0 12px 4px var(--highlight-border);
  border: 2px solid #fff;
}

/* 移动端被选中的行高亮 */
.tier-item.is-searched {
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  z-index: 20;
  position: relative;
}
/* ═══════════ 桌面端跑分表格列宽微调（仅桌面端） ═══════════ */
.rank-col {
  width: 20px;        /* ★ 排名列宽度 */
  min-width: 10px;
}
.model-col {
  width: 180px;       /* ★ 型号列宽度 */
  min-width: 140px;
}
.spec-col {
  width: 80px;        /* ★ 参数列宽度（核心/线程、频率、三缓） */
  min-width: 70px;
}
.value-cell {
  width: 75px;        /* ★ 跑分/功耗数值列宽度 */
  min-width: 60px;
}
.col-spacer {
  width: 50px;        /* ★ 分隔空列宽度，控制三大块间距 */
}
.spacer-cell {
  padding: 0 !important;
  background: transparent !important;
  pointer-events: none;
}
/* 表格行高亮 */
tr.is-searched {
  background: rgba(255, 215, 0, 0.15) !important;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  z-index: 10;
  position: relative;
}

/* 响应式 */
@media (max-width: 768px) {
  .score-table .rank-col { width: 12%; }
  .score-table .model-col { width: 40%; }
  .score-table .value-col { width: 24%; }
  .tabs { justify-content: center; width: 100%; }
  .tab-btn { flex: 1; text-align: center; padding: 0.4rem; font-size: 0.8rem; }
    .top-bar-dual { flex-direction: column; max-width: none; min-width: 0; width: 100%; }
  .search-compare-row { display: none; }
  .scatter-container { display: none; }
  .tier-mobile { display: block; }
}
.desktop-only { display: inline; }
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
.sort-icon:hover {
  background: var(--brand-border-strong);
}
.sort-icon:active {
  transform: scale(0.9);
}
/* 完整竖线，仅覆盖数据行区域 */
.tier-2col {
  position: relative;
}
.tier-2col::after {
  content: '';
  position: absolute;
  top: 35px;   /* ★ 表头行高度，竖线从这里开始，可微调 */
  bottom: 0;
  left: calc(50% - 2px);
  width: 4px;
  background: linear-gradient(to top, var(--value-red-text), var(--value-cyan-text), var(--value-gold-text));
  z-index: 0;
  pointer-events: none;
}
/* ═══════════ 桌面端：搜索·对比整合悬浮面板 ═══════════ */
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
  justify-content: center;
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

@media (min-width: 769px) {
  .mobile-search-overlay {
    align-items: flex-end;        /* 贴屏幕底边 */
    justify-content: center;      /* 水平居中 */
  }
  .mobile-search-sheet {
    border-radius: 20px 20px 0 0; /* 底部直角，和移动端一致 */
    max-width: 480px;
    width: 90%;
    margin: 0 auto;
  }
}
</style>