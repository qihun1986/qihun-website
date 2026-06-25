<template>
  <div class="hardware-dashboard">
    <!-- 双轮播 -->
    <div class="top-bar-dual">
      <CarouselBanner type="deal" :items="dealItems" @card-click="onDealCardClick" />
      <CarouselBanner type="video" :items="videoItems" />
    </div>

    <!-- 桌面端搜索 -->
    <div class="action-toolbar desktop-only">
      <div class="action-btns">
        <div class="search-bar">
          <input v-model="searchQuery" type="text" placeholder="🔍 搜索型号" />
        </div>
      </div>
    </div>

        <!-- 表格 + 悬浮按钮包装 -->
    <div class="table-with-fab">
      <div class="table-wrapper">
      <table class="cpu-table">
        <thead>
          <tr>
            <th class="rank-col">序号</th>
            <th class="type-col desktop-only">
              <div class="th-stack">
                <span>品类</span>
                <select v-model="activeType" class="value-select" @click.stop>
                  <option v-for="type in partTypes" :key="type.key" :value="type.key">{{ type.label }}</option>
                </select>
              </div>
            </th>
            <th class="brand-col desktop-only">
              <div class="th-stack"><span>品牌</span></div>
            </th>
            <th class="model-col">
              <div class="th-stack"><span>型号</span></div>
            </th>
            <!-- 价格列：下方放置“全新”按钮 -->
            <th class="price-col sortable merged-left" @click="sortBy('price')">
              <div class="th-stack">
                <span>价格 <span class="sort-icon">{{ getSortIcon('price') }}</span></span>
                <button
                  :class="{ active: priceType === 'new' }"
                  class="price-type-btn"
                  @click.stop="priceType = 'new'"
                >全新</button>
              </div>
            </th>
            <!-- 涨跌列：下方放置“二手”按钮 -->
            <th class="change-col sortable merged-right" @click="sortBy('change')">
              <div class="th-stack">
                <span>涨跌 <span class="sort-icon">{{ getSortIcon('change') }}</span></span>
                <button
                  :class="{ active: priceType === 'used' }"
                  class="price-type-btn"
                  @click.stop="priceType = 'used'"
                >二手</button>
              </div>
            </th>
            <th class="retention-col sortable desktop-only" @click="sortBy('retention')">
              <div class="th-stack">
                <span>回血率 <span class="sort-icon">{{ getSortIcon('retention') }}</span></span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(part, index) in filteredParts" :key="part.id" class="cpu-row">
            <td class="rank">{{ index + 1 }}</td>
            <td class="type-cell desktop-only">
              <span :class="['type-badge', 'type-badge-' + part.part_type]">{{ partTypeLabel(part.part_type) }}</span>
            </td>
            <td class="brand-cell desktop-only">{{ part.brand }}</td>
            <td class="model-cell">
              <a :href="part.jd_link" target="_blank" class="part-link">{{ part.model }}</a>
            </td>
            <td class="price-cell merged-left" @click.stop="openPriceChart(part)" title="点击查看价格走势">
              {{ formatPrice(getPrice(part)) }}
            </td>
            <td class="change-cell merged-right" @click.stop="openPriceChart(part)" title="点击查看价格走势">
              <span :class="priceChangeClass(part)">{{ priceChangeText(part) }}</span>
              <span v-if="isNearHistoricalLow(part)" class="fire-icon">🔥</span>
            </td>
            <td class="retention-cell desktop-only">
              <span class="value-bar" :class="retentionLevel(part.retention_pct)">
                {{ part.retention_pct ? Math.round(part.retention_pct) + '%' : '-' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredParts.length === 0" class="empty">暂时没有符合条件的配件</div>
    </div>
    </div>

    <!-- 移动端悬浮按钮 -->
    <button v-if="isMobile" class="mobile-fab" @click="showMobileFilter = true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M2.5 4h15M5.5 10h9M8.5 16h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- 移动端筛选面板（保留品类、价格类型、搜索） -->
    <Teleport to="body">
      <div v-if="showMobileFilter" class="mobile-filter-overlay" @click.self="showMobileFilter = false">
        <div class="mobile-filter-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-body">
            <div class="filter-section">
              <div class="section-label">品类</div>
              <div class="option-btns">
                <button v-for="type in partTypes" :key="type.key"
                  :class="{ active: activeType === type.key }"
                  class="preset-btn" @click="activeType = type.key">{{ type.label }}</button>
              </div>
            </div>
            <div class="filter-section">
              <div class="section-label">价格类型</div>
              <div class="inline-toggle">
                <button :class="{ active: priceType === 'new' }" @click="priceType = 'new'">全新</button>
                <button :class="{ active: priceType === 'used' }" @click="priceType = 'used'">二手</button>
              </div>
            </div>
            <div class="filter-section">
              <div class="section-label">搜索</div>
              <input v-model="searchQuery" type="text" placeholder="🔍 搜索型号" class="mobile-search-input" />
            </div>
          </div>
          <div class="sheet-actions">
            <button class="reset-btn" @click="activeType = 'all'; priceType = 'new'; searchQuery = ''">重置</button>
            <button class="confirm-btn" @click="showMobileFilter = false">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <PartPriceChartModal ref="chartModal" :history-data="historyData" />
    <DealModal ref="dealModal" :deals-text="dealsText" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PartPriceChartModal from './PartPriceChartModal.vue'
import CarouselBanner from './CarouselBanner.vue'
import DealModal from './DealModal.vue'

const props = defineProps({
  initialParts: String,
  initialHistory: String,
  initialMinPriceMap: String,
  initialDealItems: String,
  initialVideoItems: String,
  initialDealsText: String
})

const parts = ref(JSON.parse(props.initialParts || '[]'))
const historyData = ref(JSON.parse(props.initialHistory || '[]'))
const minPriceMap = ref(new Map(JSON.parse(props.initialMinPriceMap || '[]')))
const dealItems = ref(JSON.parse(props.initialDealItems || '[]'))
const videoItems = ref(JSON.parse(props.initialVideoItems || '[]'))
const dealsText = ref(JSON.parse(props.initialDealsText || '""'))

const activeType = ref('all')
const searchQuery = ref('')
const priceType = ref('new')
const sortKey = ref('retention')
const sortOrder = ref('desc')
const isMobile = ref(false)
const showMobileFilter = ref(false)
const chartModal = ref(null)

const partTypes = computed(() => {
  const types = parts.value.map(p => p.part_type)
  return [{ key: 'all', label: '全部' }, ...new Set(types)].map(t => typeof t === 'string' ? { key: t, label: partTypeLabel(t) } : t)
})

function partTypeLabel(type) {
  const map = { memory: '内存', ssd: '硬盘', motherboard: '主板', cpu_cooler: 'CPU散热', case: '机箱', power: '电源' }
  return map[type] || type
}

const filteredParts = computed(() => {
  let list = parts.value
  if (activeType.value !== 'all') list = list.filter(p => p.part_type === activeType.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.model.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
  }
  const key = sortKey.value
  const order = sortOrder.value
  return [...list].sort((a, b) => {
    let va, vb
    if (key === 'price') { va = getPrice(a) ?? Infinity; vb = getPrice(b) ?? Infinity }
    else if (key === 'change') {
      va = Math.abs((priceType.value === 'new' ? a.price_new_change : a.price_used_change) || 0)
      vb = Math.abs((priceType.value === 'new' ? b.price_new_change : b.price_used_change) || 0)
    } else if (key === 'retention') { va = a.retention_pct ?? 0; vb = b.retention_pct ?? 0 }
    else return 0
    return order === 'asc' ? va - vb : vb - va
  })
})

function getPrice(part) { return priceType.value === 'new' ? part.price_new : part.price_used }
function formatPrice(price) { return price == null ? '-' : '¥' + price.toLocaleString('zh-CN') }
function priceChangeText(part) {
  const dir = priceType.value === 'new' ? part.price_new_direction : part.price_used_direction
  const ch = priceType.value === 'new' ? part.price_new_change : part.price_used_change
  if (!dir || dir === 'flat' || !ch) return '—'
  return (dir === 'up' ? '↑' : '↓') + Math.abs(ch)
}
function priceChangeClass(part) {
  const dir = priceType.value === 'new' ? part.price_new_direction : part.price_used_direction
  if (dir === 'up') return 'price-up'
  if (dir === 'down') return 'price-down'
  return ''
}
function isNearHistoricalLow(part) {
  const price = getPrice(part)
  if (!price) return false
  const rec = minPriceMap.value.get(part.model)
  if (!rec) return false
  const min = priceType.value === 'new' ? rec.min_new : rec.min_used
  return min != null && price <= min * 1.03
}
function retentionLevel(pct) {
  if (pct >= 80) return 'val-legendary'
  if (pct >= 60) return 'val-normal'
  return 'val-bad'
}
function sortBy(key) {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortOrder.value = key === 'retention' ? 'desc' : 'asc' }
}
function getSortIcon(key) {
  return sortKey.value !== key ? '↕' : sortOrder.value === 'asc' ? '↑' : '↓'
}
function openPriceChart(part) { chartModal.value?.show(part.model) }
function onDealCardClick() { if (window.__showDealModal) window.__showDealModal() }
function checkMobile() { isMobile.value = window.innerWidth < 768 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })
</script>

