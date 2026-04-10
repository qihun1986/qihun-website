<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-info">
        <span class="copyright">© 2026 奇魂的小窝</span>
        <span class="separator">|</span>
        <span class="update-time">数据更新：{{ updateTime }}</span>
        <span class="separator">|</span>
        <span class="visits">访问量：{{ visits }}</span>
      </div>
      <div class="footer-links">
        <router-link to="/about">关于</router-link>
        <a href="https://space.bilibili.com/3546785037420940" target="_blank">B站</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const updateTime = ref('加载中...')
const visits = ref('建设中')

onMounted(async () => {
  const now = new Date()
  updateTime.value = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`
})
</script>

<style scoped>
.footer {
  margin-top: auto;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
  padding: 1.5rem 1rem;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.separator {
  color: var(--border);
}

.copyright {
  color: var(--text-secondary);
}

.footer-links {
  display: flex;
  gap: 1.5rem;
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--accent);
}

@media (max-width: 600px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
  
  .footer-info {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
