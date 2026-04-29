<template>
  <div class="tier-page">
    <!-- 顶部区域：Tab切换 + 轮播图 -->
    <div class="top-bar">
      <div class="tabs">
        <button class="tab-btn" :class="{ active: isGameMode }" @click="switchMode('game')">
          🎮 游戏性能
        </button>
        <button class="tab-btn" :class="{ active: !isGameMode }" @click="switchMode('multi')">
          ⚡ 多核性能
        </button>
      </div>

      <div class="top-bar-spacer"></div>

      <!-- 顶部轮播图（与CPU榜共用数据） -->
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
            class="dot-btn numbered"
            :aria-label="`切换到第${idx + 1}张`"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </a>
    </div>

    <!-- CPU 天梯图内容（游戏/多核） -->
    <div class="tier-content">
      <!-- 搜索栏 + 对比栏（同行） -->
      <div class="top-bar">
        <div class="search-bar" @focusout="onSearchBlur">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="'🔍 搜索型号'"
            @input="onSearchInput"
            @focus="onSearchFocus"
            @keyup.enter="jumpToFirstMatch"
          />
          <!-- +对比按钮常驻右边 -->
          <button
            class="search-action-btn add-compare-btn"
            :class="{ disabled: !selectedSearchCpu }"
            :disabled="!selectedSearchCpu"
            @click="addSearchSelectedToCompare"
            title="添加到对比"
          >
            +对比
          </button>
          <!-- 选中状态：显示清除按钮 -->
          <button
            v-if="selectedSearchCpu"
            class="search-action-btn clear-btn"
            @click="clearSearchSelection"
            title="清除选中"
          >
            ✕
          </button>
          <span v-else-if="!showSearchDropdown" class="search-hint">点击CPU可添加对比</span>
          <!-- 下拉待选列表 -->
          <div
            v-if="showSearchDropdown && searchDropdownItems.length > 0 && !selectedSearchCpu"
            class="search-dropdown"
          >
            <div
              v-for="item in searchDropdownItems"
              :key="item.cpu.id"
              class="search-dropdown-item"
              @mousedown.prevent="onSearchItemClick(item.cpu)"
            >
              <span class="dropdown-brand" :class="item.isIntel ? 'intel' : 'amd'">●</span>
              <span class="dropdown-name">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- 对比栏（占50%，始终显示） -->
        <div class="compare-inline">
          <span class="compare-inline-label">📊 对比</span>
          <!-- 有数据时显示 -->
          <div class="compare-inline-items" v-if="compareList.length > 0">
            <span
              v-for="cpu in compareList"
              :key="cpu.id"
              class="compare-inline-chip"
              :class="{ 'is-benchmark': cpu.id === benchmarkCpu?.id }"
            >
              <span class="chip-brand" :class="isIntelCpu(cpu) ? 'intel' : 'amd'">●</span>
              <span class="chip-name" @click="openBenchModal(cpu)">{{
                formatCpuName(cpu.model)
              }}</span>
              <span class="chip-bench-hint" title="点击设为基准">◎</span>
              <button class="chip-remove" @click.stop="removeFromCompare(cpu)" title="移除">
                ✕
              </button>
            </span>
            <button class="compare-inline-clear" @click="clearCompare" title="清空">清空</button>
            <button class="compare-inline-bench" @click="resetBenchmark" title="重置基准">
              重置
            </button>
          </div>
          <!-- 无数据时显示提示 -->
          <span v-else class="compare-empty-hint">点击CPU查看详情</span>
          <!-- 对标按钮 -->
          <button
            class="compare-bench-btn"
            :class="{ disabled: compareList.length === 0 }"
            :disabled="compareList.length === 0"
            @click="openBenchModal(null)"
            title="对标对比"
          >
            比较
          </button>
        </div>
      </div>

      <!-- 基准提示 -->
      <div class="benchmark-hint">
        <template v-if="benchmarkCpu">
          📌 基准：{{ formatCpuName(benchmarkCpu.model) }} (100%)
        </template>
        <template v-else> ⚠️ 未找到基准CPU </template>
        · 共 {{ cpus.length }} 款CPU · {{ positionedCpus.length }} 个圆点
      </div>

      <!-- DEBUG: 数据加载状态 -->
      <div v-if="cpus.length === 0" class="debug-loading">⏳ 数据加载中...</div>

      <!-- 桌面端散点图 -->
      <div class="scatter-container" ref="scatterContainer" v-if="!isMobile">
        <!-- 品牌表头 -->
        <div class="brand-headers">
          <div class="brand-header intel-header">INTEL</div>
          <div class="brand-header amd-header">AMD</div>
        </div>

        <!-- 散点图画布 -->
        <div class="scatter-plot" ref="scatterPlot">
          <!-- 8列分隔线 -->
          <div class="column-dividers">
            <div v-for="i in 7" :key="i" class="col-divider" :style="getColDividerStyle(i)"></div>
          </div>

          <!-- Intel/AMD 分隔渐变线 -->
          <div class="brand-divider" :style="brandDividerStyle"></div>

          <!-- CPU 圆点 -->
          <div
            v-for="item in positionedCpus"
            :key="item.key"
            class="cpu-dot"
            :class="{
              'is-merged': item.merged && item.cpus.length > 1,
              'is-searched': item.isSearched,
              'is-dimmed': selectedSearchCpu && !item.isSearched,
              intel: item.brand === 'INTEL',
              amd: item.brand === 'AMD',
              hollow: item.isEstimated && isGameMode,
            }"
            :style="{
              left: item.x + '%',
              top: item.y + '%',
            }"
            @click="showDetail(item)"
            @mouseenter="showTooltip(item, $event)"
            @mouseleave="hideTooltip"
          >
            <span class="dot-label">
              {{ item.displayLabel }}
            </span>
          </div>

          <!-- 系列标签 -->
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

          <!-- 基准线 -->
          <div v-if="benchmarkY !== null" class="benchmark-line" :style="{ top: benchmarkY + '%' }">
            <span class="benchmark-line-label">基准 100%</span>
          </div>
        </div>

        <!-- X轴标签 -->
        <div class="x-axis">
          <span
            v-for="col in columnLabels"
            :key="col.key"
            class="x-label"
            :style="{ left: col.x + '%' }"
          >
            {{ col.text }}
          </span>
        </div>
      </div>

      <!-- 移动端列表 -->
      <div class="mobile-list" v-else>
        <div
          v-for="cpu in sortedCpus"
          :key="cpu.id"
          class="cpu-row"
          :class="{
            'is-searched': isCpuSearched(cpu),
            intel: isIntel(cpu),
            amd: isAmd(cpu),
          }"
          @click="showDetailMobile(cpu)"
        >
          <div class="cpu-row-left">
            <span class="brand-dot" :class="isIntel(cpu) ? 'intel' : 'amd'"></span>
            <span class="cpu-row-name">{{ formatCpuName(cpu.model) }}</span>
          </div>
          <div class="cpu-row-right">
            <span class="cpu-row-percent" :class="isIntel(cpu) ? 'intel' : 'amd'">
              {{ getCurrentPercent(cpu) }}%
            </span>
            <button class="compare-btn-small" @click.stop="addSingleToCompare(cpu)">⚖️</button>
          </div>
        </div>
      </div>

        <!-- 游戏模式图例 -->
        <div v-if="isGameMode">
          <div class="unique-title-row">
            <span class="unique-icon">🏆</span>
            <strong>全网独家·原创CPU游戏性能天梯图</strong>
            <span class="unique-badge">实测 + 同架构推算</span>
          </div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="dot-legend filled"></span>
              <div>
                <strong>实心圆点 = 实测型号</strong>
                <p>
                  数据为默认设置下，12款热门游戏实际表现。
                </p>
              </div>
            </div>
            <div class="legend-item">
              <span class="dot-legend hollow"></span>
              <div>
                <strong>空心圆点 = 同架构推算</strong>
                <p>基于同架构性能比例推算（同Die/同核心型号按基准规则换算），误差通常在 ±5% 以内</p>
              </div>
            </div>
            <div class="legend-item">
              <span class="dot-legend bench"></span>
              <div>
                <strong>基准说明</strong>
                <p>以 i5-12490F = 100% 为默认基准，可手动更改；点击型号打开详情对比。</p>
              </div>
            </div>
          </div>
          <p class="unique-disclaimer">
            数据为热门游戏平均表现，不同游戏差距较大。详见<a
              href="https://space.bilibili.com/3546785037420940"
              target="_blank"
              rel="noopener"
              >B站测试视频</a
            >。
          </p>
        </div>

        <!-- 多核模式图例 -->
        <div v-else>
          <div class="unique-title-row">
            <span class="unique-icon">⚡</span>
            <strong>CPU多核性能天梯图</strong>
          </div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="dot-legend bench"></span>
              <div>
                <strong>基准说明</strong>
                <p>以 i5-12490F = 100% 为默认基准，可手动更改；点击型号打开详情对比。</p>
              </div>
            </div>
            <div class="legend-item">
              <span class="dot-legend hollow"></span>
              <div>
                <strong>说明</strong>
                <p>基于Cinebench R23/R24多核跑分推算，代表 CPU 渲染、编译、转码等满载生产力性能</p>
              </div>
            </div>
          </div>
          <p class="unique-disclaimer">
            注：轻度生产效率请参考游戏天梯图或CPU单核性能。
          </p>
        </div>
      </div>
    </div>

    <!-- 悬浮 Tooltip -->
    <div v-if="tooltip.visible" class="cpu-tooltip" :style="tooltip.style">
      <div class="tooltip-title">{{ tooltip.title }}</div>
      <div class="tooltip-game-pct">{{ tooltip.percent }}</div>
      <div class="tooltip-bench">
        基准：{{ benchmarkCpu ? formatCpuName(benchmarkCpu.model) : 'i5-12490F' }}
      </div>
      <div v-if="tooltip.estimated && isGameMode" class="tooltip-estimated">(推算)</div>
    </div>

    <!-- CPU 详情弹窗 -->
    <div v-if="detailModal.show" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content detail-modal" @click.stop>
        <div
          class="modal-header"
          :class="isIntelCpu(detailModal.cpu) ? 'header-intel' : 'header-amd'"
        >
          <span class="modal-title">
            {{
              detailModal.mergedCpus.length > 1
                ? getDisplayLabel(detailModal.mergedCpus)
                : formatCpuName(detailModal.cpu?.model || '')
            }}
            <span class="modal-bench-inline"
              >（基准：{{ benchmarkCpu ? formatCpuName(benchmarkCpu.model) : '12490F' }}）</span
            >
            <span
              v-if="detailModal.cpu"
              class="data-source-tag"
              :class="detailModal.cpu.isEstimated ? 'tag-estimated' : 'tag-tested'"
            >
              {{ detailModal.cpu.isEstimated ? '同架构推算' : '实测数据' }}
            </span>
          </span>
          <button class="modal-close" @click="closeDetailModal">✕</button>
        </div>
        <div class="modal-body">
          <template v-if="detailModal.mergedCpus.length > 1">
            <table class="compare-table single-table">
              <thead>
                <tr>
                  <th></th>
                  <th
                    v-for="cpu in detailModal.mergedCpus"
                    :key="cpu.id"
                    class="cpu-col"
                    :class="[
                      isIntelCpu(cpu) ? 'intel' : 'amd',
                      { 'is-benchmark': cpu.id === benchmarkCpu?.id },
                    ]"
                    @click="toggleBenchmark(cpu)"
                  >
                    {{ formatCpuName(cpu.model) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-cell highlight-row">游戏性能</td>
                  <td
                    v-for="cpu in detailModal.mergedCpus"
                    :key="cpu.id"
                    class="value-cell highlight-row"
                    :class="[
                      isIntelCpu(cpu) ? 'intel' : 'amd',
                      { 'is-benchmark': cpu.id === benchmarkCpu?.id },
                    ]"
                  >
                    {{ getPerformancePercent(cpu) }}%
                  </td>
                </tr>
                <tr class="striped">
                  <td class="label-cell">多核性能</td>
                  <td
                    v-for="cpu in detailModal.mergedCpus"
                    :key="cpu.id"
                    class="value-cell"
                    :class="[
                      isIntelCpu(cpu) ? 'intel' : 'amd',
                      { 'is-benchmark': cpu.id === benchmarkCpu?.id },
                    ]"
                  >
                    {{ getMultiPercent(cpu) }}%
                  </td>
                </tr>
                <tr v-for="(row, idx) in detailRows" :key="idx" :class="{ striped: idx % 2 === 1 }">
                  <td class="label-cell">{{ row.label }}</td>
                  <td
                    v-for="cpu in detailModal.mergedCpus"
                    :key="cpu.id"
                    class="value-cell"
                    :class="{ 'is-benchmark': cpu.id === benchmarkCpu?.id }"
                  >
                    {{ getSpecValue(cpu, row.key) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
          <template v-else>
            <table class="compare-table single-table">
              <thead>
                <tr>
                  <th></th>
                  <th
                    class="cpu-col"
                    :class="[
                      isIntelCpu(detailModal.cpu) ? 'intel' : 'amd',
                      { 'is-benchmark': detailModal.cpu?.id === benchmarkCpu?.id },
                    ]"
                    @click="toggleBenchmark(detailModal.cpu)"
                  >
                    {{ detailModal.cpu ? formatCpuName(detailModal.cpu.model) : '' }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-cell highlight-row">游戏性能</td>
                  <td
                    class="value-cell highlight-row"
                    :class="[
                      isIntelCpu(detailModal.cpu) ? 'intel' : 'amd',
                      { 'is-benchmark': detailModal.cpu?.id === benchmarkCpu?.id },
                    ]"
                  >
                    {{ detailModal.cpu ? getPerformancePercent(detailModal.cpu) : 0 }}%
                  </td>
                </tr>
                <tr class="striped">
                  <td class="label-cell">多核性能</td>
                  <td
                    class="value-cell"
                    :class="[
                      isIntelCpu(detailModal.cpu) ? 'intel' : 'amd',
                      { 'is-benchmark': detailModal.cpu?.id === benchmarkCpu?.id },
                    ]"
                  >
                    {{ detailModal.cpu ? getMultiPercent(detailModal.cpu) : 0 }}%
                  </td>
                </tr>
                <tr v-for="(row, idx) in detailRows" :key="idx" :class="{ striped: idx % 2 === 0 }">
                  <td class="label-cell">{{ row.label }}</td>
                  <td
                    class="value-cell"
                    :class="{ 'is-benchmark': detailModal.cpu?.id === benchmarkCpu?.id }"
                  >
                    {{ detailModal.cpu ? getSpecValue(detailModal.cpu, row.key) : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
        <div class="modal-footer">
          <button
            class="modal-btn bench-toggle"
            :class="{ active: detailModal.cpu?.id === benchmarkCpu?.id }"
            @click="toggleBenchmark(detailModal.cpu)"
          >
            {{ detailModal.cpu?.id === benchmarkCpu?.id ? '取消基准' : '设为基准CPU' }}
          </button>
          <button
            class="modal-btn secondary"
            :class="{ disabled: isInCompare(detailModal.cpu) }"
            @click="addDetailToCompare"
          >
            {{ isInCompare(detailModal.cpu) ? '已在对比' : '添加到对比栏' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 比较弹窗 -->
    <div v-if="benchModal.show" class="modal-overlay" @click="closeBenchModal">
      <div class="modal-content bench-modal" @click.stop>
        <div class="modal-header header-gold">
          <span class="modal-title"
            >📊 比较（基准：{{
              benchmarkCpu ? formatCpuName(benchmarkCpu.model) : '12490F'
            }}）</span
          >
          <button class="modal-close" @click="closeBenchModal">✕</button>
        </div>
        <div class="modal-body bench-modal-body">
          <!-- 方案E脉冲动画：首次打开CPU列头闪金色边框 -->
          <table v-if="compareList.length > 0" class="compare-table bench-table">
            <thead>
              <tr>
                <th></th>
                <th
                  v-for="cpu in compareList"
                  :key="cpu.id"
                  class="cpu-col clickable"
                  :class="[
                    isIntelCpu(cpu) ? 'intel' : 'amd',
                    { 'is-benchmark': cpu.id === benchmarkCpu?.id },
                  ]"
                  @click="toggleBenchmark(cpu)"
                >
                  {{ formatCpuName(cpu.model)
                  }}<span class="bench-hint-icon" title="点击设为基准">◎</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-cell highlight-row">游戏性能</td>
                <td
                  v-for="cpu in compareList"
                  :key="cpu.id"
                  class="value-cell highlight-row"
                  :class="[
                    isIntelCpu(cpu) ? 'intel' : 'amd',
                    { 'is-benchmark': cpu.id === benchmarkCpu?.id },
                  ]"
                >
                  {{ getPerformancePercent(cpu) }}%
                </td>
              </tr>
              <tr class="striped">
                <td class="label-cell">多核性能</td>
                <td
                  v-for="cpu in compareList"
                  :key="cpu.id"
                  class="value-cell"
                  :class="[
                    isIntelCpu(cpu) ? 'intel' : 'amd',
                    { 'is-benchmark': cpu.id === benchmarkCpu?.id },
                  ]"
                >
                  {{ getMultiPercent(cpu) }}%
                </td>
              </tr>
              <tr v-for="(row, idx) in detailRows" :key="idx" :class="{ striped: idx % 2 === 0 }">
                <td class="label-cell">{{ row.label }}</td>
                <td
                  v-for="cpu in compareList"
                  :key="cpu.id"
                  class="value-cell"
                  :class="{ 'is-benchmark': cpu.id === benchmarkCpu?.id }"
                >
                  {{ getSpecValue(cpu, row.key) }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="bench-empty">对比栏为空，点击圆点添加到对比</div>
        </div>
        <!-- 方案D底部提示：首次未点击过显示，点击可关闭 -->
        <div class="modal-footer" v-if="compareList.length > 0">
          <button class="modal-btn" @click="resetBenchmark">重置基准</button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '@/lib/supabase'
import { carouselItems, AUTO_PLAY_INTERVAL, getDefaultCarouselIndex } from '@/data/carousel'

// ============== 类型定义 ==============
interface Cpu {
  id: number
  model: string
  abs_game_performance: number
  abs_multi_performance: number
  cores: string
  threads: number
  base_freq: number
  boost_freq: number
  tdp: number
  new_price: number | null
  used_price: number | null
  isEstimated?: boolean
}

interface PositionedCpu {
  key: string
  cpus: Cpu[]
  displayLabel: string
  brand: 'INTEL' | 'AMD'
  column: number
  score: number
  x: number
  y: number
  xOffset: number
  merged: boolean
  isSearched: boolean
  isEstimated: boolean
}

interface SeriesLabel {
  key: string
  brand: 'INTEL' | 'AMD'
  text: string
  x: number
  y: number
  cpu?: CpuItem
}

// ============== 常量 ==============
// Tab切换已移除，只保留CPU游戏性能
// 列配置 [colIndex, 系列名, 品牌, 通道宽度]
const COLUMNS = [
  { idx: 0, series: 'Core i3 / Ultra 200', brand: 'INTEL', prefix: ['i3', 'Ultra 200', 'Ultra'] },
  { idx: 1, series: 'Core i5', brand: 'INTEL', prefix: ['i5'] },
  { idx: 2, series: 'Core i7', brand: 'INTEL', prefix: ['i7'] },
  { idx: 3, series: 'Core i9', brand: 'INTEL', prefix: ['i9'] },
  { idx: 4, series: 'Ryzen 9', brand: 'AMD', prefix: ['R9', 'Ryzen 9'] },
  { idx: 5, series: 'Ryzen 7', brand: 'AMD', prefix: ['R7', 'Ryzen 7'] },
  { idx: 6, series: 'Ryzen 5', brand: 'AMD', prefix: ['R5', 'Ryzen 5'] },
  { idx: 7, series: 'Ryzen 3', brand: 'AMD', prefix: ['R3', 'Ryzen 3'] },
]

// ============== 响应式状态 ==============
// Tab已移除，默认游戏模式
const cpus = ref<Cpu[]>([])
const searchQuery = ref('')
const searchMatchCount = ref(0)
const showSearchDropdown = ref(false)
const compareExpanded = ref(false)
const isMobile = ref(false)
const scatterContainer = ref<HTMLElement | null>(null)
const scatterPlot = ref<HTMLElement | null>(null)

// 游戏模式独立状态
const gameState = reactive({
  benchmarkCpu: null as Cpu | null,
  compareList: [] as Cpu[],
  selectedSearchCpu: null as Cpu | null,
})

// 多核模式独立状态
const multiState = reactive({
  benchmarkCpu: null as Cpu | null,
  compareList: [] as Cpu[],
  selectedSearchCpu: null as Cpu | null,
})

// 模式切换（游戏/多核）
const isGameMode = ref(true)

function switchMode(mode: 'game' | 'multi') {
  if (mode === 'game' && !isGameMode.value) {
    isGameMode.value = true
  } else if (mode === 'multi' && isGameMode.value) {
    isGameMode.value = false
  }
}

const benchmarkCpu = computed({
  get: () => (isGameMode.value ? gameState.benchmarkCpu : multiState.benchmarkCpu),
  set: (v) => {
    if (isGameMode.value) gameState.benchmarkCpu = v
    else multiState.benchmarkCpu = v
  },
})

const compareList = computed({
  get: () => (isGameMode.value ? gameState.compareList : multiState.compareList),
  set: (v) => {
    if (isGameMode.value) gameState.compareList = v
    else multiState.compareList = v
  },
})

const selectedSearchCpu = computed({
  get: () => (isGameMode.value ? gameState.selectedSearchCpu : multiState.selectedSearchCpu),
  set: (v) => {
    if (isGameMode.value) gameState.selectedSearchCpu = v
    else multiState.selectedSearchCpu = v
  },
})

const detailModal = ref({
  show: false,
  cpu: null as Cpu | null,
  mergedCpus: [] as Cpu[],
})

const benchModal = ref({
  show: false,
})

const tooltip = ref({
  visible: false,
  title: '',
  percent: 0,
  estimated: false,
  style: {} as Record<string, string>,
})

// ============== 轮播图 ==============
// carouselItems, AUTO_PLAY_INTERVAL, getDefaultCarouselIndex 从 '@/data/carousel' 导入
// 默认显示最新的3个（数组最后3个）
const currentIndex = ref(getDefaultCarouselIndex())
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

const startAutoPlay = () => {
  stopAutoPlay()
  autoPlayTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % carouselItems.length
  }, AUTO_PLAY_INTERVAL)
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

// ============== 计算属性 ==============
// tabs computed已移除

const sortedCpus = computed(() => {
  return [...cpus.value].sort((a, b) => {
    const scoreA = isGameMode.value ? a.abs_game_performance : a.abs_multi_performance
    const scoreB = isGameMode.value ? b.abs_game_performance : b.abs_multi_performance
    return scoreB - scoreA
  })
})

// 搜索下拉列表
const searchDropdownItems = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 1) return []
  const q = searchQuery.value.toLowerCase()
  return cpus.value
    .filter((c) => c.model.toLowerCase().includes(q))
    .slice(0, 8)
    .map((c) => ({
      cpu: c,
      label: formatCpuName(c.model),
      pct: getCurrentPercent(c),
      isIntel: isIntelCpu(c),
    }))
})

