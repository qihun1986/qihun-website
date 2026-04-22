<template>
  <Teleport to="body">
    <!-- 悬浮筛选按钮 -->
    <button
      v-show="!visible"
      class="mobile-filter-fab"
      @click="openSheet"
      aria-label="筛选"
    >
      <span class="fab-icon">⛶</span>
    </button>

    <!-- 底部浮层 -->
    <Transition name="sheet">
      <div v-if="visible" class="mobile-filter-overlay" @click.self="closeSheet">
        <div class="mobile-filter-sheet">
          <!-- 顶部把手 -->
          <div class="sheet-handle" @click="closeSheet">
            <div class="handle-bar"></div>
          </div>

          <!-- 内容区 -->
          <div class="sheet-content">
            <!-- 价格区间输入 -->
            <div class="price-section">
              <div class="section-label">价格区间</div>
              <div class="price-inputs">
                <input
                  v-model="localMin"
                  type="number"
                  placeholder="最低"
                  min="0"
                  class="price-input"
                  inputmode="numeric"
                />
                <span class="price-sep">—</span>
                <input
                  v-model="localMax"
                  type="number"
                  placeholder="最高"
                  min="0"
                  class="price-input"
                  inputmode="numeric"
                />
              </div>
            </div>

            <!-- 预设档位 -->
            <div class="preset-section">
              <div class="section-label">快捷选择</div>
              <div class="preset-grid">
                <button
                  v-for="preset in presets"
                  :key="preset.label"
                  :class="{ active: activePresetLocal === preset.label }"
                  class="preset-btn"
                  @click="applyPreset(preset)"
                >{{ preset.label }}</button>
              </div>
            </div>

            <!-- 年限筛选（仅 GPU 模式） -->
            <div v-if="mode === 'gpu'" class="year-section">
              <div class="section-label">发售年限</div>
              <div class="year-inputs">
                <input
                  v-model="localYearStart"
                  type="number"
                  placeholder="2015"
                  min="2000"
                  max="2027"
                  class="year-input"
                  :class="{ error: yearStartError }"
                  inputmode="numeric"
                  @input="onYearInput('start')"
                />
                <span class="year-sep">—</span>
                <input
                  v-model="localYearEnd"
                  type="number"
                  placeholder="2027"
                  min="2000"
                  max="2027"
                  class="year-input"
                  :class="{ error: yearEndError }"
                  inputmode="numeric"
                  @input="onYearInput('end')"
                />
              </div>
              <div class="year-preset-row">
                <button
                  :class="{ active: localYearPreset === 1 }"
                  class="year-preset-btn"
                  @click="setYearPreset(1)"
                >1年内</button>
                <button
                  :class="{ active: localYearPreset === 3 }"
                  class="year-preset-btn"
                  @click="setYearPreset(3)"
                >3年内</button>
                <button
                  v-if="localYearPreset !== null || localYearStart !== '' || localYearEnd !== ''"
                  class="year-clear-btn"
                  @click="clearYearFilter"
                >✕ 清空</button>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="sheet-actions">
            <button class="clear-btn" @click="clearAll">清空</button>
            <button class="confirm-btn" @click="confirmAndClose">确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import {
  priceMin, priceMax, pricePresets, activePreset,
  gpuPriceMin, gpuPriceMax, gpuActivePreset,
  gpuYearPreset, gpuYearStart, gpuYearEnd, validateGpuYearRange,
  clearCpuPrice, clearGpuPrice, clearGpuYear
} from './useFilterBar'

const props = defineProps<{
  mode: 'cpu' | 'gpu'
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
}>()

const visible = ref(false)
const presets = pricePresets

// 本地状态（编辑中）
const localMin = ref<number | ''>('')
const localMax = ref<number | ''>('')
const localYearPreset = ref<number | null>(null)
const localYearStart = ref<number | ''>('')
const localYearEnd = ref<number | ''>('')
const yearStartError = ref(false)
const yearEndError = ref(false)
const activePresetLocal = ref<string | null>(null)

// 计算当前激活的预设
const activePresetComputed = computed(() => {
  if (props.mode === 'cpu') {
    return activePreset.value?.label || null
  } else {
    return gpuActivePreset.value?.label || null
  }
})

// 同步外部状态到本地
watch([visible, () => props.mode], ([isVisible]) => {
  if (isVisible) {
    if (props.mode === 'cpu') {
      localMin.value = priceMin.value
      localMax.value = priceMax.value
    } else {
      localMin.value = gpuPriceMin.value
      localMax.value = gpuPriceMax.value
      localYearPreset.value = gpuYearPreset.value
      localYearStart.value = gpuYearStart.value
      localYearEnd.value = gpuYearEnd.value
      yearStartError.value = false
      yearEndError.value = false
    }
    activePresetLocal.value = activePresetComputed.value
  }
}, { immediate: true })

// 打开浮层
const openSheet = () => {
  visible.value = true
  document.body.style.overflow = 'hidden'
}

// 关闭浮层（不应用）
const closeSheet = () => {
  visible.value = false
  document.body.style.overflow = ''
}

// 应用预设
const applyPreset = (preset: typeof pricePresets[0]) => {
  localMin.value = preset.min
  localMax.value = preset.max === Infinity ? '' : preset.max
  activePresetLocal.value = preset.label
}

// 设置年限预设
const setYearPreset = (val: number | null) => {
  localYearPreset.value = val
  // 预设和输入互斥
  if (val !== null) {
    localYearStart.value = ''
    localYearEnd.value = ''
    yearStartError.value = false
    yearEndError.value = false
  }
}

