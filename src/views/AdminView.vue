<template>
  <div class="admin-page">
    <div class="page-header">
      <h1>⚙️ 数据管理</h1>
      <p class="subtitle">管理员面板</p>
    </div>

    <div class="admin-content">
      <div class="warning-banner">
        ⚠️ 此页面仅限开发者使用
      </div>

      <div class="tabs">
        <button 
          @click="activeTab = 'cpu'" 
          :class="{ active: activeTab === 'cpu' }"
          class="tab-btn"
        >
          🖥️ CPU数据
        </button>
        <button 
          @click="activeTab = 'gpu'" 
          :class="{ active: activeTab === 'gpu' }"
          class="tab-btn"
        >
          🎮 显卡数据
        </button>
        <button 
          @click="activeTab = 'import'" 
          :class="{ active: activeTab === 'import' }"
          class="tab-btn"
        >
          📁 CSV导入
        </button>
      </div>

      <!-- CPU数据管理 -->
      <div v-if="activeTab === 'cpu'" class="tab-panel">
        <div class="placeholder-panel">
          <div class="placeholder-icon">🛠️</div>
          <h2>CPU数据管理开发中</h2>
          <p>后续功能：</p>
          <ul class="feature-list">
            <li>行内编辑CPU信息</li>
            <li>新增/删除CPU记录</li>
            <li>批量导入CSV数据</li>
            <li>价格历史记录管理</li>
          </ul>
        </div>
      </div>

      <!-- 显卡数据管理 -->
      <div v-if="activeTab === 'gpu'" class="tab-panel">
        <div class="placeholder-panel">
          <div class="placeholder-icon">🎮</div>
          <h2>显卡数据管理开发中</h2>
          <p>功能同CPU数据管理，支持：</p>
          <ul class="feature-list">
            <li>显卡信息编辑</li>
            <li>性能数据更新</li>
            <li>价格历史追踪</li>
          </ul>
        </div>
      </div>

      <!-- CSV导入 -->
      <div v-if="activeTab === 'import'" class="tab-panel">
        <div class="placeholder-panel">
          <div class="placeholder-icon">📊</div>
          <h2>CSV导入功能开发中</h2>
          <p>将支持：</p>
          <ul class="feature-list">
            <li>从WPS表格导出的CSV导入</li>
            <li>自动识别字段映射</li>
            <li>数据预览与校验</li>
            <li>批量更新现有数据</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('cpu')
</script>

<style scoped>
.admin-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  min-height: 60vh;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: var(--text-primary);
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

.warning-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
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

.tab-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.placeholder-panel {
  text-align: center;
  padding: 3rem 2rem;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.placeholder-panel h2 {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.placeholder-panel p {
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.feature-list {
  list-style: none;
  padding: 0;
  display: inline-block;
  text-align: left;
}

.feature-list li {
  color: var(--text-secondary);
  padding: 0.4rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--accent);
}

@media (max-width: 600px) {
  .admin-page {
    padding: 1.5rem 1rem;
  }

  .tabs {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
  }
}
</style>