// 分数范围（根据模式不同）
const scoreRange = computed(() => {
  return isGameMode.value ? { min: 3000, max: 15000 } : { min: 5000, max: 50000 }
})

// 基准分数
const benchmarkScore = computed(() => {
  if (!benchmarkCpu.value) return isGameMode.value ? 5000 : 15000
  return isGameMode.value
    ? benchmarkCpu.value.abs_game_performance
    : benchmarkCpu.value.abs_multi_performance
})

// 基准Y位置
const benchmarkY = computed(() => {
  if (!cpus.value.length) return null
  return getY(benchmarkScore.value)
})

// Y轴公式：四档等分，3000→100%, 4500→75%, 6000→50%, 8500→25%, 15000→0%
function scoreToY(score: number): number {
  if (score <= 3000) return 100
  if (score >= 15000) return 0
  if (score <= 4500) return 100 - ((score - 3000) / 1500) * 25 // 3000-4500, 占25%
  if (score <= 6000) return 75 - ((score - 4500) / 1500) * 25 // 4500-6000, 占25%
  if (score <= 8500) return 50 - ((score - 6000) / 2500) * 25 // 6000-8500, 占25%
  return 25 - ((score - 8500) / 6500) * 25 // 8500-15000, 占25%
}

// 多核Y轴公式：5000→100%, 10000→75%, 18000→50%, 28000→25%, 50000→0%
function multiScoreToY(score: number): number {
  if (score <= 5000) return 100
  if (score >= 50000) return 0
  if (score <= 10000) return 100 - ((score - 5000) / 5000) * 25 // 5000-10000, 占25%
  if (score <= 18000) return 75 - ((score - 10000) / 8000) * 25 // 10000-18000, 占25%
  if (score <= 28000) return 50 - ((score - 18000) / 10000) * 25 // 18000-28000, 占25%
  return 25 - ((score - 28000) / 22000) * 25 // 28000-50000, 占25%
}

