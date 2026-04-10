<template>
  <div class="app">
    <BaseHeader />
    <main class="main-content">
      <router-view />
    </main>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseHeader from '@/components/BaseHeader.vue'
import BaseFooter from '@/components/BaseFooter.vue'

const route = useRoute()

// 更新页面标题和Meta
const updateMeta = () => {
  const title = route.meta.title as string || '奇魂的小窝'
  const description = route.meta.description as string || 'CPU/显卡性价比排行榜，基于实测数据的硬件选购指南'
  
  document.title = title
  
  let descMeta = document.querySelector('meta[name="description"]')
  if (descMeta) {
    descMeta.setAttribute('content', description)
  }
  
  let ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) {
    ogTitle.setAttribute('content', title)
  }
  
  let ogDesc = document.querySelector('meta[property="og:description"]')
  if (ogDesc) {
    ogDesc.setAttribute('content', description)
  }
}

// JSON-LD 结构化数据 - 注入到 head
onMounted(() => {
  updateMeta()
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "奇魂的小窝",
    "description": "CPU/显卡性价比排行榜 - 基于实测数据的硬件选购指南",
    "url": "https://qihun.example.com",
    "author": {
      "@type": "Person",
      "name": "奇魂",
      "url": "https://space.bilibili.com/3546785037420940"
    }
  }

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(jsonLd)
  document.head.appendChild(script)
})

// 监听路由变化
watch(() => route.path, () => {
  updateMeta()
})
</script>

<style>
/* 全局CSS变量 - 黑金科技感 */
:root {
  --bg-primary: #0a0f1a;
  --bg-secondary: #0f172a;
  --bg-tertiary: #1a2542;
  --border: #2d3a5e;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --success: #10b981;
  --danger: #ef4444;
  --table-row-hover: rgba(59, 130, 246, 0.08);
  --model-color: #b3d4ff;
}

/* 全局重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  font-size: 16px;
}

/* 移动端字体缩小 */
@media (max-width: 640px) {
  html {
    font-size: 14px;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 表格字体加大 */
table td, table th {
  font-size: 0.9375rem;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 选中文字颜色 */
::selection {
  background: var(--accent);
  color: #000;
}

/* 链接样式 */
a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  color: var(--accent-hover);
}

/* 按钮重置 */
button {
  font-family: inherit;
}

/* 数字字体 */
.mono {
  font-family: 'Roboto Mono', 'Fira Code', Consolas, monospace;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
}
</style>
