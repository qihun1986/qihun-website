<template>
  <div class="tier-page">
    <!-- 游戏性能天梯内容 -->
    <div class="tier-content">
      <!-- 顶部栏 -->
      <div class="top-bar">
        <div class="search-bar" @focusout="onSearchBlur">
          <input
            v-model="gpuState.searchQuery"
            type="text"
            placeholder="🔍 搜索型号"
            @input="onSearchInput"
            @focus="onSearchFocus"
            @keyup.enter="jumpToFirstMatch"
          />
          <button
            class="search-action-btn add-compare-btn"
            :class="{ disabled: !gpuState.selectedSearchGpu }"
            :disabled="!gpuState.selectedSearchGpu"
            @click="addSearchSelectedToCompare"
            title="添加到对比"
          >+对比</button>
          <button v-if="gpuState.selectedSearchGpu" class="search-action-btn clear-btn" @click="clearSearchSelection">✕</button>
          <span v-else-if="!showSearchDropdown" class="search-hint">点击GPU可添加对比</span>
          <div v-if="showSearchDropdown && searchDropdownItems.length > 0 && !gpuState.selectedSearchGpu" class="search-dropdown">
            <div
              v-for="item in searchDropdownItems"
              :key="item.gpu.id"
              class="search-dropdown-item"
              @mousedown.prevent="onSearchItemClick(item.gpu)"
            >
              <span class="dropdown-brand" :class="item.brand.toLowerCase()">●</span>
              <span class="dropdown-name">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- 分辨率切换（仅游戏模式） -->
        <div class="resolution-switcher">
          <button
            v-for="res in resolutions"
            :key="res.key"
            class="res-btn"
            :class="{ active: gpuState.resolution === res.key }"
            @click="switchResolution(res.key)"
          >
            {{ res.label }}
          </button>
        </div>

        <!-- 对比栏 -->
        <div class="compare-inline">
          <span class="compare-inline-label">📊 对比</span>
          <div class="compare-inline-items" v-if="gpuState.compareList.length > 0">
            <span
              v-for="gpu in gpuState.compareList"
              :key="gpu.id"
              class="compare-inline-chip"
              :class="{ 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }"
            >
              <span class="chip-brand" :class="getBrand(gpu).toLowerCase()">●</span>
              <span class="chip-name" @click="openBenchModal(gpu)">{{ formatGpuName(gpu.model) }}</span>
              <span class="chip-bench-hint" title="点击设为基准">◎</span>
              <button class="chip-remove" @click.stop="removeFromCompare(gpu)">✕</button>
            </span>
            <button class="compare-inline-clear" @click="clearCompare">清空</button>
            <button class="compare-inline-bench" @click="resetBenchmark">重置</button>
          </div>
          <span v-else class="compare-empty-hint">点击GPU查看详情</span>
          <button
            class="compare-bench-btn"
            :class="{ disabled: gpuState.compareList.length === 0 }"
            @click="openBenchModal(null)"
          >比较</button>
        </div>
      </div>

      <!-- 基准提示 -->
      <div class="benchmark-hint">
        <template v-if="gpuState.benchmarkGpu">
          📌 基准：<strong>{{ formatGpuName(gpuState.benchmarkGpu.model) }}</strong> (100%)
          <span class="hint-stats">共 <strong>{{ gpus.length }}</strong> 款显卡，<strong>{{ positionedGpus.length }}</strong> 个圆点</span>
        </template>
        <template v-else>
          💡 点击 GPU 圆点可设为基准或添加到对比
          <span class="hint-stats">共 <strong>{{ gpus.length }}</strong> 款显卡，<strong>{{ positionedGpus.length }}</strong> 个圆点</span>
        </template>
      </div>

      <!-- 散点图区域（无内部滚动条，页面自然滚动） -->
      <div class="scatter-container">
      <!-- 品牌表头（NVIDIA 50% | AMD 40% | Intel 10%） -->
      <div class="brand-headers">
        <div class="brand-header nvidia-header" style="flex: 0 0 50%">NVIDIA</div>
        <div class="brand-header amd-header" style="flex: 0 0 40%">AMD</div>
        <div class="brand-header intel-header" style="flex: 0 0 10%">INTEL</div>
      </div>

        <div class="scatter-plot" ref="scatterPlot">
          <!-- 列分隔线 -->
          <div class="col-dividers">
            <div v-for="i in 9" :key="i" class="col-divider" :style="{ left: (i * 10) + '%' }"></div>
          </div>

          <!-- 渐变分隔线（NVIDIA/AMD 之间 50% 处） -->
          <div class="gradient-line nvidia-amd" :style="{ left: '50%' }"></div>

          <!-- GPU 圆点 -->
          <div
            v-for="item in positionedGpus"
            :key="item.key"
            class="gpu-dot"
            :class="{
              'is-merged': item.gpus.length > 1,
              'is-searched': item.isSearched,
              'is-dimmed': gpuState.selectedSearchGpu && !item.isSearched,
              'nvidia': item.brand === 'NVIDIA',
              'amd': item.brand === 'AMD',
              'intel': item.brand === 'INTEL',
              'hollow': isEstimated(item.gpus[0])
            }"
            :style="{ left: item.x + '%', top: item.y + '%' }"
            @click="onDotClick(item)"
            @mouseenter="showTooltip($event, item)"
            @mouseleave="hideTooltip"
          >
            <span class="dot-label">{{ item.displayLabel }}</span>
          </div>

          <!-- 系列标签（主标签 + 子系列标签） -->
          <template v-for="label in seriesLabels" :key="label.key">
            <div
              class="series-label"
              :class="label.brand.toLowerCase()"
              :style="{ left: label.x + '%', top: label.y + '%' }"
              @click="label.cpu && showDetailFromCpu(label.cpu)"
            >
              {{ label.text }}
            </div>
          </template>

          <!-- 基准线 -->
          <div v-if="benchmarkY !== null" class="benchmark-line" :style="{ top: benchmarkY + '%' }">
            <span class="benchmark-line-label">基准 100%</span>
          </div>
        </div>
      </div>

      <!-- 移动端列表 -->
      <div class="mobile-list" v-if="isMobile">
        <div
          v-for="gpu in sortedGpus"
          :key="gpu.id"
          class="gpu-row"
          @click="showDetailMobile(gpu)"
        >
          <div class="gpu-row-left">
            <span class="brand-dot" :class="getBrand(gpu).toLowerCase()"></span>
            <span class="gpu-row-name">{{ formatGpuName(gpu.model) }}</span>
          </div>
          <div class="gpu-row-right">
            <span class="gpu-row-percent" :class="getBrand(gpu).toLowerCase()">
              {{ getCurrentPercent(gpu) }}%
            </span>
            <button class="compare-btn-small" @click.stop="addSingleToCompare(gpu)">⚖️</button>
          </div>
        </div>
      </div>

      <div class="bottom-notes">
        注：默认基准 RTX 4060（100%）；分辨率切换自动更新圆点位置及百分比；单击 GPU 打开详情，可设为基准或添加对比；数据仅供参考。
      </div>
    </div>

    <!-- 悬浮 Tooltip -->
    <div v-if="tooltip.visible" class="gpu-tooltip" :style="tooltip.style">
      <div class="tooltip-title">{{ tooltip.title }}</div>
      <div class="tooltip-game-pct">{{ tooltip.percent }}</div>
      <div class="tooltip-bench">基准：{{ gpuState.benchmarkGpu ? formatGpuName(gpuState.benchmarkGpu.model) : 'RTX 4060' }}</div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailModal.show" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content detail-modal" @click.stop>
        <div class="modal-header" :class="getBrand(detailModal.gpu).toLowerCase() + '-header'">
          <span class="modal-title">
            {{ detailModal.mergedGpus.length > 1 ? getDisplayLabel(detailModal.mergedGpus) : formatGpuName(detailModal.gpu?.model || '') }}
            <span class="modal-bench-inline">（基准：{{ gpuState.benchmarkGpu ? formatGpuName(gpuState.benchmarkGpu.model) : 'RTX 4060' }}）</span>
          </span>
          <button class="modal-close" @click="closeDetailModal">✕</button>
        </div>
        <div class="modal-body">
          <table class="compare-table single-table">
            <thead>
              <tr>
                <th></th>
                <th v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="gpu-col" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">
                  {{ formatGpuName(gpu.model) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-cell">1080P 性能</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">{{ getPercent(gpu, '1080p') }}%</td>
              </tr>
              <tr class="striped">
                <td class="label-cell">2K 性能</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">{{ getPercent(gpu, '2k') }}%</td>
              </tr>
              <tr>
                <td class="label-cell">4K 性能</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">{{ getPercent(gpu, '4k') }}%</td>
              </tr>
              <tr class="striped">
                <td class="label-cell">流处理器/光追单元</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell">{{ gpu.shader_units || '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">显存</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell">{{ gpu.vram || '-' }}</td>
              </tr>
              <tr class="striped">
                <td class="label-cell">核心频率</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell">{{ gpu.game_freq ? gpu.game_freq + ' MHz' : '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">TDP</td>
                <td v-for="gpu in detailModal.mergedGpus" :key="gpu.id" class="value-cell">{{ gpu.tdp ? gpu.tdp + ' W' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="modal-btn bench-toggle" :class="{ active: detailModal.gpu?.id === gpuState.benchmarkGpu?.id }" @click="toggleBenchmark(detailModal.gpu)">
            {{ detailModal.gpu?.id === gpuState.benchmarkGpu?.id ? '取消基准' : '设为基准显卡' }}
          </button>
          <button class="modal-btn secondary" :class="{ disabled: isInCompare(detailModal.gpu) }" @click="addDetailToCompare">
            {{ isInCompare(detailModal.gpu) ? '已在对比' : '添加到对比栏' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 比较弹窗 -->
    <div v-if="benchModal.show" class="modal-overlay" @click="closeBenchModal">
      <div class="modal-content bench-modal" @click.stop>
        <div class="modal-header">
          <span class="modal-title">比较（基准：{{ gpuState.benchmarkGpu ? formatGpuName(gpuState.benchmarkGpu.model) : 'RTX 4060' }}）</span>
          <button class="modal-close" @click="closeBenchModal">✕</button>
        </div>
        <div class="modal-body">
          <table class="compare-table">
            <thead>
              <tr>
                <th></th>
                <th v-for="gpu in gpuState.compareList" :key="gpu.id" class="gpu-col clickable" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]" @click="toggleBenchmark(gpu)">
                  {{ formatGpuName(gpu.model) }}<span class="bench-hint-icon" title="点击设为基准">◎</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-cell">1080P 性能</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">{{ getPercent(gpu, '1080p') }}%</td>
              </tr>
              <tr class="striped">
                <td class="label-cell">2K 性能</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">{{ getPercent(gpu, '2k') }}%</td>
              </tr>
              <tr>
                <td class="label-cell">4K 性能</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell" :class="[getBrand(gpu).toLowerCase(), { 'is-benchmark': gpu.id === gpuState.benchmarkGpu?.id }]">{{ getPercent(gpu, '4k') }}%</td>
              </tr>
              <tr class="striped">
                <td class="label-cell">流处理器/光追单元</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell">{{ gpu.shader_units || '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">显存</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell">{{ gpu.vram || '-' }}</td>
              </tr>
              <tr class="striped">
                <td class="label-cell">核心频率</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell">{{ gpu.game_freq ? gpu.game_freq + ' MHz' : '-' }}</td>
              </tr>
              <tr>
                <td class="label-cell">TDP</td>
                <td v-for="gpu in gpuState.compareList" :key="gpu.id" class="value-cell">{{ gpu.tdp ? gpu.tdp + ' W' : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="resetBenchmark">重置基准</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'

// ============== 类型 ==============
interface Gpu {
  id: number
  model: string
  abs_game_performance_1080p: number | null
  abs_game_performance_2k: number | null
  abs_game_performance_4k: number | null
  shader_units: string | null
  vram: string | null
  game_freq: string | null
  tdp: number | null
  new_price: number | null
  used_price: number | null
}

interface PositionedGpu {
  key: string
  gpus: Gpu[]
  displayLabel: string
  brand: 'NVIDIA' | 'AMD' | 'INTEL'
  score: number
  x: number
  y: number
  isSearched: boolean
}

interface SeriesLabel {
  key: string
  brand: 'NVIDIA' | 'AMD' | 'INTEL'
  text: string
  x: number
  y: number
  cpu: Gpu | null
}

// Tab已移除，只保留游戏性能
// ============== 常量 ==============
const resolutions = [
  { key: '1080p', label: '1080p', field: 'abs_game_performance_1080p' as const },
  { key: '2k', label: '2K', field: 'abs_game_performance_2k' as const },
  { key: '4k', label: '4K', field: 'abs_game_performance_4k' as const }
]

// 列定义（共10列：RTX10/20/30/40/50各一列 + AMD 4列 + Intel 1列）
// GTX900/GTX700 归入 RTX50列（列4），通过子系列标签区分
const COLUMNS = [
  { idx: 0, brand: 'NVIDIA', label: 'RTX10', width: 10, match: (m: string) => /RTX 10/i.test(m) },
  { idx: 1, brand: 'NVIDIA', label: 'RTX20', width: 10, match: (m: string) => /RTX 20|GTX 1650|GTX 1660/i.test(m) },
  { idx: 2, brand: 'NVIDIA', label: 'RTX30', width: 10, match: (m: string) => /RTX 30/i.test(m) },
  { idx: 3, brand: 'NVIDIA', label: 'RTX40', width: 10, match: (m: string) => /RTX 40/i.test(m) },
  { idx: 4, brand: 'NVIDIA', label: 'RTX50', width: 10, match: (m: string) => /RTX 50|GTX 9|GTX 7/i.test(m) },
  { idx: 5, brand: 'AMD', label: 'RX9000', width: 10, match: (m: string) => /RX 9|Vega/i.test(m) },
  { idx: 6, brand: 'AMD', label: 'RX7000', width: 10, match: (m: string) => /RX 7|RX 5\d{2}|RX 4\d{2}/i.test(m) },
  { idx: 7, brand: 'AMD', label: 'RX6000', width: 10, match: (m: string) => /RX 6/i.test(m) },
  { idx: 8, brand: 'AMD', label: 'RX5000', width: 10, match: (m: string) => /RX 5\d{3}/i.test(m) },
  { idx: 9, brand: 'INTEL', label: 'Intel', width: 10, match: (m: string) => /INTEL|ARC/i.test(m) }
]

// 子系列映射（用于多标签列）
// 列4: RTX50列包含 GTX9/700
// 列5: RX9000列包含 Vega
// 列6: RX7000列包含 RX5/400
const SUB_LABELS: Record<number, { regex: RegExp; label: string }[]> = {
  4: [
    { regex: /GTX 9|GTX 7/i, label: 'GTX9/700' }
  ],
  5: [
    { regex: /Vega/i, label: 'Vega' }
  ],
  6: [
    { regex: /RX 5\d{2}|RX 4\d{2}/i, label: 'RX5/400' }
  ]
}

// Supabase 客户端
const supabase = createClient(
  'https://azvcjobnbgreffuuceyi.supabase.co',
  'sb_publishable_hV8gIo_nFvqyYHhKqsi6Rw_S9AfwazX'
)

// ============== 响应式状态 ==============
const gpus = ref<Gpu[]>([])
const loading = ref(true)
const showSearchDropdown = ref(false)
const isMobile = ref(false)
const scatterPlot = ref<HTMLElement | null>(null)

const gpuState = reactive({
  resolution: localStorage.getItem('gpu-tier-resolution') || '2k',
  benchmarkGpu: null as Gpu | null,
  compareList: [] as Gpu[],
  selectedSearchGpu: null as Gpu | null,
  searchQuery: ''
})

const detailModal = ref({ show: false, gpu: null as Gpu | null, mergedGpus: [] as Gpu[] })
const benchModal = ref({ show: false })
const tooltip = ref({ visible: false, title: '', percent: '', style: {} as Record<string, string> })

// ============== 辅助函数 ==============
function getBrand(gpu: Gpu): 'NVIDIA' | 'AMD' | 'INTEL' {
  const m = gpu.model.toUpperCase()
  if (m.includes('NVIDIA') || m.includes('RTX') || m.includes('GTX')) return 'NVIDIA'
  if (m.includes('AMD') || m.includes('RX') || m.includes('RADEON')) return 'AMD'
  return 'INTEL'
}

function getColumnIndex(gpu: Gpu): number {
  for (let i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].match(gpu.model)) return i
  }
  return 0
}

function getField() {
  return resolutions.find(r => r.key === gpuState.resolution)?.field || 'abs_game_performance_2k'
}

function getScore(gpu: Gpu): number | null {
  const field = getField()
  const score = (gpu[field] as number)
  if (!score || score === 0) return null
  return score
}

// Y轴映射（中位数分界：高分区30%，低分区70%）
function scoreToY(score: number, minScore: number, medianScore: number, maxScore: number): number {
  if (maxScore === minScore) return 50
  if (score >= medianScore) {
    // 高分区：0-30%
    return 30 * (maxScore - score) / (maxScore - medianScore)
  } else {
    // 低分区：30-100%
    return 30 + 70 * (medianScore - score) / (medianScore - minScore)
  }
}

// 当前分辨率下的分数范围（动态，含中位数）
const scoreRange = computed(() => {
  const scores = gpus.value.map(g => getScore(g)).filter((s): s is number => s !== null && s > 0)
  if (scores.length === 0) return { min: 0, median: 500, max: 1000 }
  let min = Math.min(...scores)
  let max = Math.max(...scores)
  // 顶部留白20%，避免最高分顶到头
  max = max * 1.2
  // 计算中位数
  const sorted = [...scores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return { min, median, max }
})

// 基准分数
const benchmarkScore = computed(() => {
  if (!gpuState.benchmarkGpu) return 1
  return getScore(gpuState.benchmarkGpu)
})

// 基准Y位置
const benchmarkY = computed(() => {
  if (!gpuState.benchmarkGpu) return null
  const score = getScore(gpuState.benchmarkGpu)
  if (score === null) return null
  return scoreToY(score, scoreRange.value.min, scoreRange.value.median, scoreRange.value.max)
})

// 获取百分比（指定分辨率）
function getPercent(gpu: Gpu, res: '1080p' | '2k' | '4k'): string {
  if (!gpuState.benchmarkGpu) return '-'
  let score: number
  if (res === '1080p') score = gpu.abs_game_performance_1080p || 0
  else if (res === '2k') score = gpu.abs_game_performance_2k || 0
  else score = gpu.abs_game_performance_4k || 0
  const base = (res === '1080p' ? gpuState.benchmarkGpu.abs_game_performance_1080p :
    res === '2k' ? gpuState.benchmarkGpu.abs_game_performance_2k :
    gpuState.benchmarkGpu.abs_game_performance_4k) || 1
  if (base === 0) return '-'
  const pct = (score / base) * 100
  return Math.round(pct).toString()
}

function getCurrentPercent(gpu: Gpu): string {
  return getPercent(gpu, gpuState.resolution as '1080p' | '2k' | '4k')
}

function formatGpuName(model: string): string {
  return model
    .replace(/NVIDIA GeForce\s*/i, '')
    .replace(/AMD Radeon\s*/i, '')
    .replace(/INTEL Arc\s*/i, '')
    .replace(/NVIDIA\s*/i, '')
    .replace(/GeForce\s*/i, '')
    .replace(/AMD\s*/i, '')
    .replace(/Radeon\s*/i, '')
    .replace(/INTEL\s*/i, '')
    .replace(/Arc\s*/i, '')
    .replace(/RTX\s*/i, '')
    .replace(/GTX\s*/i, '')
    .replace(/RX\s*/i, '')
    .replace(/\bTi\b/i, 'Ti')
    .replace(/\bSuper\b/i, 'Super')
    .replace(/\bXT\b/i, 'XT')
    .trim()
}

function isEstimated(gpu: Gpu): boolean {
  return getScore(gpu) === null
}

function getDisplayLabel(gpuList: Gpu[]): string {
  if (gpuList.length === 1) return formatGpuName(gpuList[0].model)
  return formatGpuName(gpuList[0].model) + '…'
}

// 合并逻辑（分数差≤2%且同品牌同列内，过滤无分数GPU）
function mergeAndPosition(gpusInCol: Gpu[], colIdx: number): PositionedGpu[] {
  // 先过滤无分数的GPU
  const validGpus = gpusInCol.filter(g => {
    const score = getScore(g)
    return score !== null && score > 0
  })
  
  if (validGpus.length === 0) return []
  
  const sorted = [...validGpus].sort((a, b) => (getScore(b) || 0) - (getScore(a) || 0))
  const used = new Set<number>()
  const groups: Gpu[][] = []
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue
    const group = [sorted[i]]
    used.add(sorted[i].id)
    const scoreI = getScore(sorted[i]) || 0
    
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].id)) continue
      const scoreJ = getScore(sorted[j]) || 0
      const diff = Math.abs(scoreI - scoreJ) / scoreI * 100
      if (diff <= 2 && getBrand(sorted[i]) === getBrand(sorted[j])) {
        group.push(sorted[j])
        used.add(sorted[j].id)
      }
    }
    groups.push(group)
  }
  
  const items = groups.map(g => ({ gpus: g, merged: g.length > 1 }))
  const usedYs: number[] = []
  const minSpacing = 1.2
  const { min, median, max } = scoreRange.value
  const result: PositionedGpu[] = []
  
  // 圆点左偏移15%
  const centerX = (colIdx + 0.5) * 10 - 1.5
  
  for (const item of items) {
    const score = getScore(item.gpus[0]) || 0
    let rawY = scoreToY(score, min, median, max)
    let finalY = rawY
    let attempts = 0
    
    while (attempts < 50) {
      const collide = usedYs.some(uy => Math.abs(uy - finalY) < minSpacing)
      if (!collide) break
      finalY = rawY + (attempts % 2 === 0 ? 1 : -1) * (Math.floor(attempts / 2) + 1) * 0.8
      attempts++
    }
    
    finalY = Math.max(0.5, Math.min(99.5, finalY))
    usedYs.push(finalY)
    
    result.push({
      key: item.gpus.map(g => g.id).join('-'),
      gpus: item.gpus,
      displayLabel: item.merged ? getDisplayLabel(item.gpus) : formatGpuName(item.gpus[0].model),
      brand: getBrand(item.gpus[0]),
      score,
      x: centerX,
      y: finalY,
      isSearched: gpuState.searchQuery ? item.gpus.some(g => g.model.toLowerCase().includes(gpuState.searchQuery.toLowerCase())) : false
    })
  }
  
  return result
}

// 所有定位圆点
const positionedGpus = computed(() => {
  if (!gpus.value.length) return []
  const colGroups: Map<number, Gpu[]> = new Map()
  for (let i = 0; i < COLUMNS.length; i++) colGroups.set(i, [])
  for (const gpu of gpus.value) {
    const col = getColumnIndex(gpu)
    colGroups.get(col)?.push(gpu)
  }
  const all: PositionedGpu[] = []
  for (let i = 0; i < COLUMNS.length; i++) {
    const items = mergeAndPosition(colGroups.get(i) || [], i)
    all.push(...items)
  }
  return all
})

// 系列标签（每列最高性能GPU上方3%处，支持子系列）
const seriesLabels = computed((): SeriesLabel[] => {
  const labels: SeriesLabel[] = []
  const { min, median, max } = scoreRange.value
  
  for (let colIdx = 0; colIdx < COLUMNS.length; colIdx++) {
    const col = COLUMNS[colIdx]
    const colGpus = gpus.value.filter(g => getColumnIndex(g) === colIdx)
    
    // 过滤无分数的GPU
    const validGpus = colGpus.filter(g => {
      const score = getScore(g)
      return score !== null && score > 0
    })
    
    if (validGpus.length === 0) continue
    
    // 检查是否有子系列标签配置
    const subLabelConfig = SUB_LABELS[colIdx]
    
    if (subLabelConfig && subLabelConfig.length > 0) {
      // 有子系列配置，为每个子系列生成标签
      for (const subConfig of subLabelConfig) {
        const subGpus = validGpus.filter(g => subConfig.regex.test(g.model))
        if (subGpus.length === 0) continue
        
        // 找该子系列最高性能GPU
        const best = subGpus.reduce((a, b) => (getScore(a) || 0) > (getScore(b) || 0) ? a : b)
        const bestScore = getScore(best)
        if (bestScore === null) continue
        
        const y = scoreToY(bestScore, min, median, max)
        
        labels.push({
          key: `${colIdx}-${subConfig.label}`,
          brand: col.brand as 'NVIDIA' | 'AMD' | 'INTEL',
          text: subConfig.label,
          x: (colIdx + 0.5) * 10,
          y: y - 3, // 上方3%
          cpu: best
        })
      }
    } else {
      // 无子系列，生成主标签
      const best = validGpus.reduce((a, b) => (getScore(a) || 0) > (getScore(b) || 0) ? a : b)
      const bestScore = getScore(best)
      if (bestScore === null) continue
      
      const y = scoreToY(bestScore, min, median, max)
      
      labels.push({
        key: colIdx.toString(),
        brand: col.brand as 'NVIDIA' | 'AMD' | 'INTEL',
        text: col.label as string,
        x: (colIdx + 0.5) * 10,
        y: y - 3, // 上方3%
        cpu: best
      })
    }
  }
  
  return labels
})

// 移动端排序数据（过滤无分数GPU）
const sortedGpus = computed(() => {
  return [...gpus.value]
    .filter(g => {
      const score = getScore(g)
      return score !== null && score > 0
    })
    .sort((a, b) => (getScore(b) || 0) - (getScore(a) || 0))
})

// 搜索下拉
const searchDropdownItems = computed(() => {
  const q = gpuState.searchQuery.toLowerCase()
  if (!q) return []
  return gpus.value.filter(g => g.model.toLowerCase().includes(q)).slice(0, 8).map(g => ({
    gpu: g,
    label: formatGpuName(g.model),
    brand: getBrand(g)
  }))
})

// ============== 交互方法 ==============
function switchResolution(res: string) {
  gpuState.resolution = res
  localStorage.setItem('gpu-tier-resolution', res)
  if (!gpuState.benchmarkGpu || !gpuState.benchmarkGpu.model.includes('RTX 4060')) {
    resetBenchmark()
  }
}

function resetBenchmark() {
  const rtx4060 = gpus.value.find(g => g.model.includes('RTX 4060') && !g.model.includes('Ti') && !g.model.includes('S'))
  gpuState.benchmarkGpu = rtx4060 || gpus.value[0] || null
  saveToStorage()
}

function toggleBenchmark(gpu: Gpu | null) {
  if (gpu) {
    if (gpu.id === gpuState.benchmarkGpu?.id) {
      resetBenchmark()
    } else {
      gpuState.benchmarkGpu = gpu
      saveToStorage()
    }
  }
}

function addSingleToCompare(gpu: Gpu) {
  if (!gpuState.compareList.find(g => g.id === gpu.id)) {
    if (gpuState.compareList.length >= 4) gpuState.compareList.shift()
    gpuState.compareList.push(gpu)
  }
  if (!gpuState.benchmarkGpu) gpuState.benchmarkGpu = gpu
  saveToStorage()
}

function removeFromCompare(gpu: Gpu) {
  gpuState.compareList = gpuState.compareList.filter(g => g.id !== gpu.id)
  if (gpuState.benchmarkGpu?.id === gpu.id) {
    gpuState.benchmarkGpu = gpuState.compareList[0] || null
  }
  saveToStorage()
}

function clearCompare() {
  gpuState.compareList = []
  gpuState.benchmarkGpu = null
  saveToStorage()
}

function isInCompare(gpu: Gpu | null): boolean {
  if (!gpu) return false
  return gpuState.compareList.some(g => g.id === gpu.id)
}

function addDetailToCompare() {
  if (detailModal.value.gpu) {
    addSingleToCompare(detailModal.value.gpu)
  }
}

function onDotClick(item: PositionedGpu) {
  detailModal.value = { show: true, gpu: item.gpus[0], mergedGpus: item.gpus }
}

function showDetailMobile(gpu: Gpu) {
  detailModal.value = { show: true, gpu, mergedGpus: [gpu] }
}

function showDetailFromCpu(cpu: Gpu) {
  detailModal.value = { show: true, gpu: cpu, mergedGpus: [cpu] }
}

function closeDetailModal() { detailModal.value.show = false }

function openBenchModal(_gpu: Gpu | null) {
  if (gpuState.compareList.length === 0) return
  benchModal.value.show = true
}

function closeBenchModal() { benchModal.value.show = false }

function onSearchInput() {
  gpuState.selectedSearchGpu = null
  showSearchDropdown.value = gpuState.searchQuery.length > 0
}
function onSearchFocus() { if (gpuState.searchQuery) showSearchDropdown.value = true }
function onSearchBlur() { setTimeout(() => { showSearchDropdown.value = false }, 200) }
function onSearchItemClick(gpu: Gpu) {
  gpuState.selectedSearchGpu = gpu
  gpuState.searchQuery = formatGpuName(gpu.model)
  showSearchDropdown.value = false
  jumpToCpu(gpu)
}
function clearSearchSelection() {
  gpuState.selectedSearchGpu = null
  gpuState.searchQuery = ''
}
function addSearchSelectedToCompare() {
  if (gpuState.selectedSearchGpu) addSingleToCompare(gpuState.selectedSearchGpu)
  clearSearchSelection()
}
function jumpToFirstMatch() {
  const q = gpuState.searchQuery.toLowerCase()
  if (!q) return
  const match = positionedGpus.value.find(item => item.gpus.some(g => g.model.toLowerCase().includes(q)))
  if (match && scatterPlot.value) {
    const plotEl = scatterPlot.value
    const targetY = (match.y / 100) * plotEl.offsetHeight
    window.scrollTo({ top: targetY - 100, behavior: 'smooth' })
  }
}
function jumpToCpu(gpu: Gpu) {
  const target = positionedGpus.value.find(item => item.gpus.some(g => g.id === gpu.id))
  if (target && scatterPlot.value) {
    const plotEl = scatterPlot.value
    const targetY = (target.y / 100) * plotEl.offsetHeight
    window.scrollTo({ top: targetY - 100, behavior: 'smooth' })
  }
}

function showTooltip(e: MouseEvent, item: PositionedGpu) {
  const gpu = item.gpus[0]
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    title: formatGpuName(gpu.model),
    percent: getCurrentPercent(gpu) + '%',
    style: {
      position: 'fixed',
      left: rect.left + rect.width / 2 + 'px',
      top: rect.top - 10 + 'px',
      transform: 'translate(-50%, -100%)'
    }
  }
}
function hideTooltip() { tooltip.value.visible = false }