// 统一Y轴计算（根据模式选择）
function getY(score: number): number {
  return isGameMode.value ? scoreToY(score) : multiScoreToY(score)
}

// 确定CPU属于哪个列（大小写不敏感）
function getColumn(cpu: Cpu): number {
  const m = cpu.model.toUpperCase()

  // Intel Ultra 系列 → i3 列
  if (m.includes('ULTRA')) return 0

  // Intel Core i3/i5/i7/i9
  if (m.includes('INTEL')) {
    if (m.includes('I9')) return 3
    if (m.includes('I7')) return 2
    if (m.includes('I5')) return 1
    if (m.includes('I3')) return 0
    return 1 // 默认i5列
  }

  // AMD Ryzen 系列 — 只用系列名匹配，数字型号会误判（如9600X是R5不是R9）
  if (m.includes('AMD')) {
    if (m.includes('RYZEN 9') || m.includes('R9')) return 4
    if (m.includes('RYZEN 7') || m.includes('R7')) return 5
    if (m.includes('RYZEN 5') || m.includes('R5')) return 6
    if (m.includes('RYZEN 3') || m.includes('R3')) return 7
    return 6 // 默认R5列
  }

  return 1
}

// 判断CPU品牌
function getBrand(cpu: Cpu): 'INTEL' | 'AMD' {
  return cpu.model.toUpperCase().includes('INTEL') ? 'INTEL' : 'AMD'
}