<style scoped>
.hardware-dashboard { max-width: 1400px; margin: 0 auto; padding: var(--space-md); }

/* ═══════════ 顶部双轮播 ═══════════ */
.top-bar-dual { display: flex; gap: 1rem; margin-bottom: 1rem; }
.top-bar-dual > * { flex: 1; min-width: 0; }

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

/* 全新/二手按钮样式 */
.price-type-btn {
  padding: 0.12rem 0.45rem;
  font-size: 0.7rem;
  background: var(--highlight-bg);
  border: 1px solid var(--highlight-border);
  border-radius: 4px;
  color: var(--accent);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.price-type-btn.active {
  background: var(--value-gold-bg);
  color: var(--value-gold-text);
  font-weight: 600;
  border-color: var(--table-border-gold);
}

/* 品类下拉 */
.value-select {
  padding: 0.15rem 0.3rem; font-size: 0.68rem;
  background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: 4px; color: var(--text-primary); cursor: pointer;
}

/* ═══════════ 表格容器 ═══════════ */
.table-wrapper {
  max-height: 75vh; overflow: auto; background: var(--bg-secondary);
  border: 1px solid var(--table-border-gold); outline: 1.5px solid var(--table-outline-blue);
  outline-offset: 2px; border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
}

/* ═══════════ 表格基础 ═══════════ */
.cpu-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cpu-table thead { position: sticky; top: 0; z-index: 20; }
.cpu-table th {
  padding: 0.5rem 0.4rem; font-weight: 600; color: var(--thead-text);
  font-size: 0.82rem; white-space: nowrap; text-align: center;
  background: var(--bg-tertiary); border-bottom: 1px solid var(--border);
}
.cpu-table td {
  padding: 0.65rem 0.4rem; font-size: 0.88rem; color: var(--text-primary);
  border-bottom: 1px solid var(--table-divider); text-align: center;
}
.cpu-row { transition: none; }

/* 型号列左对齐 */
th.model-col { text-align: left; }
td.model-cell { text-align: left !important; }

/* ═══════════ 价格/涨跌融合（桌面端） ═══════════ */
th.merged-left,
td.merged-left {
  border-right: none;
  padding-left: 0.4rem;
  padding-right: 0;
  text-align: right;
}
th.merged-right,
td.merged-right {
  border-left: none;
  padding-left: 0;
  padding-right: 0.4rem;
  text-align: left;
}

/* 全新按钮靠右，二手按钮靠左 */
.price-col .th-stack .price-type-btn {
  align-self: flex-end;
}
.change-col .th-stack .price-type-btn {
  align-self: flex-start;
}

/* 价格/涨跌单元格可点击 */
.cpu-table td.price-cell,
.cpu-table td.change-cell { cursor: pointer; }

/* ═══════════ 桌面列宽（fixed 模式） ═══════════ */
.rank-col { width: 6%; }
.type-col { width: 11%; }
.brand-col { width: 9%; }
.model-col { width: 28%; }
.price-col { width: 15%; }
.change-col { width: 15%; }
.retention-col { width: 9%; }

/* ═══════════ 排序图标 ═══════════ */
.sort-icon {
  display: inline-block; padding: 2px 6px; border-radius: 4px;
  background: var(--value-gold-bg); color: var(--accent);
  font-size: 0.65rem; cursor: pointer; margin-left: 0.2rem;
}

/* ═══════════ 回血率胶囊 ═══════════ */
.value-bar {
  display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
  font-size: 0.82rem; font-weight: 600; min-width: 46px;
}
.val-legendary { background: var(--value-gold-bg); color: var(--value-gold-text); }
.val-normal { background: var(--value-cyan-bg); color: var(--value-cyan-text); }
.val-bad { background: var(--value-red-bg); color: var(--value-red-text); }

/* ═══════════ 涨跌颜色 ═══════════ */
.price-up { color: var(--price-up); }
.price-down { color: var(--price-down); }
.price-flat { color: var(--text-secondary); }

/* ═══════════ 小火苗 ═══════════ */
.fire-icon { font-size: 0.8rem; margin-left: 0.15rem; }

/* ═══════════ 型号链接 ═══════════ */
.part-link { color: var(--accent); text-decoration: none; font-weight: 500; }
.part-link:hover { text-decoration: underline; }

/* ═══════════ 空状态 ═══════════ */
.empty { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.9rem; }

/* ═══════════ 移动端悬浮按钮 ═══════════ */
.mobile-fab {
  position: fixed; right: 1rem; bottom: 3rem; z-index: 500;
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--bg-secondary); border: 1.5px solid var(--brand-border-strong);
  color: var(--accent); box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}

