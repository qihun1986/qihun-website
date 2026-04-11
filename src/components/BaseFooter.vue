<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-info">
        <span class="copyright">© 2026 奇魂的小窝</span>
        <span class="separator">|</span>
        <span class="update-time">数据更新：{{ updateTime }}</span>
        <span class="separator">|</span>
        <span class="visits">访问量：<span id="busuanzi_value_site_pv">加载中</span></span>
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
import { supabase } from '../lib/supabase'

const updateTime = ref('加载中...')

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('cpu_current')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      const d = new Date(data[0].updated_at)
      updateTime.value = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    } else {
      const now = new Date()
      updateTime.value = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    }
  } catch {
    const now = new Date()
    updateTime.value = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  }
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