// 获取CPU分数
function getScore(cpu: Cpu): number {
  return isGameMode.value ? cpu.abs_game_performance : cpu.abs_multi_performance
}

// 合并逻辑：同核心+不同尾缀+分数差≤2%
function mergeCpus(cpuList: Cpu[]): { groups: Cpu[][]; singles: Cpu[] } {
  if (cpuList.length === 0) return { groups: [], singles: [] }

  const sorted = [...cpuList].sort((a, b) => getScore(b) - getScore(a))
  const used = new Set<number>()
  const groups: Cpu[][] = []

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue

    const group: Cpu[] = [sorted[i]]
    used.add(sorted[i].id)

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].id)) continue

      const cpu1 = group[0]
      const cpu2 = sorted[j]

      // 检查是否同核心（去掉尾缀比较）
      const core1 = stripSuffix(cpu1.model)
      const core2 = stripSuffix(cpu2.model)

      if (core1 === core2) {
        const diff = (Math.abs(getScore(cpu1) - getScore(cpu2)) / getScore(cpu1)) * 100
        if (diff <= 2) {
          group.push(cpu2)
          used.add(cpu2.id)
        }
      }
    }

    if (group.length > 1) {
      groups.push(group)
    }
  }

  const singles = sorted.filter((c) => !used.has(c.id))
  return { groups, singles }
}