/* ═══════════ 移动端筛选面板 ═══════════ */
.mobile-filter-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000; opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.25s ease, visibility 0.25s ease;
}
.mobile-filter-overlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.mobile-filter-sheet {
  background: var(--bg-secondary); border-radius: var(--radius-full) var(--radius-full) 0 0;
  width: 100%; max-height: 80vh; display: flex; flex-direction: column;
  padding: 1rem; transform: translateY(100%); transition: transform 0.3s ease;
}
.mobile-filter-overlay.show .mobile-filter-sheet { transform: translateY(0); }
.sheet-handle { width: 36px; height: 4px; background: var(--modal-handle); border-radius: 2px; margin: 0 auto 0.75rem; }
.sheet-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.sheet-actions { display: flex; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border); flex-shrink: 0; }
.sheet-actions button {
  flex: 1; padding: 0.6rem; border-radius: 10px; font-size: 0.85rem;
  cursor: pointer; background: var(--highlight-bg); border: 1px solid var(--border); color: var(--text-primary);
}
.sheet-actions .confirm-btn { background: var(--accent); color: var(--btn-gold-text); font-weight: 600; border: none; }
.mobile-search-input {
  width: 100%; padding: 0.6rem; background: var(--bg-secondary);
  border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.9rem;
}

/* ═══════════ 响应式（移动端） ═══════════ */
@media (max-width: 768px) {
  .top-bar-dual { flex-direction: column; }
  .desktop-only { display: none; }
  .brand-col, .brand-cell,
  .type-col, .type-cell,
  .retention-col, .retention-cell { display: none; }
  .action-toolbar { display: none; }

  .rank-col { width: 12%; }
  .model-col { width: 44%; }
  .price-col { width: 22%; }
  .change-col { width: 22%; }

  th.merged-left,
  td.merged-left {
    border-right: none !important;
    padding-left: 0.4rem;
    padding-right: 0;
    text-align: right;
  }
  th.merged-right,
  td.merged-right {
    border-left: none !important;
    padding-left: 0;
    padding-right: 0.4rem;
    text-align: left;
  }
}
</style>