function saveToStorage() {
  localStorage.setItem('gpu-tier-compare', JSON.stringify(gpuState.compareList.map(g => g.id)))
  localStorage.setItem('gpu-tier-benchmark', gpuState.benchmarkGpu ? String(gpuState.benchmarkGpu.id) : '')
}

function loadFromStorage() {
  try {
    const compareIds = JSON.parse(localStorage.getItem('gpu-tier-compare') || '[]')
    const benchId = localStorage.getItem('gpu-tier-benchmark')
    if (compareIds.length && gpus.value.length) {
      gpuState.compareList = gpus.value.filter(g => compareIds.includes(g.id))
    }
    if (benchId && gpus.value.length) {
      gpuState.benchmarkGpu = gpus.value.find(g => String(g.id) === benchId) || null
    }
    if (!gpuState.benchmarkGpu) resetBenchmark()
  } catch {}
}

async function loadGpus() {
  loading.value = true
  const { data, error } = await supabase
    .from('gpu_current')
    .select('id, model, abs_game_performance_1080p, abs_game_performance_2k, abs_game_performance_4k, shader_units, vram, game_freq, tdp, new_price, used_price')
    .order('abs_game_performance_2k', { ascending: false })
  if (!error && data) {
    gpus.value = data
    loadFromStorage()
  }
  loading.value = false
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadGpus()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
/* 整体布局与 CPU 天梯保持一致 */
.tier-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 80vh;
}
.page-header h1 {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  text-align: center;
}
/* 顶部栏 */
.top-bar {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 2;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 0.5rem;
}
.search-bar input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.875rem;
  padding: 0.5rem 0.25rem;
}
.search-action-btn {
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}
.add-compare-btn {
  background: var(--accent);
  color: #000;
  border: none;
}
.add-compare-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.clear-btn {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  border: none;
}
.search-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a2e;
  border: 1px solid var(--border);
  border-radius: 8px;
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
}
.search-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}
.search-dropdown-item:hover { background: rgba(255,215,0,0.08); }
.dropdown-brand.nvidia { color: #76B900; }
.dropdown-brand.amd { color: #ED1C24; }
.dropdown-brand.intel { color: #0071C5; }
/* 分辨率切换 */
.resolution-switcher {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
}
.res-btn {
  background: none;
  border: none;
  border-radius: 5px;
  padding: 4px 12px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
}
.res-btn.active {
  background: rgba(59,130,246,0.25);
  color: #60a5fa;
  font-weight: 600;
}
/* 对比栏 */
.compare-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 3;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  flex-wrap: wrap;
}
.compare-inline-label { font-size: 0.8rem; color: var(--text-secondary); }
.compare-inline-items { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.compare-inline-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 0.75rem;
}
.compare-inline-chip.is-benchmark { border-color: rgba(255,215,0,0.5); background: rgba(255,215,0,0.08); }
.chip-brand.nvidia { color: #76B900; }
.chip-brand.amd { color: #ED1C24; }
.chip-brand.intel { color: #0071C5; }
.chip-name { cursor: pointer; max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.chip-bench-hint { color: rgba(255,215,0,0.5); font-size: 0.65rem; }
.chip-remove { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.7rem; }
.compare-inline-clear, .compare-inline-bench {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
}
.compare-bench-btn {
  background: rgba(255,215,0,0.15);
  border: 1px solid rgba(255,215,0,0.4);
  border-radius: 6px;
  padding: 4px 12px;
  color: #FFD700;
  cursor: pointer;
  font-size: 0.8rem;
}
.compare-bench-btn.disabled { opacity: 0.4; cursor: not-allowed; }
.compare-empty-hint { font-size: 0.75rem; color: var(--text-secondary); }
.benchmark-hint {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.6rem;
}
.hint-stats {
  margin-left: 1rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}
.hint-stats strong { color: var(--text-secondary); }
.hint-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  margin-left: 0.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
/* 散点图区域 */
.scatter-container {
  position: relative;
  margin-bottom: 1rem;
}
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
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: white;
}
.nvidia-header { background: #76B900; }
.amd-header { background: #ED1C24; }
.intel-header { background: #0071C5; }
.scatter-plot {
  position: relative;
  height: 2000px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: visible;
}
.col-dividers {
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
/* 渐变分隔线 */
.gradient-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  opacity: 0.8;
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 3;
}
.nvidia-amd { background: linear-gradient(to bottom, #76B900, #ED1C24); }
/* GPU 圆点 */
.gpu-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #FFD700;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  box-shadow: 0 0 4px rgba(255,215,0,0.8);
  transition: transform 0.15s;
  z-index: 10;
}
.gpu-dot::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -6px;
  width: calc(100% + 80px);
  height: calc(100% + 16px);
}
.gpu-dot:hover { transform: translate(-50%, -50%) scale(2); z-index: 20; }
.gpu-dot.nvidia { background: #FFD700; }
.gpu-dot.amd { background: #FFD700; }
.gpu-dot.intel { background: #FFD700; }
.gpu-dot.hollow { background: transparent; border: 1.5px solid #FFD700; }
.gpu-dot.is-dimmed { opacity: 0.2; }
.gpu-dot.is-searched { transform: translate(-50%, -50%) scale(1.6); box-shadow: 0 0 12px gold; z-index: 30; }
.dot-label {
  position: absolute;
  left: 14px; /* 左偏移15%列宽 */
  top: 50%;
  transform: translateY(-50%);
  color: #e2e8f0;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 0 4px black;
}
.gpu-dot:hover .dot-label { color: #FFD700; font-weight: 600; }
/* 系列标签 */
.series-label {
  position: absolute;
  transform: translate(-50%, -100%);
  font-size: 14px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0,0,0,0.5);
  color: white;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
}
.series-label.nvidia { color: #76B900; }
.series-label.amd { color: #ED1C24; }
.series-label.intel { color: #0071C5; }
/* 基准线 */
.benchmark-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255,255,255,0.15);
  border-top: 1px dashed rgba(255,215,0,0.5);
  pointer-events: none;
  z-index: 2;
}
.benchmark-line-label {
  position: absolute;
  right: 8px;
  top: -14px;
  font-size: 0.7rem;
  color: rgba(255,215,0,0.7);
  background: var(--bg-secondary);
  padding: 0 4px;
}
/* 移动端列表 */
.mobile-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.gpu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
}
.gpu-row-left { display: flex; align-items: center; gap: 0.5rem; }
.brand-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.brand-dot.nvidia { background: #76B900; }
.brand-dot.amd { background: #ED1C24; }
.brand-dot.intel { background: #0071C5; }
.gpu-row-name { font-size: 0.875rem; font-weight: 600; color: #e2e8f0; }
.gpu-row-percent { font-size: 1rem; font-weight: 700; }
.gpu-row-percent.nvidia { color: #76B900; }
.gpu-row-percent.amd { color: #ED1C24; }
.gpu-row-percent.intel { color: #0071C5; }
.compare-btn-small {
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 4px;
  width: 36px;
  height: 36px;
  cursor: pointer;
}
.bottom-notes {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}
/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  max-width: 90vw;
  width: auto;
  max-height: 80vh;
  overflow: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.modal-title { color: #e2e8f0; font-size: 1rem; }
.modal-bench-inline { font-size: 0.8rem; color: var(--text-secondary); }
.modal-close {
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 1rem;
}
.modal-body { padding: 1rem; }
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.compare-table th, .compare-table td {
  padding: 0.5rem 0.6rem;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.label-cell { text-align: left; color: var(--text-secondary); }
.value-cell { font-weight: 500; color: #e2e8f0; }
.striped { background: rgba(255,255,255,0.02); }
.gpu-col { color: #e2e8f0; }
.gpu-col.nvidia { color: #76B900; }
.gpu-col.amd { color: #ED1C24; }
.gpu-col.intel { color: #0071C5; }
.gpu-col.is-benchmark { background: rgba(255,215,0,0.07); }
.gpu-col.clickable { cursor: pointer; }
.bench-hint-icon { color: rgba(255,215,0,0.5); margin-left: 4px; }
.value-cell.is-benchmark { background: rgba(255,215,0,0.05); }
.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.modal-btn {
  flex: 1;
  padding: 0.6rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  color: #e2e8f0;
  font-size: 0.85rem;
}
.modal-btn.bench-toggle.active {
  background: rgba(255,215,0,0.2);
  border-color: rgba(255,215,0,0.5);
  color: #FFD700;
}
.modal-btn.disabled { opacity: 0.4; cursor: not-allowed; }
.nvidia-header { background: #76B900 !important; }
.amd-header { background: #ED1C24 !important; }
.intel-header { background: #0071C5 !important; }
/* 悬浮提示 */
.gpu-tooltip {
  position: fixed;
  background: rgba(26,26,46,0.95);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  z-index: 2000;
  pointer-events: none;
  min-width: 120px;
}
.tooltip-title { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; }
.tooltip-game-pct { font-size: 1.2rem; font-weight: 700; color: #FFD700; }
.tooltip-bench { font-size: 0.7rem; color: var(--text-secondary); }
/* 响应式 */
@media (max-width: 768px) {
  .scatter-container { display: none; }
  .top-bar { flex-direction: column; align-items: stretch; }
  .resolution-switcher { justify-content: center; }
  .compare-inline { width: 100%; }
  .brand-headers { display: none; }
}
</style>