// 去掉尾缀获取核心型号
function stripSuffix(model: string): string {
  // 先分离末尾的Plus/Non-X等修饰词
  let cleanModel = model
  let trailingWord = ''
  const plusMatch = cleanModel.match(/\s+(Plus)$/i)
  if (plusMatch) {
    trailingWord = plusMatch[1]
    cleanModel = cleanModel.replace(/\s+Plus$/i, '')
  }
  // 去掉后缀 K/KF/F/X3D 等
  cleanModel = cleanModel
    .replace(/(X3D|KF|KS|K|F|GE?|X|3D)$/i, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
  // 恢复修饰词
  return trailingWord ? cleanModel + ' ' + trailingWord : cleanModel
}

// 生成分组标签：11600K/KF, 12400/F, 5800X/X3D, Ultra 5 250K/KF Plus
function getDisplayLabel(cpus: Cpu[]): string {
  if (cpus.length === 1) return formatCpuName(cpus[0].model)

  // 分离末尾修饰词(Plus等)和技术后缀(K/KF/F/X3D等)
  const parts = cpus.map((c) => {
    // 先分离Plus等修饰词
    let name = c.model
    let trailingWord = ''
    const plusMatch = name.match(/\s+(Plus)$/i)
    if (plusMatch) {
      trailingWord = plusMatch[1]
      name = name.replace(/\s+Plus$/i, '')
    }
    // 匹配技术后缀
    const match = name.match(/(X3D|KF|KS|K|F|GE?|X|3D)$/i)
    const suffix = match ? match[1] : ''
    const base = name
      .replace(/(X3D|KF|KS|K|F|GE?|X|3D)$/i, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim()
    return { base, suffix, trailingWord }
  })

  const numBase = parts[0].base
  const allSuffixes = parts.map((p) => p.suffix)
  // 如果所有都有相同的trailingWord（如Plus），保留
  const trailingWords = parts.map((p) => p.trailingWord)
  const allSameTrailing = trailingWords.every((t) => t === trailingWords[0])
  const commonTrailing = allSameTrailing ? trailingWords[0] : ''

  // 找技术后缀的公共前缀（如 K 是 K 和 KF 的公共前缀）
  const commonPrefix = allSuffixes.reduce((acc, suf) => {
    let i = 0
    while (i < acc.length && i < suf.length && acc[i] === suf[i]) i++
    return acc.substring(0, i)
  })

  // 显示base = 数字base + 公共前缀（如 Ultra 5 250K）
  const displayBase = formatCpuName(numBase + commonPrefix)

  // 拼接后缀差异部分
  const parts2 = [displayBase]
  for (let i = 0; i < allSuffixes.length; i++) {
    const fullSuffix = allSuffixes[i]
    if (fullSuffix !== commonPrefix) {
      parts2.push(fullSuffix)
    }
  }

  // 加上公共修饰词（如 Plus）
  const result = parts2.join('/') + (commonTrailing ? ' ' + commonTrailing : '')
  return result
}

// 计算每个通道内已使用的Y位置（用于避免重叠）
function buildPositionedCpus(): PositionedCpu[] {
  if (!cpus.value.length) return []

  const result: PositionedCpu[] = []

  // 按列分组
  const colCpus: Map<number, Cpu[]> = new Map()
  for (let i = 0; i < 8; i++) colCpus.set(i, [])

  for (const cpu of cpus.value) {
    const col = getColumn(cpu)
    if (colCpus.has(col)) {
      colCpus.get(col)!.push(cpu)
    }
  }

  // 处理每列
  for (const [colIdx, cpuList] of colCpus.entries()) {
    if (cpuList.length === 0) continue

    // 按分数降序排列
    const sorted = [...cpuList].sort((a, b) => getScore(b) - getScore(a))

    // 简单合并：同核心+不同尾缀+分数差<=2%
    const processed = new Set<number>()
    const items: { cpus: Cpu[]; merged: boolean }[] = []

    for (let i = 0; i < sorted.length; i++) {
      if (processed.has(i)) continue

      const group: Cpu[] = [sorted[i]]
      processed.add(i)

      for (let j = i + 1; j < sorted.length; j++) {
        if (processed.has(j)) continue

        const core1 = stripSuffix(sorted[i].model)
        const core2 = stripSuffix(sorted[j].model)

        if (core1 === core2) {
          const diff =
            (Math.abs(getScore(sorted[i]) - getScore(sorted[j])) / getScore(sorted[i])) * 100
          if (diff <= 2) {
            group.push(sorted[j])
            processed.add(j)
          }
        }
      }

      items.push({ cpus: group, merged: group.length > 1 })
    }

    // 分配Y位置，避免重叠
    const usedYs: number[] = []
    const minSpacing = 0.9 // 最小间距百分比（2000px高度下约18px）

    for (const item of items) {
      const score = getScore(item.cpus[0])
      const rawY = getY(score)

      // 找到不重叠的Y位置
      let finalY = rawY
      let attempts = 0

      while (attempts < 30) {
        const overlapped = usedYs.some((uy) => Math.abs(uy - finalY) < minSpacing)
        if (!overlapped) break
        finalY = rawY + (attempts % 2 === 0 ? 1 : -1) * (Math.floor(attempts / 2) + 1) * minSpacing
        attempts++
      }

      // 限制范围
      finalY = Math.max(0.5, Math.min(99.5, finalY))
      usedYs.push(finalY)

      const brand = getBrand(item.cpus[0])
      const isSearched = item.cpus.some((c) => isCpuSearched(c))

      result.push({
        key: item.cpus.map((c) => String(c.id)).join('-'),
        cpus: item.cpus,
        displayLabel: getDisplayLabel(item.cpus),
        brand,
        column: colIdx,
        score,
        x: (colIdx + 0.3) * (100 / 8), // 靠左，给右侧标签留空间
        y: finalY,
        xOffset: 0,
        merged: item.merged,
        isSearched,
        isEstimated: item.cpus.some((c) => c.isEstimated),
      })
    }
  }

  return result
}

const positionedCpus = computed(() => buildPositionedCpus())

// 系列标签
const seriesLabels = computed((): SeriesLabel[] => {
  const labels: SeriesLabel[] = []

  for (const col of COLUMNS) {
    const colCpus = cpus.value.filter((c) => getColumn(c) === col.idx)
    if (colCpus.length === 0) continue

    const maxScoreCpu = colCpus.reduce((best, cpu) => (getScore(cpu) > getScore(best) ? cpu : best))

    // 获取该CPU的Y位置
    const y = getY(getScore(maxScoreCpu))

    // Ultra 200 系列标签（如果i3列有Ultra芯片）
    if (col.idx === 0) {
      const ultraCpus = colCpus.filter(
        (c) =>
          c.model.toUpperCase().includes('ULTRA') || c.model.toUpperCase().includes('CORE ULTRA'),
      )
      const coreI3Cpus = colCpus.filter((c) => !c.model.toUpperCase().includes('ULTRA'))

      if (coreI3Cpus.length > 0) {
        const coreCpu = coreI3Cpus.reduce((best, cpu) =>
          getScore(cpu) > getScore(best) ? cpu : best,
        )
        const coreY = getY(getScore(coreCpu))
        labels.push({
          key: 'core-i3',
          brand: 'INTEL',
          text: 'Core i3',
          x: (col.idx + 0.5) * (100 / 8),
          y: coreY - 3,
          cpu: coreCpu,
        })
      }

      if (ultraCpus.length > 0) {
        const ultraCpu = ultraCpus.reduce((best, cpu) =>
          getScore(cpu) > getScore(best) ? cpu : best,
        )
        const ultraY = getY(getScore(ultraCpu))
        labels.push({
          key: 'ultra-200',
          brand: 'INTEL',
          text: 'Ultra 200',
          x: (col.idx + 0.5) * (100 / 8),
          y: ultraY - 3,
          cpu: ultraCpu,
        })
      }
    } else {
      labels.push({
        key: col.series.replace(/\s/g, '-'),
        brand: col.brand,
        text: col.series,
        x: (col.idx + 0.5) * (100 / 8),
        y: y - 3,
        cpu: maxScoreCpu,
      })
    }
  }

  return labels
})

// X轴标签
const columnLabels = computed(() => {
  return COLUMNS.map((col) => ({
    key: col.series.replace(/\s/g, '-'),
    text: col.series,
    x: (col.idx + 0.5) * (100 / 8),
  }))
})

// 分隔线位置
function getColDividerStyle(i: number): Record<string, string> {
  return { left: (i * 100) / 8 + '%' }
}

// Intel/AMD 分隔线（i9和R9之间，即第4列和第5列之间 = 50%位置）
const brandDividerStyle = computed(() => {
  return {
    left: '50%',
    width: '6px',
    background: 'linear-gradient(to bottom, #22c55e, #eab308, #ef4444)',
    opacity: '0.8',
  }
})

// 详情弹窗数据（带key用于表格渲染）
const detailRows = [
  { label: '核心/线程', key: 'cores_threads' },
  { label: '基础频率', key: 'base_freq' },
  { label: '加速频率', key: 'boost_freq' },
  { label: '功耗 (TDP)', key: 'tdp' },
]

function getSpecValue(cpu: Cpu, key: string): string {
  switch (key) {
    case 'cores_threads':
      return `${cpu.cores} / ${cpu.threads}`
    case 'base_freq':
      return `${cpu.base_freq} GHz`
    case 'boost_freq':
      return `${cpu.boost_freq} GHz`
    case 'tdp':
      return `${cpu.tdp}W`
    default:
      return '-'
  }
}

// ============== 方法 ==============
function getPerformancePercent(cpu: Cpu): number {
  // 始终返回游戏性能百分比（详情弹窗用）
  if (!benchmarkCpu.value) return 0
  const pct = (cpu.abs_game_performance / benchmarkCpu.value.abs_game_performance) * 100
  return Math.round(pct)
}

function getMultiPercent(cpu: Cpu): number {
  // 始终返回多核性能百分比（详情弹窗用）
  if (!benchmarkCpu.value) return 0
  const pct = (cpu.abs_multi_performance / benchmarkCpu.value.abs_multi_performance) * 100
  return Math.round(pct)
}

// 当前模式的百分比（tooltip/标签用）
function getCurrentPercent(cpu: Cpu): number {
  if (!benchmarkCpu.value) return 0
  const pct = (getScore(cpu) / benchmarkScore.value) * 100
  return Math.round(pct)
}

function formatCpuName(model: string): string {
  return model
    .replace(/INTEL\s+CORE\s+/i, '') // "INTEL Core i7-13700K" → "i7-13700K"
    .replace(/ULTRA\s+\d+\s+/i, '') // "Ultra 7 265K" → "265K"
    .replace(/I\d+-/i, '') // "i7-13700K" → "13700K"
    .replace(/AMD\s+RYZEN\s+\d+\s+/i, '') // "AMD Ryzen 7 5800X" → "5800X"
    .replace(/AMD\s+/i, '')
    .trim()
}

// 短型号名：只保留数字部分，如 "INTEL Core i5-13500" → "13500", "AMD Ryzen 7 7800X3D" → "7800X3D"
function shortModelName(model: string): string {
  const m = model.toUpperCase()
  // Intel Ultra: "INTEL Core Ultra 5 225F" → "225F"
  const ultraMatch = m.match(/ULTRA\s*\d+\s+(.+)/)
  if (ultraMatch) return ultraMatch[1].trim()
  // Intel Core: 提取 i3/i5/i7/i9 后面的部分
  const intelMatch = m.match(/I[3579]\s*[-]?\s*(.+)/)
  if (intelMatch) return intelMatch[1].trim()
  // AMD: 提取 Ryzen X 后面的数字部分
  const amdMatch = m.match(/RYZEN\s*\d+\s+(.+)/)
  if (amdMatch) return amdMatch[1].trim()
  // 兜底：去掉品牌名
  return formatCpuName(model)
}

function isIntel(cpu: Cpu): boolean {
  return cpu.model.toUpperCase().includes('INTEL')
}

function isAmd(cpu: Cpu): boolean {
  return cpu.model.toUpperCase().includes('AMD')
}

function isIntelCpu(cpu: Cpu | null): boolean {
  if (!cpu) return false
  return isIntel(cpu)
}

// 实测CPU名单 → 显示为实心圆点（默认空心，名单内为实心）
const TESTED_MODELS = new Set([
  // INTEL 实测
  'INTEL Core i7-14700K',
  'INTEL Core i7-14700KF',
  'INTEL Core i7-12700K',
  'INTEL Core i7-12700KF',
  'INTEL Core i5-14600K',
  'INTEL Core i5-14600KF',
  'INTEL Core i5-13600K',
  'INTEL Core i5-13600KF',
  'INTEL Core i5-12600K',
  'INTEL Core i5-12600KF',
  'INTEL Core i5-13400',
  'INTEL Core i5-13400F',
  'INTEL Core i5-11600K',
  'INTEL Core i5-11600KF',
  'INTEL Core i5-12500',
  'INTEL Core i5-12490F',
  'INTEL Core Ultra 5 265K',
  'INTEL Core Ultra 5 265KF',
  'INTEL Core i3-14100',
  'INTEL Core i3-14000F',
  // AMD 实测
  'AMD Ryzen 9 7900X3D',
  'AMD Ryzen 9 9800X3D',
  'AMD Ryzen 7 7800X3D',
  'AMD Ryzen 7 9700X',
  'AMD Ryzen 7 7700',
  'AMD Ryzen 7 5800',
  'AMD Ryzen 7 5700X',
  'AMD Ryzen 5 7600X3D',
  'AMD Ryzen 5 9600X',
  'AMD Ryzen 5 7600X',
  'AMD Ryzen 5 5500X3D',
  'AMD Ryzen 5 7500F',
  'AMD Ryzen 5 5600X',
  'AMD Ryzen 5 5600',
  'AMD Ryzen 5 5500',
  'AMD Ryzen 3 3600',
  'AMD Ryzen 3 3500X',
  'AMD Ryzen 3 3100',
])

function isHollowModel(model: string): boolean {
  // 逻辑反转：不在实测名单里的显示空心
  return !TESTED_MODELS.has(model)
}

function isCpuSearched(cpu: Cpu): boolean {
  if (!selectedSearchCpu.value) return false
  return cpu.id === selectedSearchCpu.value.id
}

// Tab相关函数已移除

// 加载数据
async function loadCpus() {
  console.log('[TierView] 开始加载CPU数据...')

  const { data, error } = await supabase
    .from('cpu_current')
    .select('*')
    .order('abs_game_performance', { ascending: false })

  if (error) {
    console.error('[TierView] 加载CPU数据失败:', error.message, error.details, error.hint)
    return
  }

  if (!data || data.length === 0) {
    console.warn('[TierView] CPU数据为空！')
    return
  }

  console.log(`[TierView] 加载了 ${data.length} 条CPU数据`)
  console.log(
    '[TierView] 前3条:',
    data.slice(0, 3).map((d) => ({ id: d.id, model: d.model, game: d.abs_game_performance })),
  )

  cpus.value = data.map((cpu) => ({
    ...cpu,
    isEstimated: isHollowModel(cpu.model),
  }))

  // 设置默认基准（两个模式都设置）
  const defaultBench = cpus.value.find((c) => c.model.toUpperCase().includes('12490F'))
  if (defaultBench) {
    gameState.benchmarkCpu = defaultBench
    multiState.benchmarkCpu = defaultBench
    console.log(
      '[TierView] 找到基准CPU:',
      defaultBench.model,
      '游戏分:',
      defaultBench.abs_game_performance,
      '多核分:',
      defaultBench.abs_multi_performance,
    )
  } else {
    console.warn('[TierView] 未找到基准CPU 12490F')
  }

  // 从localStorage恢复对比栏
  loadCompareFromStorage()
}

// 搜索
function onSearchInput() {
  selectedSearchCpu.value = null // 输入新内容时取消选中
  if (!searchQuery.value) {
    searchMatchCount.value = 0
    showSearchDropdown.value = false
    return
  }
  const q = searchQuery.value.toLowerCase()
  const matches = cpus.value.filter((c) => c.model.toLowerCase().includes(q))
  searchMatchCount.value = matches.length
  showSearchDropdown.value = true
}

function onSearchFocus() {
  if (searchQuery.value && !selectedSearchCpu.value) {
    showSearchDropdown.value = true
  }
}

function onSearchBlur() {
  // 延迟关闭，让mousedown事件先触发
  setTimeout(() => {
    showSearchDropdown.value = false
  }, 200)
}

// 点击下拉项 → 选中 + 跳转高亮
function onSearchItemClick(cpu: Cpu) {
  selectedSearchCpu.value = cpu
  searchQuery.value = formatCpuName(cpu.model)
  showSearchDropdown.value = false
  jumpToCpu(cpu)
}

// 跳转到指定CPU
function jumpToCpu(cpu: Cpu) {
  const target = positionedCpus.value.find((item) => item.cpus.some((c) => c.id === cpu.id))
  if (target && scatterContainer.value) {
    const container = scatterContainer.value
    const plotEl = scatterPlot.value
    if (!plotEl) return
    // 计算圆点在页面中的绝对位置
    const plotRect = plotEl.getBoundingClientRect()
    const dotY = (target.y / 100) * plotEl.offsetHeight
    const pageY = plotRect.top + window.scrollY + dotY - window.innerHeight / 2
    window.scrollTo({ top: Math.max(0, pageY), behavior: 'smooth' })
  }
}

// 清除选中
function clearSearchSelection() {
  selectedSearchCpu.value = null
  searchQuery.value = ''
  showSearchDropdown.value = false
}

// 选中CPU添加到对比栏
function addSearchSelectedToCompare() {
  if (!selectedSearchCpu.value) return
  addToCompareCore(selectedSearchCpu.value)
}

// 回车跳转到第一个匹配
function jumpToFirstMatch() {
  if (searchDropdownItems.value.length > 0) {
    onSearchItemClick(searchDropdownItems.value[0].cpu)
  }
}

// Tooltip（CPU圆点）
function showTooltip(item: PositionedCpu, event: MouseEvent) {
  const cpu = item.cpus[0]
  let percentText: string
  if (item.cpus.length > 1) {
    // 合并组：显示每个CPU的百分比，用短标签
    percentText = item.cpus
      .map((c) => {
        const shortName = stripSuffix(c.model)
          .replace(/INTEL\s*CORE\s*/i, '')
          .replace(/AMD\s*RYZEN\s*/i, '')
          .replace(/AMD\s*/i, '')
          .trim()
        const suffix = c.model.match(/(X3D|KF|KS|K|F|GE?|X|3D)$/i)?.[1] || ''
        return (shortName.split(/[-\s]/).pop() || '') + suffix + ':' + getCurrentPercent(c) + '%'
      })
      .join(' / ')
  } else {
    percentText = getCurrentPercent(cpu) + '%'
  }
  tooltip.value = {
    visible: true,
    title: item.displayLabel,
    percent: percentText,
    estimated: item.isEstimated,
    style: {
      position: 'fixed',
      left: event.clientX + 12 + 'px',
      top: event.clientY - 40 + 'px',
    },
  }
}

// Tooltip（系列标签）
function showLabelTooltip(label: SeriesLabel, event: MouseEvent) {
  if (!label.cpu) return
  tooltip.value = {
    visible: true,
    title: formatCpuName(label.cpu.model),
    percent: getCurrentPercent(label.cpu),
    estimated: label.cpu.isEstimated || false,
    style: {
      position: 'fixed',
      left: event.clientX + 12 + 'px',
      top: event.clientY - 40 + 'px',
    },
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

// 详情弹窗
function showDetail(item: PositionedCpu) {
  closeCompare()
  detailModal.value = { show: true, cpu: item.cpus[0], mergedCpus: item.cpus }
}

function showDetailMobile(cpu: Cpu) {
  closeCompare()
  detailModal.value = { show: true, cpu, mergedCpus: [cpu] }
}

function closeDetailModal() {
  detailModal.value = { show: false, cpu: null, mergedCpus: [] }
}

function toggleBenchmark(cpu: Cpu | null | undefined) {
  if (!cpu) return
  if (cpu.id === benchmarkCpu.value?.id) {
    resetBenchmark()
  } else {
    setAsBenchmark(cpu)
  }
}

function showDetailFromCpu(cpu: Cpu) {
  closeCompare()
  detailModal.value = { show: true, cpu, mergedCpus: [cpu] }
}

// 对标弹窗
function openBenchModal(_cpu: Cpu | null) {
  if (compareList.value.length === 0) return
  benchModal.value.show = true
}

function closeBenchModal() {
  benchModal.value.show = false
}

// 单击弹窗的CPU→添加到对比栏
function addDetailToCompare() {
  if (detailModal.value.cpu) {
    addToCompareCore(detailModal.value.cpu)
  }
}

function isInCompare(cpu: Cpu | null): boolean {
  if (!cpu) return false
  return compareList.value.some((c) => c.id === cpu.id)
}

// 对比栏
function addToCompare(item: PositionedCpu) {
  // 添加合并中的所有CPU
  for (const cpu of item.cpus) {
    addToCompareCore(cpu)
  }
}

function addSingleToCompare(cpu: Cpu) {
  addToCompareCore(cpu)
}

function addToCompareCore(cpu: Cpu) {
  if (compareList.value.length >= 4) {
    return
  }
  if (!compareList.value.find((c) => c.id === cpu.id)) {
    compareList.value.push(cpu)
    saveCompareToStorage()
  }
}

function removeFromCompare(cpu: Cpu) {
  compareList.value = compareList.value.filter((c) => c.id !== cpu.id)
  saveCompareToStorage()

  // 如果移除后空了，收起对比栏
  if (compareList.value.length === 0) {
    compareExpanded.value = false
  }
}

function clearCompare() {
  compareList.value = []
  compareExpanded.value = false
  saveCompareToStorage()
}

function setAsBenchmark(cpu: Cpu) {
  benchmarkCpu.value = cpu
  saveCompareToStorage()
}

function resetBenchmark() {
  const defaultBench = cpus.value.find((c) => c.model.toUpperCase().includes('12490F'))
  if (defaultBench) {
    benchmarkCpu.value = defaultBench
    saveCompareToStorage()
  }
}

function toggleCompare() {
  compareExpanded.value = !compareExpanded.value
  if (compareExpanded.value) {
    closeDetailModal()
  }
}

function closeCompare() {
  compareExpanded.value = false
}

// localStorage（两个模式独立存储）
function saveCompareToStorage() {
  // 游戏模式
  const gameData = {
    compareList: gameState.compareList.map((c) => c.id),
    benchmarkId: gameState.benchmarkCpu?.id,
  }
  localStorage.setItem('tier-compare-game', JSON.stringify(gameData))
  // 多核模式
  const multiData = {
    compareList: multiState.compareList.map((c) => c.id),
    benchmarkId: multiState.benchmarkCpu?.id,
  }
  localStorage.setItem('tier-compare-multi', JSON.stringify(multiData))
}

function loadCompareFromStorage() {
  try {
    // 恢复游戏模式
    const gameStored = localStorage.getItem('tier-compare-game')
    if (gameStored) {
      const data = JSON.parse(gameStored)
      if (data.benchmarkId) {
        const bench = cpus.value.find((c) => c.id === data.benchmarkId)
        if (bench) gameState.benchmarkCpu = bench
      }
      if (data.compareList) {
        gameState.compareList = cpus.value.filter((c) => data.compareList.includes(c.id))
      }
    }
    // 恢复多核模式
    const multiStored = localStorage.getItem('tier-compare-multi')
    if (multiStored) {
      const data = JSON.parse(multiStored)
      if (data.benchmarkId) {
        const bench = cpus.value.find((c) => c.id === data.benchmarkId)
        if (bench) multiState.benchmarkCpu = bench
      }
      if (data.compareList) {
        multiState.compareList = cpus.value.filter((c) => data.compareList.includes(c.id))
      }
    }
  } catch (e) {
    // ignore
  }
}

// 检测移动端
function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// ESC关闭弹窗
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeDetailModal()
    closeCompare()
  }
}

// ============== 生命周期 ==============
const injectDatasetSchema = () => {
  const existing = document.querySelector('script[data-jsonld="tier-dataset"]')
  if (existing) existing.remove()
  const today = new Date().toISOString().slice(0, 10)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'CPU游戏性能天梯图（独家）',
    description:
      '全网独家CPU游戏性能天梯图，基于多套统一测试平台实测帧数+同架构性能比例推算。i5-12490F=100%基准，涵盖150+款CPU，包含实测型号和推算型号两类数据。测试环境：1080P / 游戏预设中档画质。',
    url: 'https://www.5vip.top/tier',
    keywords: 'CPU天梯图,CPU游戏性能排行,CPU排行,硬件天梯,实测数据,同架构推算,全网独家',
    creator: { '@type': 'Person', name: '奇魂', url: 'https://www.5vip.top' },
    publisher: { '@type': 'Organization', name: '奇魂的小窝', url: 'https://www.5vip.top' },
    datePublished: '2024-01-01',
    dateModified: today,
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    isBasedOn: {
      '@type': 'CreativeWork',
      name: '测试方法说明',
      description:
        '实测：多套统一测试平台，1080P/游戏预设中档画质，帧数取平均值。数据为热门游戏平均表现，不同游戏差距较大。详见B站测试视频。推算：基于同架构性能比例推算（同Die/同核心型号按基准规则换算），误差通常在 ±5% 以内。',
      url: 'https://www.5vip.top/about#test-methodology',
    },
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: '游戏性能分数',
        description:
          '以i5-12490F=100%为基准。数据为热门游戏平均表现，不同游戏差距较大。详见B站测试视频。',
      },
      { '@type': 'PropertyValue', name: '数据类型', description: '实测（实心圆）或推算（空心圆）' },
    ],
  }
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-jsonld', 'tier-dataset')
  script.textContent = JSON.stringify(schema)
  document.head.appendChild(script)
}

