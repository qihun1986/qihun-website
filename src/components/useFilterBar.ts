// ─── 全局筛选状态（CPU / GPU 共用） ───
import { ref, computed } from 'vue'

// ── 价格 ──
export const priceMin = ref<number | ''>('')
export const priceMax = ref<number | ''>('')
export const gpuPriceMin = ref<number | ''>('')
export const gpuPriceMax = ref<number | ''>('')

export const pricePresets = [
  { label: '500内', min: 0, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000-1500', min: 1000, max: 1500 },
  { label: '1500-2500', min: 1500, max: 2500 },
  { label: '2500以上', min: 2500, max: Infinity },
]

export const gpuPricePresets = pricePresets

// CPU 快捷档位匹配
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

// ── GPU 年限区间（1年内/3年内） ──
export const gpuYearPreset = ref<number | null>(null)  // 1 或 3 或 null

export const gpuYearLabel = computed(() => {
  if (gpuYearPreset.value === null) return '全部'
  return `${gpuYearPreset.value}年内`
})

// GPU 快捷档位 apply（抽出来复用）
export const applyGpuPreset = (preset: typeof pricePresets[0]) => {
  gpuPriceMin.value = preset.min
  gpuPriceMax.value = preset.max === Infinity ? '' : preset.max
}

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

// ── GPU 价格摘要 ──
export const gpuPriceLabel = computed(() => {
  if (gpuPriceMin.value === '' && gpuPriceMax.value === '') return '全部'
  const a = gpuActivePreset.value
  if (a) return a.label
  const min = gpuPriceMin.value === '' ? '?' : gpuPriceMin.value
  const max = gpuPriceMax.value === '' ? '?' : gpuPriceMax.value
  return `${min}–${max}`
})

// ── CPU 价格摘要 ──
export const cpuPriceLabel = computed(() => {
  if (priceMin.value === '' && priceMax.value === '') return '全部'
  const a = activePreset.value
  if (a) return a.label
  const min = priceMin.value === '' ? '?' : priceMin.value
  const max = priceMax.value === '' ? '?' : priceMax.value
  return `${min}–${max}`
})

// ── 清除 ──
export const clearCpuPrice = () => {
  priceMin.value = ''
  priceMax.value = ''
}
export const clearGpuPrice = () => {
  gpuPriceMin.value = ''
  gpuPriceMax.value = ''
}
export const clearGpuYear = () => {
  gpuYearPreset.value = null
}
