// ─── 全局筛选状态（CPU / GPU 共用） ───
import { ref, computed } from 'vue'

// ── 价格（已应用状态） ──
export const priceMin = ref<number | ''>('')
export const priceMax = ref<number | ''>('')

// ── 价格草稿（桌面端抽屉内编辑用） ──
export const priceMinDraft = ref<number | ''>('')
export const priceMaxDraft = ref<number | ''>('')

// ── CPU 插槽筛选（已应用状态） ──
export const cpuSocket = ref<string>('')  // '' | 'AM4' | 'AM5' | 'LGA1200' | 'LGA1700' | 'LGA1851'

// ── CPU 内存类型筛选（已应用状态） ──
export const cpuMemory = ref<string>('')  // '' | 'DDR4' | 'DDR5'

// ── CPU 插槽/内存草稿（桌面端抽屉内编辑用） ──
export const cpuSocketDraft = ref<string>('')
export const cpuMemoryDraft = ref<string>('')

// ── 选项列表 ──
export const cpuSocketOptions = [
  { value: '', label: '全部' },
  { value: 'AM4', label: 'AM4' },
  { value: 'AM5', label: 'AM5' },
  { value: 'LGA1200', label: 'LGA1200' },
  { value: 'LGA1700', label: 'LGA1700', note: 'DDR4/DDR5' },
  { value: 'LGA1851', label: 'LGA1851' },
]

export const cpuMemoryOptions = [
  { value: '', label: '全部' },
  { value: 'DDR4', label: 'DDR4' },
  { value: 'DDR5', label: 'DDR5' },
]

// ── 已应用状态的不兼容组合检测（摘要条警告） ──
export const incompatibleCombo = computed(() => {
  const s = cpuSocket.value
  const m = cpuMemory.value
  if (!s || !m) return null
  const map: Record<string, string[]> = {
    'AM4': ['DDR5'],
    'AM5': ['DDR4'],
    'LGA1200': ['DDR5'],
    'LGA1700': [],
    'LGA1851': ['DDR4'],
  }
  if (map[s]?.includes(m)) {
    return `${s} 插槽不支持 ${m} 内存，请重新选择`
  }
  return null
})

// ── 草稿状态的不兼容组合检测（抽屉内警告） ──
export const incompatibleComboDraft = computed(() => {
  const s = cpuSocketDraft.value
  const m = cpuMemoryDraft.value
  if (!s || !m) return null
  const map: Record<string, string[]> = {
    'AM4': ['DDR5'],
    'AM5': ['DDR4'],
    'LGA1200': ['DDR5'],
    'LGA1700': [],
    'LGA1851': ['DDR4'],
  }
  if (map[s]?.includes(m)) {
    return `${s} 插槽不支持 ${m} 内存，请重新选择`
  }
  return null
})

// ── 摘要文字（基于已应用状态） ──
export const cpuSocketLabel = computed(() => {
  if (!cpuSocket.value) return ''
  const opt = cpuSocketOptions.find(o => o.value === cpuSocket.value)
  return opt?.label || ''
})

export const cpuMemoryLabel = computed(() => {
  if (!cpuMemory.value) return ''
  const opt = cpuMemoryOptions.find(o => o.value === cpuMemory.value)
  return opt?.label || ''
})