onMounted(() => {
  console.log('[TierView] onMounted, isMobile:', window.innerWidth < 768)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeydown)
  loadCpus()
  startAutoPlay()
  injectDatasetSchema()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeydown)
  stopAutoPlay()
  const old = document.querySelector('script[data-jsonld="tier-dataset"]')
  if (old) old.remove()
})
</script>

<style scoped>
.tier-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 80vh;
  padding-bottom: 280px;
}

/* 顶部区域：Tab切换 + 轮播图 */
.top-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
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

.tab-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 600;
}

.top-bar-spacer {
  flex: 1;
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

/* 数字标记的轮播指示器 */
.dot-btn.numbered {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
}

.dot-btn.numbered.active {
  background: var(--accent);
  color: #000;
  font-weight: 600;
}

.dot-btn.numbered:hover {
  background: rgba(255, 215, 0, 0.5);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 0.8rem;
}

.page-header h1 {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
}

/* 搜索栏 + 对比栏（同行，各占50%） */
.tier-content .top-bar {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
  position: relative;
}

.search-bar input {
  flex: 1;
  padding: 0.6rem 0.9rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.search-bar input::placeholder {
  color: var(--text-secondary);
}

.search-bar input:focus {
  outline: none;
  border-color: var(--accent);
}

/* 搜索选中时的操作按钮 */
.search-action-btn {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
}
.add-compare-btn {
  background: var(--accent);
  color: #000;
}
.add-compare-btn:hover {
  opacity: 0.85;
}
.add-compare-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.clear-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.clear-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* 无选中时的提示文字 */
.search-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  padding: 0 0.5rem;
  pointer-events: none;
}

/* 搜索下拉列表 */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a2e;
  border: 1px solid var(--border);
  border-radius: 0 0 4px 4px;
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
}
.search-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-primary);
}
.search-dropdown-item:hover {
  background: rgba(255, 215, 0, 0.08);
}
.dropdown-brand.intel {
  color: #4a90d9;
}
.dropdown-brand.amd {
  color: #e04040;
}
.dropdown-name {
  flex: 1;
}

