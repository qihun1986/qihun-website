<template>
  <transition name="slide-down">
    <div v-if="visible && text" class="announcement-bar">
      <div class="announcement-content">
        <span class="announcement-bell">🔔</span>
        <span class="announcement-text">{{ text }}</span>
      </div>
      <button class="announcement-close" @click="dismiss" aria-label="关闭公告">
        ✕
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'qihun_announcement_dismissed'
const text = ref('')
const visible = ref(false)

// 简单字符串hash
const hashCode = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

const dismiss = () => {
  visible.value = false
  localStorage.setItem(STORAGE_KEY, hashCode(text.value))
}

onMounted(async () => {
  try {
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'announcement')
      .single()

    if (data?.value) {
      text.value = data.value
      // 检查是否已经关闭过这条公告
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed !== hashCode(text.value)) {
        visible.value = true
      }
    }
  } catch (e) {
    // 静默失败，不影响用户使用
  }
})
</script>

<style scoped>
.announcement-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #252540;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-bottom: 1px solid #3a3a5a;
  transition: background 0.2s;
}

.announcement-bar:hover {
  background: #2e2e50;
}

.announcement-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.announcement-bell {
  font-size: 1rem;
  flex-shrink: 0;
}

.announcement-text {
  color: #e0e0e0;
  font-size: 0.875rem;
  text-align: center;
  line-height: 1.5;
}

.announcement-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #888;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.announcement-close:hover {
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

/* 过渡动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 60px;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* 手机端 */
@media (max-width: 640px) {
  .announcement-bar {
    padding: 10px 16px;
  }

  .announcement-text {
    font-size: 0.8125rem;
  }

  .announcement-close {
    padding: 8px;
    margin: -8px -8px -8px 0;
  }
}
</style>