// ── 价格快捷档位 ──
export const pricePresets = [
  { label: '500内', min: 0, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000-1500', min: 1000, max: 1500 },
  { label: '1500-2500', min: 1500, max: 2500 },
  { label: '2500以上', min: 2500, max: Infinity },
]

export const gpuPricePresets = pricePresets

// CPU 快捷档位匹配（基于已应用状态）
export const activePreset = computed(() =>
  pricePresets.find(p =>
    priceMin.value === p.min &&
    (priceMax.value === '' ? p.max === Infinity : priceMax.value === p.max)
  ) ?? null
)

// GPU 快捷档位匹配
export const gpuActivePreset = computed(() =>
  pricePresets.find(p =>
    gpuPriceMin.value === p.min &&
    (gpuPriceMax.value === '' ? p.max === Infinity : gpuPriceMax.value === p.max)
  ) ?? null
)

// ── 价格摘要（基于已应用状态） ──
export const cpuPriceLabel = computed(() => {
  if (priceMin.value === '' && priceMax.value === '') return '全部'
  const a = activePreset.value
  if (a) return a.label
  const min = priceMin.value === '' ? '?' : priceMin.value
  const max = priceMax.value === '' ? '?' : priceMax.value
  return `${min}–${max}`
})

// ── GPU 价格摘要 ──
export const gpuPriceLabel = computed(() => {
  if (gpuPriceMin.value === '' && gpuPriceMax.value === '') return '全部'
  const a = gpuActivePreset.value
  if (a) return a.label
  const min = gpuPriceMin.value === '' ? '?' : gpuPriceMin.value
  const max = gpuPriceMax.value === '' ? '?' : gpuPriceMax.value
  return `${min}–${max}`
})

// ── 价格区间匹配 ──
export const priceInRange = (
  newPrice: number | null,
  usedPrice: number | null,
  min: number,
  max: number
): boolean => {
  if (newPrice !== null && newPrice >= min && newPrice <= max) return true
  if (usedPrice !== null && usedPrice >= min && usedPrice <= max) return true
  return false
}

// ── 清除函数 ──
export const clearCpuPrice = () => {
  priceMin.value = ''
  priceMax.value = ''
}

export const clearCpuSocket = () => { cpuSocket.value = '' }
export const clearCpuMemory = () => { cpuMemory.value = '' }

export const clearCpuAllFilters = () => {
  priceMin.value = ''
  priceMax.value = ''
  cpuSocket.value = ''
  cpuMemory.value = ''
}

// ── 草稿同步/应用函数 ──
/** 同步已应用状态 → 草稿（打开抽屉时调用） */
export const syncPriceDraftFromApplied = () => {
  priceMinDraft.value = priceMin.value
  priceMaxDraft.value = priceMax.value
}

/** 应用价格草稿 → 已应用状态 */
export const applyPriceDraft = () => {
  priceMin.value = priceMinDraft.value
  priceMax.value = priceMaxDraft.value
}

/** 同步已应用状态 → 草稿（插槽/内存） */
export const syncCpuFilterDraftFromApplied = () => {
  cpuSocketDraft.value = cpuSocket.value
  cpuMemoryDraft.value = cpuMemory.value
}

/** 应用插槽/内存草稿 → 已应用状态 */
export const applyCpuFilterDraft = () => {
  cpuSocket.value = cpuSocketDraft.value
  cpuMemory.value = cpuMemoryDraft.value
}

/** 重置草稿（不清已应用，关闭抽屉生效） */
export const resetPriceDraft = () => {
  priceMinDraft.value = ''
  priceMaxDraft.value = ''
}

/** 重置插槽/内存草稿（不清已应用） */
export const resetCpuFilterDraft = () => {
  cpuSocketDraft.value = ''
  cpuMemoryDraft.value = ''
}

// ── GPU 年限区间（1年内/3年内） ──
export const gpuYearPreset = ref<number | null>(null)

// ── GPU 发售年份区间（精确年份） ──
export const gpuYearStart = ref<number | null>(null)
export const gpuYearEnd = ref<number | null>(null)

// ── GPU 价格（已应用） ──
export const gpuPriceMin = ref<number | ''>('')
export const gpuPriceMax = ref<number | ''>('')

// GPU 年限标签
export const gpuYearLabel = computed(() => {
  if (gpuYearPreset.value === null) return '全部'
  return `${gpuYearPreset.value}年内`
})

// GPU 快捷档位 apply
export const applyGpuPreset = (preset: typeof pricePresets[0]) => {
  gpuPriceMin.value = preset.min
  gpuPriceMax.value = preset.max === Infinity ? '' : preset.max
}

// 年份校验错误信息
export const gpuYearStartError = ref<string>('')
export const gpuYearEndError = ref<string>('')
export const gpuYearCrossError = ref<string>('')

const YEAR_MIN = 2000
const YEAR_MAX = 2027

export const validateYearStart = () => {
  const v = gpuYearStart.value
  if (v === null || v === 0) {
    gpuYearStartError.value = ''
    return true
  }
  if (!Number.isInteger(v) || v < YEAR_MIN || v > YEAR_MAX) {
    gpuYearStartError.value = `请输入 ${YEAR_MIN}-${YEAR_MAX} 之间的年份`
    return false
  }
  gpuYearStartError.value = ''
  return true
}

export const validateYearEnd = () => {
  const v = gpuYearEnd.value
  if (v === null || v === 0) {
    gpuYearEndError.value = ''
    return true
  }
  if (!Number.isInteger(v) || v < YEAR_MIN || v > YEAR_MAX) {
    gpuYearEndError.value = `请输入 ${YEAR_MIN}-${YEAR_MAX} 之间的年份`
    return false
  }
  gpuYearEndError.value = ''
  return true
}

export const validateYearCross = () => {
  const s = gpuYearStart.value
  const e = gpuYearEnd.value
  if (s !== null && s !== 0 && e !== null && e !== 0) {
    if (s > e) {
      gpuYearCrossError.value = '起始年不能晚于结束年'
      return false
    }
  }
  gpuYearCrossError.value = ''
  return true
}

// ── GPU 清除函数 ──
export const clearGpuPrice = () => {
  gpuPriceMin.value = ''
  gpuPriceMax.value = ''
}
export const clearGpuYear = () => {
  gpuYearPreset.value = null
}
export const clearGpuYearExact = () => {
  gpuYearStart.value = null
  gpuYearEnd.value = null
  gpuYearStartError.value = ''
  gpuYearEndError.value = ''
  gpuYearCrossError.value = ''
}