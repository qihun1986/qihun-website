<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-info">
        <span class="copyright">© 2026 奇魂的小屋</span>
        <span class="separator">|</span>
        <span class="update-time">数据更新：{{ updateTime }}</span>
        <span class="separator">|</span>
        <span class="visits" :class="{ loading }">
          <template v-if="!loading">
            访问：{{ stats.totalPv.toLocaleString() }}
            <span class="sub">
              今日{{ stats.todayPv }} / 昨日{{ stats.yesterdayPv }}
            </span>
          </template>
          <template v-else>访问加载中...</template>
        </span>
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
import { usePageStats } from '../composables/usePageStats'

const updateTime = ref('加载中...')

const { stats, loading, fetchStats } = usePageStats()

onMounted(async () => {
  // 加载数据更新时间
  try {
    const { data } = await supabase
      .from('cpu_current')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
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

  // 加载访问统计
  fetchStats()
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

.visits .sub {
  opacity: 0.7;
  font-size: 0.8em;
  margin-left: 0.25rem;
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

  .visits {
    font-size: 0.8rem;
  }
}
</style>