/* 同行对比栏（占50%宽度） */
.compare-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.6rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  position: relative;
}

.compare-inline-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.compare-inline-items {
  display: flex;
  gap: 0.3rem;
  flex-wrap: nowrap;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  padding-right: 0.5rem;
}

.compare-inline-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 0.75rem;
  white-space: nowrap;
}

.compare-inline-chip.is-benchmark {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.06);
}

.chip-brand {
  font-size: 0.65rem;
}

.chip-brand.intel {
  color: #3b82f6;
}
.chip-brand.amd {
  color: #ef4444;
}

.chip-name {
  color: var(--text-primary);
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-percent {
  font-weight: 700;
  font-size: 0.75rem;
}

.chip-percent.intel {
  color: #3b82f6;
}
.chip-percent.amd {
  color: #ef4444;
}

.chip-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0 2px;
  line-height: 1;
  min-width: 20px;
  min-height: 20px;
}

.chip-btn:hover {
  color: var(--text-primary);
}

/* chip 内的单独移除按钮 */
.chip-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.65rem;
  padding: 0 1px;
  line-height: 1;
  margin-left: 2px;
  min-width: 16px;
  min-height: 16px;
  border-radius: 50%;
  transition:
    color 0.15s,
    background 0.15s;
}
.chip-remove:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

/* 基准提示符号：◎ 表示可点击设基准 */
.chip-bench-hint {
  font-size: 0.65rem;
  color: rgba(255, 215, 0, 0.35);
  cursor: pointer;
  margin-left: 2px;
  transition: color 0.15s;
  user-select: none;
}
.chip-bench-hint:hover {
  color: rgba(255, 215, 0, 0.8);
}

.compare-inline-clear,
.compare-inline-bench {
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.7rem;
  min-height: 28px;
}

.compare-inline-clear:hover,
.compare-inline-bench:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.compare-empty-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  padding: 0 0.5rem;
}

.compare-inline-clear {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

/* 基准提示 */
.benchmark-hint {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.6rem;
}

.debug-loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 1rem;
}

/* ========== 桌面端散点图 ========== */
.scatter-container {
  position: relative;
  margin-bottom: 1rem;
}

/* 品牌表头 — 与scatter-plot宽度对齐，无圆角 */
.brand-headers {
  display: flex;
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}
.brand-header {
  flex: 1;
  text-align: center;
  padding: 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #fff;
}
.intel-header {
  background: #4a90d9;
}
.amd-header {
  background: #e04040;
}

.scatter-plot {
  position: relative;
  height: 2000px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: visible;
}

/* 列分隔线 */
.column-dividers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.col-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  opacity: 0.4;
}

/* Intel/AMD 分隔渐变线 */
.brand-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  opacity: 0.8;
  pointer-events: none;
  z-index: 3;
  transform: translateX(-50%);
}

/* CPU 圆点 */
.cpu-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ffd700;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.8);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  z-index: 10;
}

/* 扩大点击/悬浮区域 — 长方形覆盖圆点+标签范围 */
.cpu-dot::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -6px;
  width: calc(100% + 80px);
  height: calc(100% + 16px);
  border-radius: 3px;
}

.cpu-dot:hover {
  transform: translate(-50%, -50%) scale(2.5);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.9);
  z-index: 20;
}

.cpu-dot.intel {
  background: #ffd700;
}

.cpu-dot.amd {
  background: #ffd700;
}

.cpu-dot.hollow {
  background: transparent;
  border: 1.5px solid #ffd700;
  width: 8px;
  height: 8px;
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.6);
}

.cpu-dot.is-dimmed {
  opacity: 0.2;
}

.cpu-dot.is-searched {
  transform: translate(-50%, -50%) scale(1.6);
  box-shadow: 0 0 12px rgba(255, 215, 0, 1);
  z-index: 30;
}

.cpu-dot.is-merged .dot-label {
  display: block;
}

/* 圆点标签（右侧显示型号） */
.dot-label {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #e2e8f0;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  line-height: 1;
  text-shadow:
    0 0 4px rgba(0, 0, 0, 0.8),
    0 1px 2px rgba(0, 0, 0, 0.6);
}

.cpu-dot:hover .dot-label {
  color: #ffd700;
  font-weight: 600;
}

/* 系列标签 */
.series-label {
  position: absolute;
  transform: translate(-50%, -100%);
  font-size: 15px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
  margin-bottom: 2px;
}

.series-label.intel {
  color: #60a5fa;
}

.series-label.amd {
  color: #ef4444;
}

/* 基准线 */
.benchmark-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  border-top: 1px dashed rgba(255, 215, 0, 0.5);
  pointer-events: none;
  z-index: 2;
}

.benchmark-line-label {
  position: absolute;
  right: 8px;
  top: -14px;
  font-size: 0.7rem;
  color: rgba(255, 215, 0, 0.7);
  background: var(--bg-secondary);
  padding: 0 4px;
  font-weight: 600;
}

/* X轴 */
.x-axis {
  position: relative;
  height: 30px;
  margin-top: 0.25rem;
}

