<template>
  <div class="tier-page">
    <div class="page-header">
      <h1>📊 CPU / 显卡天梯图</h1>
      <p class="subtitle">可视化性能对比</p>
    </div>

    <div class="placeholder-content">
      <div class="placeholder-icon">📈</div>
      <h2>天梯图功能建设中</h2>
      <p class="description">将支持以下功能：</p>
      <ul class="feature-list">
        <li>CPU游戏性能天梯图</li>
        <li>CPU多核性能天梯图</li>
        <li>显卡1080P/2K/4K性能天梯图</li>
        <li>生产力/AI算力天梯图</li>
      </ul>
      <p class="hint">敬请期待...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 天梯图页面 - 建设中
</script>

<style scoped>
.tier-page {
  max-width: 1200px;
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

.placeholder-content {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border);
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.placeholder-content h2 {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.description {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
}

.feature-list li {
  color: var(--text-secondary);
  padding: 0.5rem 0;
}

.feature-list li::before {
  content: '✓ ';
  color: var(--accent);
  margin-right: 0.5rem;
}

.hint {
  color: var(--accent);
  font-size: 1.1rem;
}
</style>