// 年份输入时校验
const onYearInput = (field: 'start' | 'end') => {
  // 输入时清空预设
  if (localYearPreset.value !== null) {
    localYearPreset.value = null
  }
  
  const val = field === 'start' ? localYearStart.value : localYearEnd.value
  if (val === '') {
    if (field === 'start') yearStartError.value = false
    else yearEndError.value = false
    return
  }
  
  const num = Number(val)
  if (num < 2000 || num > 2027) {
    if (field === 'start') yearStartError.value = true
    else yearEndError.value = true
  } else {
    if (field === 'start') yearStartError.value = false
    else yearEndError.value = false
  }
}

// 清空年份筛选
const clearYearFilter = () => {
  localYearPreset.value = null
  localYearStart.value = ''
  localYearEnd.value = ''
  yearStartError.value = false
  yearEndError.value = false
}

// 清空所有
const clearAll = () => {
  localMin.value = ''
  localMax.value = ''
  activePresetLocal.value = null
  if (props.mode === 'gpu') {
    clearYearFilter()
  }
}

// 确认并关闭
const confirmAndClose = () => {
  // 校验年份
  if (yearStartError.value || yearEndError.value) return
  
  if (props.mode === 'cpu') {
    priceMin.value = localMin.value
    priceMax.value = localMax.value
  } else {
    gpuPriceMin.value = localMin.value
    gpuPriceMax.value = localMax.value
    gpuYearPreset.value = localYearPreset.value
    gpuYearStart.value = localYearStart.value
    gpuYearEnd.value = localYearEnd.value
  }
  visible.value = false
  document.body.style.overflow = ''
  emit('confirm')
}

// ESC 关闭
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && visible.value) {
    closeSheet()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

defineExpose({ openSheet, closeSheet })
</script>

<style scoped>
/* 悬浮按钮 */
.mobile-filter-fab {
  position: fixed;
  right: 16px;
  bottom: 80px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FFB347 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 800;
  transition: transform 0.2s, box-shadow 0.2s;
}

.mobile-filter-fab:active {
  transform: scale(0.92);
}

.fab-icon {
  font-size: 22px;
  color: #1a1a2e;
}

/* 遮罩 */
.mobile-filter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 900;
  display: flex;
  align-items: flex-end;
  -webkit-tap-highlight-color: transparent;
}

/* 浮层 */
.mobile-filter-sheet {
  width: 100%;
  max-height: 65vh;
  background: #1a1a2e;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* 顶部把手 */
.sheet-handle {
  padding: 12px 0 8px;
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
}

/* 内容区 */
.sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 16px;
}

.section-label {
  font-size: 13px;
  color: #B0B0C0;
  margin-bottom: 10px;
  font-weight: 500;
}

.price-section,
.preset-section,
.year-section {
  margin-bottom: 20px;
}

/* 价格输入 */
.price-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.price-input {
  flex: 1;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #E8E8F0;
  font-size: 16px;
  text-align: center;
  font-family: 'Roboto Mono', monospace;
}

.price-input:focus {
  outline: none;
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.06);
}

.price-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.price-sep {
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
}

/* 预设按钮网格 */
.preset-grid,
.year-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-btn,
.year-btn {
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 48px;
}

.preset-btn:hover,
.year-btn:hover {
  border-color: rgba(255, 215, 0, 0.4);
  color: rgba(255, 215, 0, 0.85);
}

.preset-btn.active,
.year-btn.active {
  background: rgba(255, 215, 0, 0.18);
  border-color: rgba(255, 215, 0, 0.7);
  color: #FFD700;
  font-weight: 600;
}

/* 年份输入 */
.year-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.year-input {
  flex: 1;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #E8E8F0;
  font-size: 16px;
  text-align: center;
  font-family: 'Roboto Mono', monospace;
}

.year-input:focus {
  outline: none;
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.06);
}

.year-input.error {
  border-color: #ff5555 !important;
  background: rgba(255, 60, 60, 0.08) !important;
}

.year-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.year-sep {
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
}

.year-preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.year-preset-btn {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 48px;
}

.year-preset-btn:hover {
  border-color: rgba(255, 215, 0, 0.4);
  color: rgba(255, 215, 0, 0.85);
}

.year-preset-btn.active {
  background: rgba(255, 215, 0, 0.18);
  border-color: rgba(255, 215, 0, 0.7);
  color: #FFD700;
  font-weight: 600;
}

.year-clear-btn {
  padding: 12px 14px;
  background: transparent;
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 12px;
  color: rgba(255, 120, 120, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 48px;
}

.year-clear-btn:hover {
  background: rgba(255, 80, 80, 0.1);
  border-color: rgba(255, 80, 80, 0.5);
  color: #ff8888;
}

/* 底部按钮 */
.sheet-actions {
  display: flex;
  gap: 12px;
  padding: 12px 20px 20px;
  background: rgba(0, 0, 0, 0.2);
}

.clear-btn,
.confirm-btn {
  flex: 1;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
}

.clear-btn:hover {
  background: rgba(255, 80, 80, 0.1);
  border-color: rgba(255, 80, 80, 0.4);
  color: #ff8888;
}

.confirm-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFB347 100%);
  border: none;
  color: #1a1a2e;
}

.confirm-btn:hover {
  filter: brightness(1.08);
}

/* 动画 */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s;
}

.sheet-enter-active .mobile-filter-sheet,
.sheet-leave-active .mobile-filter-sheet {
  transition: transform 0.25s ease-out;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .mobile-filter-sheet,
.sheet-leave-to .mobile-filter-sheet {
  transform: translateY(100%);
}
</style>

<!-- 全局样式：仅移动端显示 -->
<style>
/* 移动端隐藏桌面抽屉 */
@media (max-width: 768px) {
  .filter-drawer {
    display: none !important;
  }
}
</style>