.x-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-align: center;
  white-space: nowrap;
}

/* ========== 移动端列表 ========== */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cpu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.8rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  min-height: 52px;
  transition: background 0.15s;
}

.cpu-row:hover {
  background: var(--bg-tertiary);
}

.cpu-row.is-searched {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.cpu-row-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.brand-dot.intel {
  background: #3b82f6;
}

.brand-dot.amd {
  background: #ef4444;
}

.cpu-row-name {
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cpu-row-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.cpu-row-percent {
  font-size: 1rem;
  font-weight: 700;
}

.cpu-row-percent.intel {
  color: #3b82f6;
}

.cpu-row-percent.amd {
  color: #ef4444;
}

.compare-btn-small {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.compare-btn-small:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ========== Tooltip ========== */
.cpu-tooltip {
  z-index: 1000;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  min-width: 140px;
}

.tooltip-title {
  font-weight: 600;
  color: #ffd700;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.tooltip-score {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.tooltip-percent {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}

.tooltip-estimated {
  font-size: 0.7rem;
  color: #f59e0b;
  margin-top: 0.15rem;
}

.tooltip-merged {
  margin-top: 0.15rem;
}

.tooltip-merged-item {
  font-size: 0.7rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* ========== 详情弹窗 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 1rem;
}

.modal-content {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  max-width: 420px;
  width: 100%;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(74, 144, 217, 0.08);
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 0.5rem;
}
.modal-header.header-intel {
  background: linear-gradient(135deg, rgba(74, 144, 217, 0.25), rgba(74, 144, 217, 0.08));
}
.modal-header.header-amd {
  background: linear-gradient(135deg, rgba(224, 64, 64, 0.25), rgba(224, 64, 64, 0.08));
}
.modal-header.header-gold {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05));
}
.data-source-tag {
  display: inline-block;
  font-size: 0.65rem;
  padding: 2px 7px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
  font-weight: 600;
}
.tag-tested {
  background: rgba(255, 215, 0, 0.18);
  color: #ffd700;
}
.tag-estimated {
  background: rgba(100, 100, 100, 0.2);
  color: rgba(200, 200, 200, 0.7);
  border: 1px solid rgba(200, 200, 200, 0.2);
}

.modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  flex: 1;
}
.modal-title.intel {
  color: #6eb0ff;
}
.modal-title.amd {
  color: #ff6b6b;
}

.modal-close {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.modal-body {
  padding: 0;
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-btn {
  flex: 1;
  padding: 0.65rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.modal-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.modal-btn.bench-toggle {
  background: rgba(255, 215, 0, 0.1);
  border-color: rgba(255, 215, 0, 0.25);
  color: #ffd700;
}

.modal-btn.bench-toggle.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.15);
}

/* ========== 底部备注 ========== */
.bottom-notes {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding: 0.75rem;
  margin-top: 0.5rem;
}

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  .tier-page {
    padding: 0.6rem;
    padding-bottom: 320px;
  }

  .scatter-container {
    /* 移动端不隐藏，显示散点图（含空心圆） */
    overflow-x: auto;
    overflow-y: visible;
  }

  .x-axis {
    display: none; /* X轴（品牌分组）移动端隐藏 */
  }
}

/* ========== 搜索栏 +添加按钮 ========== */
.search-add-btn {
  margin-left: 0.5rem;
  padding: 0.15rem 0.5rem;
  background: #ffd700;
  color: #000;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 28px;
}
.search-add-btn:hover {
  background: #ffc000;
}

/* ========== 弹窗 ========== */
.bench-modal {
  max-width: 680px;
}
.detail-modal {
  max-width: 480px;
}

/* 比较表格（弹窗通用） */
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.compare-table thead th {
  padding: 0.65rem 0.6rem;
  font-weight: 700;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.6);
}
.compare-table thead th:first-child {
  width: 100px;
  text-align: left;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
}
.cpu-col {
  cursor: pointer;
  transition: all 0.2s;
  min-width: 90px;
  border-radius: 6px;
}
.cpu-col:hover {
  background: rgba(255, 255, 255, 0.04);
}
.cpu-col.intel {
  color: #6eb0ff;
}
.cpu-col.amd {
  color: #ff6b6b;
}
/* 基准CPU整列高亮 */
.cpu-col.is-benchmark,
td.is-benchmark {
  background: rgba(255, 215, 0, 0.08);
}
.compare-table tbody td {
  padding: 0.55rem 0.6rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.75);
}
.compare-table tbody tr.striped {
  background: rgba(255, 255, 255, 0.015);
}
.label-cell {
  text-align: left !important;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 500;
  font-size: 0.8rem;
}
.highlight-row .label-cell {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}
.value-cell.intel {
  color: #6eb0ff;
  font-weight: 600;
}
.value-cell.amd {
  color: #ff6b6b;
  font-weight: 600;
}
.highlight-row .value-cell {
  font-size: 1rem;
  font-weight: 700;
}

.modal-bench-inline {
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
  margin-left: 0.3rem;
}

.modal-bench-tag {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 0.5rem;
}

.bench-empty {
  text-align: center;
  padding: 2rem 1.5rem;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.85rem;
}

/* 对比表格列头可点击（基准提示） */
.cpu-col.clickable {
  cursor: pointer;
  background: rgba(255, 215, 0, 0.07);
  transition: background 0.2s;
}
.cpu-col.clickable:hover {
  background: rgba(255, 215, 0, 0.15);
}

.bench-hint-icon {
  font-size: 0.85em;
  color: rgba(255, 215, 0, 0.55);
  margin-left: 3px;
  vertical-align: middle;
  cursor: help;
}

.bench-modal-body {
  padding-bottom: 0;
}

/* ========== 对比栏内对标按钮 ========== */
.compare-bench-btn {
  padding: 0.25rem 0.6rem;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 4px;
  color: #ffd700;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  min-height: 28px;
  flex-shrink: 0;
  transition: all 0.15s;
  margin-left: auto;
}
.compare-bench-btn:hover:not(.disabled) {
  background: rgba(255, 215, 0, 0.3);
}
.compare-bench-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

/* ========== Tooltip 新样式 ========== */
.tooltip-game-pct {
  font-size: 1rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0.15rem 0;
}
.tooltip-bench {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  /* 顶部区域：Tab切换 + 轮播图 */
  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .top-bar-spacer {
    display: none;
  }

  .tabs {
    width: 100%;
    justify-content: center;
  }

  .tab-btn {
    font-size: 0.85rem;
    padding: 0.4rem 0.6rem;
    min-height: 36px;
    flex: 1;
    text-align: center;
  }

  .top-carousel {
    max-width: 100%;
    height: 38px;
    min-height: 38px;
  }

  .dot-btn {
    width: 6px;
    height: 6px;
  }

  /* 内容区顶栏：搜索栏和对比栏各自单独成行，弹性布局 */
  .tier-content .top-bar {
    flex-direction: column;
    gap: 0.5rem;
  }
  .search-bar {
    width: 100%;
  }
  .compare-inline {
    width: 100%;
    flex-wrap: wrap;
  }
  .compare-inline-items {
    flex-wrap: wrap;
  }
  .compare-inline-label {
    font-size: 0.7rem;
  }
  .chip-name {
    font-size: 0.7rem;
    max-width: 60px;
  }
  .compare-inline-clear,
  .compare-inline-bench {
    min-height: 24px;
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }
  .compare-bench-btn {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    min-height: 24px;
  }
  .search-action-btn {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }
  .search-hint {
    font-size: 0.7rem;
    padding: 0 0.4rem;
  }
  .compare-empty-hint {
    font-size: 0.7rem;
  }
}

/* ========== 移动端列表 对比按钮 ========== */
.compare-btn-small {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.compare-btn-small:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ========== 全网独家声明 + 图例 ========== */
.unique-legend {
  margin-top: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 10px;
}
.unique-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.unique-icon {
  font-size: 1.2rem;
}
.unique-title-row strong {
  color: #ffd700;
  font-size: 0.95rem;
}
.unique-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  background: rgba(255, 215, 0, 0.12);
  color: rgba(255, 215, 0, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}
.legend-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.dot-legend {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-top: 3px;
  flex-shrink: 0;
}
.dot-legend.filled {
  background: #ffd700;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
}
.dot-legend.hollow {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.35);
}
.dot-legend.bench {
  background: rgba(255, 255, 255, 0.15);
  border: 1px dashed rgba(255, 255, 255, 0.4);
}
.legend-item div strong {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.82rem;
  display: block;
}
.legend-item div p {
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.75rem;
  margin: 2px 0 0;
  line-height: 1.4;
}
.unique-disclaimer {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}
.unique-disclaimer a {
  color: rgba(255, 215, 0, 0.6);
  text-decoration: none;
}
.unique-disclaimer a:hover {
  text-decoration: underline;
}
</style>
