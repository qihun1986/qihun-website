<template>
  <div class="tier-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🎮 性能天梯图</h1>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 建设中占位 -->
    <div v-if="activeTab !== 'cpu-game' && activeTab !== 'cpu-multi'" class="building-card">
      <div class="building-icon">🚧</div>
      <h2>{{ getTabLabel(activeTab) }}</h2>
      <p>数据采集中，即将上线</p>
    </div>

    <!-- CPU 天梯图内容 -->
    <div v-else class="tier-content">
      <!-- 搜索栏 + 对比栏（同行） -->
      <div class="top-bar">
        <div class="search-bar">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 搜索型号 (如: 7800X3D, 14700K)"
            @input="onSearchInput"
            @keyup.enter="jumpToFirst"
          />
          <span v-if="searchMatchCount > 0" class="search-count">
            {{ searchMatchCount }} 个结果
            <button
              v-if="searchMatchCount > 0"
              class="search-add-btn"
              @click="addAllSearchResults"
              title="将搜索结果全部添加到对比栏"
            >+添加</button>
          </span>
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
              @click="openBenchModal(cpu)"
            >
              <span class="chip-brand" :class="isIntelCpu(cpu) ? 'intel' : 'amd'">●</span>
              <span class="chip-name">{{ formatCpuName(cpu.model) }}</span>
              <span class="chip-percent" :class="isIntelCpu(cpu) ? 'intel' : 'amd'">{{ getPerformancePercent(cpu) }}%</span>
            </span>
            <button class="compare-inline-clear" @click="clearCompare" title="清空">清空</button>
            <button class="compare-inline-bench" @click="resetBenchmark" title="重置基准">重置</button>
          </div>
          <!-- 无数据时显示提示 -->
          <span v-else class="compare-empty-hint">点击圆点添加到对比</span>
          <!-- 对标按钮 -->
          <button
            class="compare-bench-btn"
            :class="{ disabled: compareList.length === 0 }"
            :disabled="compareList.length === 0"
            @click="openBenchModal(null)"
            title="对标对比"
          >对标</button>
        </div>
      </div>

      <!-- 基准提示 -->
      <div class="benchmark-hint">
        <template v-if="benchmarkCpu">
          📌 基准：{{ benchmarkCpu.model }} (100%)
        </template>
        <template v-else>
          ⚠️ 未找到基准CPU
        </template>
        · 共 {{ cpus.length }} 款CPU · {{ positionedCpus.length }} 个圆点
      </div>
      
      <!-- DEBUG: 数据加载状态 -->
      <div v-if="cpus.length === 0" class="debug-loading">
        ⏳ 数据加载中...
      </div>

      <!-- 桌面端散点图 -->
      <div class="scatter-container" ref="scatterContainer" v-if="!isMobile">
        <!-- Y轴标签 -->
        <div class="y-axis">
          <span class="y-label top">13000</span>
          <span class="y-label" style="position:absolute;top:16.7%">10000</span>
          <span class="y-label" style="position:absolute;top:33.3%">7000</span>
          <span class="y-label" style="position:absolute;top:50%">5500</span>
          <span class="y-label" style="position:absolute;top:66.7%">4000</span>
          <span class="y-label" style="position:absolute;top:83.3%">3000</span>
          <span class="y-label bottom">2000</span>
        </div>

        <!-- 散点图画布 -->
        <div class="scatter-plot" ref="scatterPlot">
          <!-- Y轴网格线 -->
          <div class="grid-lines">
            <div v-for="val in [3000, 4000, 5500, 7000, 10000]" :key="'grid-'+val" class="grid-line" :class="{ 'grid-line-mid': val === 4000 || val === 7000 }" :style="{ top: scoreToY(val) + '%' }">
            </div>
          </div>

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
              'is-dimmed': searchQuery && !item.isSearched,
              'intel': item.brand === 'INTEL',
              'amd': item.brand === 'AMD',
              'hollow': item.isEstimated,
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
              {{ shortModelName(item.cpus[0].model) }}
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
          <span v-for="col in columnLabels" :key="col.key" class="x-label" :style="{ left: col.x + '%' }">
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
            'intel': isIntel(cpu),
            'amd': isAmd(cpu),
          }"
          @click="showDetailMobile(cpu)"
        >
          <div class="cpu-row-left">
            <span class="brand-dot" :class="isIntel(cpu) ? 'intel' : 'amd'"></span>
            <span class="cpu-row-name">{{ formatCpuName(cpu.model) }}</span>
          </div>
          <div class="cpu-row-right">
            <span class="cpu-row-percent" :class="isIntel(cpu) ? 'intel' : 'amd'">
              {{ getPerformancePercent(cpu) }}%
            </span>
            <button class="compare-btn-small" @click.stop="addSingleToCompare(cpu)">⚖️</button>
          </div>
        </div>
      </div>

      <!-- 底部备注 -->
      <div class="bottom-notes">
        注：金色圆点代表实测数据（空心代表推算）；默认基准 i5-12490F；单击 CPU 打开详情，可设为基准或添加对比；数据仅供参考。
      </div>
    </div>

    <!-- 悬浮 Tooltip -->
    <div v-if="tooltip.visible" class="cpu-tooltip" :style="tooltip.style">
      <div class="tooltip-title">{{ tooltip.title }}</div>
      <div class="tooltip-game-pct">{{ tooltip.percent }}%</div>
      <div class="tooltip-bench">基准：{{ benchmarkCpu?.model || 'i5-12490F' }}</div>
      <div v-if="tooltip.estimated" class="tooltip-estimated">(推算)</div>
    </div>

    <!-- CPU 详情弹窗 -->
    <div v-if="detailModal.show" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content detail-modal" @click.stop>
        <div class="modal-header">
          <span class="modal-title" :class="isIntelCpu(detailModal.cpu) ? 'intel' : 'amd'">
            {{ detailModal.cpu?.model }}
          </span>
          <button class="modal-close" @click="closeDetailModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-game-row">
            <span class="modal-game-label">游戏性能</span>
            <span class="modal-game-value" :class="isIntelCpu(detailModal.cpu) ? 'intel' : 'amd'">
              {{ detailModal.cpu ? getPerformancePercent(detailModal.cpu) : 0 }}%
              <span class="modal-bench-hint">(基准：{{ benchmarkCpu?.model || 'i5-12490F' }})</span>
            </span>
          </div>
          <div class="modal-row" v-for="(row, idx) in detailRows" :key="idx" :class="{ striped: idx % 2 === 1 }">
            <span class="modal-label">{{ row.label }}</span>
            <span class="modal-value">{{ row.value }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="setDetailAsBenchmark">设为基准CPU</button>
          <button class="modal-btn secondary" :class="{ disabled: isInCompare(detailModal.cpu) }" @click="addDetailToCompare">
            {{ isInCompare(detailModal.cpu) ? '已在对比' : '添加到对比栏' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 对标弹窗 -->
    <div v-if="benchModal.show" class="modal-overlay" @click="closeBenchModal">
      <div class="modal-content bench-modal" @click.stop>
        <div class="modal-header">
          <span class="modal-title">📊 对标对比</span>
          <button class="modal-close" @click="closeBenchModal">✕</button>
        </div>
        <div class="modal-body">
          <!-- 当前选中CPU详情 -->
          <div v-if="benchModal.selectedCpu" class="bench-selected">
            <div class="bench-selected-name" :class="isIntelCpu(benchModal.selectedCpu) ? 'intel' : 'amd'">
              {{ benchModal.selectedCpu.model }}
            </div>
            <div class="bench-selected-game">
              <span class="modal-game-label">游戏性能</span>
              <span class="modal-game-value" :class="isIntelCpu(benchModal.selectedCpu) ? 'intel' : 'amd'">
                {{ getPerformancePercent(benchModal.selectedCpu) }}%
                <span class="modal-bench-hint">(基准：{{ benchmarkCpu?.model || 'i5-12490F' }})</span>
              </span>
            </div>
            <div class="bench-selected-params">
              <div class="modal-row" v-for="(row, idx) in benchDetailRows" :key="idx" :class="{ striped: idx % 2 === 1 }">
                <span class="modal-label">{{ row.label }}</span>
                <span class="modal-value">{{ row.value }}</span>
              </div>
            </div>
          </div>
          <!-- 对比列表 -->
          <div v-if="compareList.length > 0" class="bench-compare-list">
            <div class="bench-compare-title">添加到对比的CPU</div>
            <div
              v-for="cpu in compareList"
              :key="cpu.id"
              class="bench-compare-item"
              :class="{
                'is-benchmark': cpu.id === benchmarkCpu?.id,
                'is-selected': cpu.id === benchModal.selectedCpu?.id,
              }"
              @click="onBenchItemClick(cpu)"
            >
              <span class="compare-item-brand" :class="isIntelCpu(cpu) ? 'intel' : 'amd'">●</span>
              <span class="bench-item-name">{{ formatCpuName(cpu.model) }}</span>
              <span class="bench-item-pct" :class="isIntelCpu(cpu) ? 'intel' : 'amd'">{{ getPerformancePercent(cpu) }}%</span>
              <button class="bench-set-btn" @click.stop="setBenchmarkAndStay(cpu)">设为基准</button>
            </div>
          </div>
          <div v-else class="bench-empty">对比栏为空，点击圆点添加到对比</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '@/lib/supabase'

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

interface Tab {
  id: string
  label: string
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
const TABS: Tab[] = [
  { id: 'cpu-game', label: 'CPU游戏性能' },
  { id: 'cpu-multi', label: 'CPU多核性能' },
  { id: 'gpu-game', label: '显卡游戏性能' },
  { id: 'gpu-create', label: '显卡创作效率' },
  { id: 'gpu-ai', label: '显卡AI性能' },
]

// 列配置 [colIndex, 系列名, 品牌, 通道宽度]
const COLUMNS = [
  { idx: 0, series: 'Core i3 / Ultra 200', brand: 'INTEL', prefix: ['i3', 'Ultra 200', 'Ultra'] },
  { idx: 1, series: 'Core i5', brand: 'INTEL', prefix: ['i5'] },
  { idx: 2, series: 'Core i7', brand: 'INTEL', prefix: ['i7'] },
  { idx: 3, series: 'Core i9', brand: 'INTEL', prefix: ['i9'] },
  { idx: 4, series: 'Ryzen 9', brand: 'AMD', prefix: ['R9', 'Ryzen 9', '7950', '9900', '9950', 'PRO 9'] },
  { idx: 5, series: 'Ryzen 7', brand: 'AMD', prefix: ['R7', 'Ryzen 7', '7700', '7800', '8700'] },
  { idx: 6, series: 'Ryzen 5', brand: 'AMD', prefix: ['R5', 'Ryzen 5', '7500', '7600', '8500', '8600'] },
  { idx: 7, series: 'Ryzen 3', brand: 'AMD', prefix: ['R3', 'Ryzen 3', '5500', '5600', '5700'] },
]

// ============== 响应式状态 ==============
const activeTab = ref('cpu-game')
const cpus = ref<Cpu[]>([])
const searchQuery = ref('')
const searchMatchCount = ref(0)
const compareList = ref<Cpu[]>([])
const compareExpanded = ref(false)
const benchmarkCpu = ref<Cpu | null>(null)
const isMobile = ref(false)
const scatterContainer = ref<HTMLElement | null>(null)
const scatterPlot = ref<HTMLElement | null>(null)

const detailModal = ref({
  show: false,
  cpu: null as Cpu | null,
})

const benchModal = ref({
  show: false,
  selectedCpu: null as Cpu | null, // 当前在弹窗中选中的CPU
})

const tooltip = ref({
  visible: false,
  title: '',
  percent: 0,
  estimated: false,
  style: {} as Record<string, string>,
})

// ============== 计算属性 ==============
const tabs = computed(() => TABS)
const isGameMode = computed(() => activeTab.value === 'cpu-game')

const sortedCpus = computed(() => {
  return [...cpus.value].sort((a, b) => {
    const scoreA = isGameMode.value ? a.abs_game_performance : a.abs_multi_performance
    const scoreB = isGameMode.value ? b.abs_game_performance : b.abs_multi_performance
    return scoreB - scoreA
  })
})

// 分数范围（固定 2000-13000）
const scoreRange = computed(() => {
  return { min: 2000, max: 13000 }
})

// 基准分数
const benchmarkScore = computed(() => {
  if (!benchmarkCpu.value) return 5000
  return isGameMode.value ? benchmarkCpu.value.abs_game_performance : benchmarkCpu.value.abs_multi_performance
})

// 基准Y位置
const benchmarkY = computed(() => {
  if (!cpus.value.length) return null
  return scoreToY(benchmarkScore.value)
})

// Y轴公式：三档近似分段，2000→100%, 4000→66.67%, 7000→33.33%, 13000→0%
function scoreToY(score: number): number {
  if (score <= 2000) return 100
  if (score >= 13000) return 0
  if (score <= 4000) return 100 - (score - 2000) / 60      // 斜率 -1/60
  if (score <= 7000) return 66.67 - (score - 4000) / 90   // 斜率 -1/90
  return 33.33 - (score - 7000) / 180                   // 斜率 -1/180
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
  
  // AMD Ryzen 系列
  if (m.includes('AMD')) {
    if (m.includes('RYZEN 9') || m.includes('R9') || /\b9\d{3}/.test(m)) return 4
    if (m.includes('RYZEN 7') || m.includes('R7') || /\b7\d{3}/.test(m)) return 5
    if (m.includes('RYZEN 5') || m.includes('R5') || /\b5\d{3}/.test(m)) return 6
    if (m.includes('RYZEN 3') || m.includes('R3') || /\b3\d{3}/.test(m)) return 7
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
function mergeCpus(cpuList: Cpu[]): { groups: Cpu[][], singles: Cpu[] } {
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
        const diff = Math.abs(getScore(cpu1) - getScore(cpu2)) / getScore(cpu1) * 100
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
  
  const singles = sorted.filter(c => !used.has(c.id))
  return { groups, singles }
}

// 去掉尾缀获取核心型号
function stripSuffix(model: string): string {
  return model
    .replace(/\/(K|KF|KS|F|X|X3D|G|GE|3D)\b/gi, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
}

// 生成分组标签
function getDisplayLabel(cpus: Cpu[]): string {
  if (cpus.length === 1) return formatCpuName(cpus[0].model)
  
  const base = stripSuffix(cpus[0].model)
  const suffixes = cpus.map(c => {
    const match = c.model.match(/\/(K|KF|KS|F|X|X3D|G|GE|3D)\b/i)
    return match ? match[1] : ''
  }).filter(Boolean)
  
  return formatCpuName(base) + '/' + suffixes.join('/')
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
          const diff = Math.abs(getScore(sorted[i]) - getScore(sorted[j])) / getScore(sorted[i]) * 100
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
    const minSpacing = 0.8 // 最小间距百分比（1800px高度下约14px）
    
    for (const item of items) {
      const score = getScore(item.cpus[0])
      const rawY = scoreToY(score)
      
      // 找到不重叠的Y位置
      let finalY = rawY
      let attempts = 0
      
      while (attempts < 30) {
        const overlapped = usedYs.some(uy => Math.abs(uy - finalY) < minSpacing)
        if (!overlapped) break
        finalY = rawY + (attempts % 2 === 0 ? 1 : -1) * (Math.floor(attempts / 2) + 1) * minSpacing
        attempts++
      }
      
      // 限制范围
      finalY = Math.max(0.5, Math.min(99.5, finalY))
      usedYs.push(finalY)
      
      const brand = getBrand(item.cpus[0])
      const isSearched = item.cpus.some(c => isCpuSearched(c))
      
      result.push({
        key: item.cpus.map(c => String(c.id)).join('-'),
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
        isEstimated: item.cpus.some(c => c.isEstimated),
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
    const colCpus = cpus.value.filter(c => getColumn(c) === col.idx)
    if (colCpus.length === 0) continue
    
    const maxScoreCpu = colCpus.reduce((best, cpu) =>
      getScore(cpu) > getScore(best) ? cpu : best
    )
    
    // 获取该CPU的Y位置
    const y = scoreToY(getScore(maxScoreCpu))
    
    // Ultra 200 系列标签（如果i3列有Ultra芯片）
    if (col.idx === 0) {
      const ultraCpus = colCpus.filter(c =>
        c.model.toUpperCase().includes('ULTRA') || c.model.toUpperCase().includes('CORE ULTRA')
      )
      const coreI3Cpus = colCpus.filter(c =>
        !c.model.toUpperCase().includes('ULTRA')
      )
      
      if (coreI3Cpus.length > 0) {
        const coreCpu = coreI3Cpus.reduce((best, cpu) =>
          getScore(cpu) > getScore(best) ? cpu : best
        )
        const coreY = scoreToY(getScore(coreCpu))
        labels.push({
          key: 'core-i3',
          brand: 'INTEL',
          text: 'Core i3',
          x: (col.idx + 0.5) * (100 / 8),
          y: coreY - 8,
          cpu: coreCpu,
        })
      }

      if (ultraCpus.length > 0) {
        const ultraCpu = ultraCpus.reduce((best, cpu) =>
          getScore(cpu) > getScore(best) ? cpu : best
        )
        const ultraY = scoreToY(getScore(ultraCpu))
        labels.push({
          key: 'ultra-200',
          brand: 'INTEL',
          text: 'Ultra 200',
          x: (col.idx + 0.5) * (100 / 8),
          y: ultraY - 8,
          cpu: ultraCpu,
        })
      }
    } else {
      labels.push({
        key: col.series.replace(/\s/g, '-'),
        brand: col.brand,
        text: col.series,
        x: (col.idx + 0.5) * (100 / 8),
        y: y - 8,
        cpu: maxScoreCpu,
      })
    }
  }
  
  return labels
})

// X轴标签
const columnLabels = computed(() => {
  return COLUMNS.map(col => ({
    key: col.series.replace(/\s/g, '-'),
    text: col.series,
    x: (col.idx + 0.5) * (100 / 8),
  }))
})

// 分隔线位置
function getColDividerStyle(i: number): Record<string, string> {
  return { left: (i * 100 / 8) + '%' }
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

// 详情弹窗数据（去掉游戏性能/价格，只留规格参数）
const detailRows = computed(() => {
  if (!detailModal.value.cpu) return []
  const cpu = detailModal.value.cpu
  return [
    { label: '核心/线程', value: `${cpu.cores} / ${cpu.threads}` },
    { label: '基础频率', value: `${cpu.base_freq} GHz` },
    { label: '加速频率', value: `${cpu.boost_freq} GHz` },
    { label: '功耗 (TDP)', value: `${cpu.tdp}W` },
  ]
})

// 对标弹窗当前选中CPU的详情
const benchDetailRows = computed(() => {
  if (!benchModal.value.selectedCpu) return []
  const cpu = benchModal.value.selectedCpu
  return [
    { label: '核心/线程', value: `${cpu.cores} / ${cpu.threads}` },
    { label: '基础频率', value: `${cpu.base_freq} GHz` },
    { label: '加速频率', value: `${cpu.boost_freq} GHz` },
    { label: '功耗 (TDP)', value: `${cpu.tdp}W` },
  ]
})

// ============== 方法 ==============
function getPerformancePercent(cpu: Cpu): number {
  if (!benchmarkCpu.value) return 0
  const pct = (getScore(cpu) / benchmarkScore.value) * 100
  return Math.round(pct)
}

function getMultiPercent(cpu: Cpu): number {
  if (!benchmarkCpu.value) return 0
  const pct = (cpu.abs_multi_performance / benchmarkCpu.value.abs_multi_performance) * 100
  return Math.round(pct)
}

function formatCpuName(model: string): string {
  return model
    .replace(/INTEL\s*CORE\s*/i, '')
    .replace(/AMD\s*RYZEN\s*/i, '')
    .replace(/AMD\s*/i, '')
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

function isCpuSearched(cpu: Cpu): boolean {
  if (!searchQuery.value) return false
  return cpu.model.toLowerCase().includes(searchQuery.value.toLowerCase())
}

function getTabLabel(tabId: string): string {
  return TABS.find(t => t.id === tabId)?.label || tabId
}

function switchTab(tabId: string) {
  activeTab.value = tabId
  searchQuery.value = ''
  searchMatchCount.value = 0
  closeDetailModal()
  
  if (tabId === 'cpu-game' || tabId === 'cpu-multi') {
    loadCpus()
  }
}

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
  console.log('[TierView] 前3条:', data.slice(0, 3).map(d => ({ id: d.id, model: d.model, game: d.abs_game_performance })))
  
  cpus.value = data.map(cpu => ({
    ...cpu,
    isEstimated: false,
  }))
  
  // 设置默认基准
  const defaultBench = cpus.value.find(c =>
    c.model.toUpperCase().includes('12490F')
  )
  if (defaultBench) {
    benchmarkCpu.value = defaultBench
    console.log('[TierView] 找到基准CPU:', defaultBench.model, '分数:', defaultBench.abs_game_performance)
  } else {
    console.warn('[TierView] 未找到基准CPU 12490F')
  }
  
  // 从localStorage恢复对比栏
  loadCompareFromStorage()
}

// 搜索
function onSearchInput() {
  if (!searchQuery.value) {
    searchMatchCount.value = 0
    return
  }
  
  const q = searchQuery.value.toLowerCase()
  const matches = cpus.value.filter(c =>
    c.model.toLowerCase().includes(q)
  )
  
  searchMatchCount.value = matches.length
  
  // 滚动到第一个匹配
  if (matches.length > 0) {
    jumpToFirst()
  }
}

// 搜索结果一键添加到对比栏
function addAllSearchResults() {
  if (!searchQuery.value) return
  const q = searchQuery.value.toLowerCase()
  const matches = cpus.value.filter(c =>
    c.model.toLowerCase().includes(q)
  )
  let added = 0
  for (const cpu of matches) {
    if (compareList.value.length >= 4) break
    if (!compareList.value.find(c => c.id === cpu.id)) {
      compareList.value.push(cpu)
      added++
    }
  }
  saveCompareToStorage()
  if (added > 0) {
    console.log(`[TierView] 添加了 ${added} 个CPU到对比栏`)
  }
}

function jumpToFirst() {
  if (!searchQuery.value || !scatterPlot.value) return
  
  const q = searchQuery.value.toLowerCase()
  const first = positionedCpus.value.find(item =>
    item.cpus.some(c => c.model.toLowerCase().includes(q))
  )
  
  if (first) {
    const plot = scatterPlot.value
    const targetY = first.y // 百分比
    const scrollTarget = (targetY / 100) * plot.scrollHeight - plot.clientHeight / 2
    plot.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' })
  }
}

// Tooltip（CPU圆点）
function showTooltip(item: PositionedCpu, event: MouseEvent) {
  const cpu = item.cpus[0]
  tooltip.value = {
    visible: true,
    title: item.displayLabel,
    percent: getPerformancePercent(cpu),
    estimated: item.isEstimated,
    style: {
      position: 'fixed',
      left: (event.clientX + 12) + 'px',
      top: (event.clientY - 40) + 'px',
    },
  }
}

// Tooltip（系列标签）
function showLabelTooltip(label: SeriesLabel, event: MouseEvent) {
  if (!label.cpu) return
  tooltip.value = {
    visible: true,
    title: label.cpu.model,
    percent: getPerformancePercent(label.cpu),
    estimated: label.cpu.isEstimated || false,
    style: {
      position: 'fixed',
      left: (event.clientX + 12) + 'px',
      top: (event.clientY - 40) + 'px',
    },
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

// 详情弹窗
function showDetail(item: PositionedCpu) {
  closeCompare()
  detailModal.value = { show: true, cpu: item.cpus[0] }
}

function showDetailMobile(cpu: Cpu) {
  closeCompare()
  detailModal.value = { show: true, cpu }
}

function closeDetailModal() {
  detailModal.value = { show: false, cpu: null }
}

function setDetailAsBenchmark() {
  if (detailModal.value.cpu) {
    setAsBenchmark(detailModal.value.cpu)
  }
}

function showDetailFromCpu(cpu: Cpu) {
  closeCompare()
  detailModal.value = { show: true, cpu }
}

// 对标弹窗
function openBenchModal(cpu: Cpu | null) {
  if (compareList.value.length === 0) return
  benchModal.value = { show: true, selectedCpu: cpu || compareList.value[0] }
}

function closeBenchModal() {
  benchModal.value = { show: false, selectedCpu: null }
}

function onBenchItemClick(cpu: Cpu) {
  benchModal.value.selectedCpu = cpu
}

function setBenchmarkAndStay(cpu: Cpu) {
  setAsBenchmark(cpu)
  // 弹窗保持打开，百分比自动更新（因为 benchmarkCpu 变了，getPerformancePercent 会重新计算）
}

// 单击弹窗的CPU→添加到对比栏
function addDetailToCompare() {
  if (detailModal.value.cpu) {
    addToCompareCore(detailModal.value.cpu)
  }
}

function isInCompare(cpu: Cpu | null): boolean {
  if (!cpu) return false
  return compareList.value.some(c => c.id === cpu.id)
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
  if (!compareList.value.find(c => c.id === cpu.id)) {
    compareList.value.push(cpu)
    saveCompareToStorage()
  }
}

function removeFromCompare(cpu: Cpu) {
  compareList.value = compareList.value.filter(c => c.id !== cpu.id)
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
  const defaultBench = cpus.value.find(c =>
    c.model.toUpperCase().includes('12490F')
  )
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

// localStorage
function saveCompareToStorage() {
  const data = {
    compareList: compareList.value.map(c => c.id),
    benchmarkId: benchmarkCpu.value?.id,
  }
  localStorage.setItem('tier-compare', JSON.stringify(data))
}

function loadCompareFromStorage() {
  try {
    const stored = localStorage.getItem('tier-compare')
    if (!stored) return
    
    const data = JSON.parse(stored)
    if (data.benchmarkId) {
      const bench = cpus.value.find(c => c.id === data.benchmarkId)
      if (bench) benchmarkCpu.value = bench
    }
    if (data.compareList) {
      compareList.value = cpus.value.filter(c =>
        data.compareList.includes(c.id)
      )
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
onMounted(() => {
  console.log('[TierView] onMounted, isMobile:', window.innerWidth < 768)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleKeydown)
  loadCpus()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleKeydown)
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

/* Tab 切换 */
.tab-bar {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.tab-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
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
  color: white;
}

/* 建设中占位 */
.building-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px dashed var(--border);
  text-align: center;
}

.building-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.building-card h2 {
  color: var(--text-primary);
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.building-card p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 搜索栏 + 对比栏（同行，各占50%） */
.top-bar {
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

.search-count {
  font-size: 0.8rem;
  color: var(--accent);
  white-space: nowrap;
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
  overflow-x: auto;
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

.chip-brand.intel { color: #3b82f6; }
.chip-brand.amd { color: #ef4444; }

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

.chip-percent.intel { color: #3b82f6; }
.chip-percent.amd { color: #ef4444; }

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
  max-height: 75vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.y-axis {
  position: absolute;
  left: -48px;
  top: 0;
  bottom: 0;
  width: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.y-label {
  font-size: 0.65rem;
  color: var(--text-secondary);
  text-align: right;
  padding-right: 4px;
}

.y-label.top {
  color: var(--accent);
  font-weight: 600;
}

.y-label.mid {
  color: #f59e0b;
  font-weight: 600;
}

.y-label.mid-low {
  color: #eab308;
  font-weight: 500;
}

.y-label.bottom {
  color: #ef4444;
}

.scatter-plot {
  position: relative;
  height: 1800px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: visible;
}

/* Y轴网格线 */
.grid-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

.grid-line-mid {
  height: 2px;
  background: rgba(255, 255, 255, 0.15);
}

.grid-label {
  position: absolute;
  left: 4px;
  top: -12px;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.2);
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
  width: 5px;
  height: 5px;
  background: #FFD700;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  box-shadow: 0 0 3px rgba(255, 215, 0, 0.8);
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 10;
}

.cpu-dot:hover {
  transform: translate(-50%, -50%) scale(2.5);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.9);
  z-index: 20;
}

.cpu-dot.intel {
  background: #FFD700;
}

.cpu-dot.amd {
  background: #FFD700;
}

.cpu-dot.hollow {
  background: transparent;
  border: 1.5px solid #FFD700;
  width: 4px;
  height: 4px;
  box-shadow: 0 0 3px rgba(255, 215, 0, 0.6);
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
  text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6);
}

.cpu-dot:hover .dot-label {
  color: #FFD700;
  font-weight: 600;
}

/* 系列标签 */
.series-label {
  position: absolute;
  transform: translate(-50%, -100%);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
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
  color: #FFD700;
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
}

.modal-title.intel {
  color: #3b82f6;
}

.modal-title.amd {
  color: #ef4444;
}

.modal-close {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  min-width: 44px;
  min-height: 44px;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

.modal-body {
  padding: 0;
}

.modal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  min-height: 48px;
  transition: background 0.1s;
}

.modal-row.striped {
  background: rgba(255, 255, 255, 0.02);
}

.modal-label {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.modal-value {
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
}

.modal-btn {
  flex: 1;
  padding: 0.6rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
  min-height: 44px;
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.modal-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn.secondary {
  background: var(--border);
}

/* ========== 对比栏抽屉 ========== */
.compare-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  z-index: 500;
  transition: all 0.3s;
}

.drawer-inner {
  max-width: 1400px;
  margin: 0 auto;
}

.drawer-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  min-height: 44px;
  transition: background 0.15s;
}

.drawer-handle:hover {
  background: rgba(255, 255, 255, 0.05);
}

.handle-text {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
}

.handle-arrow {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.drawer-content {
  max-height: 50vh;
  overflow-y: auto;
  padding: 0 1rem 1rem;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.drawer-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.drawer-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.drawer-btn {
  padding: 0.3rem 0.6rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.75rem;
  min-height: 36px;
  transition: background 0.15s;
}

.drawer-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.drawer-btn.danger {
  color: #ef4444;
}

.drawer-btn.danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

.drawer-btn-close {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.drawer-btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

.benchmark-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.6rem;
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.benchmark-label {
  color: var(--text-secondary);
}

.benchmark-value {
  color: #FFD700;
  font-weight: 600;
}

.benchmark-percent {
  color: var(--text-secondary);
}

.compare-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.compare-empty {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.compare-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  min-height: 44px;
  transition: background 0.15s;
}

.compare-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.compare-item.is-benchmark {
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.compare-item-brand {
  font-size: 0.7rem;
  flex-shrink: 0;
}

.compare-item-brand.intel {
  color: #3b82f6;
}

.compare-item-brand.amd {
  color: #ef4444;
}

.compare-item-name {
  flex: 1;
  font-size: 0.8rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-item-percent {
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
}

.compare-item-percent.intel {
  color: #3b82f6;
}

.compare-item-percent.amd {
  color: #ef4444;
}

.compare-item-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  flex-shrink: 0;
  transition: all 0.15s;
}

.compare-item-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
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
  
  .tab-btn {
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
    min-height: 40px;
  }
  
  .scatter-container {
    display: none; /* 移动端隐藏散点图 */
  }
  
  .x-axis {
    display: none;
  }
}

/* ========== 搜索栏 +添加按钮 ========== */
.search-add-btn {
  margin-left: 0.5rem;
  padding: 0.15rem 0.5rem;
  background: #FFD700;
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
  background: #FFC000;
}

/* ========== 详情弹窗游戏性能行 ========== */
.modal-game-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  min-height: 48px;
  background: rgba(255, 215, 0, 0.06);
  border-bottom: 1px solid var(--border);
}
.modal-game-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.modal-game-value {
  font-size: 1rem;
  font-weight: 700;
}
.modal-game-value.intel { color: #3b82f6; }
.modal-game-value.amd { color: #ef4444; }
.modal-bench-hint {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: 0.3rem;
}

/* ========== 对标弹窗 ========== */
.bench-modal {
  max-width: 420px;
}
.bench-selected {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
}
.bench-selected-name {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}
.bench-selected-name.intel { color: #3b82f6; }
.bench-selected-name.amd { color: #ef4444; }
.bench-selected-game {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.bench-selected-params .modal-row {
  min-height: 40px;
  padding: 0.5rem 0.75rem;
}
.bench-compare-list {
  padding: 0.5rem 0.75rem;
}
.bench-compare-title {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
  padding-left: 0.25rem;
}
.bench-compare-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.15s;
}
.bench-compare-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
.bench-compare-item.is-selected {
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.2);
}
.bench-compare-item.is-benchmark .bench-item-name {
  color: #FFD700;
}
.bench-item-name {
  flex: 1;
  font-size: 0.8rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bench-item-pct {
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
}
.bench-item-pct.intel { color: #3b82f6; }
.bench-item-pct.amd { color: #ef4444; }
.bench-set-btn {
  padding: 0.2rem 0.5rem;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 4px;
  color: #FFD700;
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  min-height: 32px;
  transition: background 0.15s;
}
.bench-set-btn:hover {
  background: rgba(255, 215, 0, 0.3);
}
.bench-empty {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* ========== 对比栏内对标按钮 ========== */
.compare-bench-btn {
  padding: 0.25rem 0.6rem;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 4px;
  color: #FFD700;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  min-height: 28px;
  flex-shrink: 0;
  transition: all 0.15s;
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
  color: #FFD700;
  margin: 0.15rem 0;
}
.tooltip-bench {
  font-size: 0.7rem;
  color: var(--text-secondary);
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
</style>
