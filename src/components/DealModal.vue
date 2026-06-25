<template>
  <div :class="{ show: visible, ready: ready }" class="modal-overlay deal-modal-overlay" @click.self="close">
    <div class="modal-panel">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h3>⚡ 特价清单</h3>
        <button class="modal-close-btn" @click="close">×</button>
      </div>
      <div class="modal-body">
        <div class="deals-content" v-html="formattedText"></div>
        <div class="deal-footer">信息具有时效性，仅供参考</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  dealsText: { type: String, default: '' }
})

// 优化后的代码（完美保留格式）
const formattedText = computed(() => {
  if (!props.dealsText) return ''
  let s = props.dealsText
  // 1. 统一换行符：将所有 \r\n 和单独的 \r 都转成 \n
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // 2. 安全转义
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 3. 链接可点击
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  // 4. 不再用 <br> 替换 \n，完全交给 CSS 的 white-space: pre-wrap 处理
  return s
})

const visible = ref(false)
const ready = ref(false)

function show() {
  visible.value = true
  if (!window.history.state?.modal) {
    history.pushState({ modal: 'dealModal' }, '')
  }
}

function close() {
  visible.value = false
  if (window.history.state?.modal) {
    history.back()
  }
}

const onPopState = () => {
  if (visible.value) close()
}

onMounted(() => {
  ready.value = true
  if (typeof window !== 'undefined') {
    window.__showDealModal = show
  }
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.__showDealModal = undefined
  }
  window.removeEventListener('popstate', onPopState)
})

defineExpose({ show })
</script>

<style scoped>
/* 与全局动画统一 */
.deal-modal-overlay {
  position: fixed; inset: 0; background: var(--modal-overlay);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: none;
}
.deal-modal-overlay.ready {
  transition: opacity 0.25s ease, visibility 0.25s ease;
}
.deal-modal-overlay.show {
  opacity: 1; visibility: visible; pointer-events: auto;
}

.modal-panel {
  background: var(--modal-bg); border-radius: 20px 20px 0 0;
  width: 100%; max-height: 85vh; display: flex; flex-direction: column;
  box-shadow: var(--shadow-modal);   /* ★ 全局阴影 */
  transform: translateY(100%);
}
.deal-modal-overlay.ready .modal-panel {
  transition: transform 0.3s ease;
}
.deal-modal-overlay.show .modal-panel {
  transform: translateY(0);
}

.modal-handle {
  width: 36px; height: 4px;
  background: var(--modal-handle);   /* ★ 全局横杠颜色 */
  border-radius: 2px; margin: 8px auto 0;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.6rem 1rem; border-bottom: 1px solid var(--border);
  border-radius: 20px 20px 0 0; flex-shrink: 0;
  /* ★ 中性渐变背景，提升质感，自动适配日夜 */
  background: var(--modal-deal-header-bg);
}
.modal-header h3 { color: var(--accent); margin: 0; font-size: 1rem; }

.modal-close-btn {
  background: none; border: none; color: var(--text-secondary);
  font-size: 1.4rem; cursor: pointer;
  min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.modal-close-btn:active { transform: scale(0.85); color: var(--text-primary); }

.modal-body { flex: 1; overflow-y: auto; padding: 1rem; }
.deals-content {
  line-height: 1.8;
  white-space: pre-wrap;   /* ★ 保留换行和空行，和数据库原文格式一致 */
}
.deals-content :deep(a) {
  color: var(--value-gold-text);
  text-decoration: underline;
  word-break: break-all;
}

.deal-footer { color: var(--text-secondary); font-size: 0.75rem; margin-top: 1rem; text-align: center; }

@media (min-width: 769px) {
  .deal-modal-overlay { align-items: center; }
  .modal-panel { max-width: 500px; border-radius: 16px; }
  .modal-header { border-radius: 16px 16px 0 0; }
}
</style>