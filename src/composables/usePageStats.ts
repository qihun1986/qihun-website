import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

export interface PageStats {
  totalPv: number
  todayPv: number
  yesterdayPv: number
}

// 记录一次页面访问
export async function trackPageView() {
  try {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const hour = now.getHours()

    await supabase.from('page_views').insert({
      page: window.location.pathname,
      referrer: document.referrer,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      url: window.location.href,
      date,
      hour,
    })
  } catch {
    // 埋点失败不影响用户
  }
}

export function usePageStats() {
  const stats = ref<PageStats>({
    totalPv: 0,
    todayPv: 0,
    yesterdayPv: 0,
  })
  const loading = ref(true)

  async function fetchStats() {
    loading.value = true
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

      const [totalRes, todayRes, yesterdayRes] = await Promise.all([
        supabase.from('page_views').select('*', { count: 'exact', head: true }),
        supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('date', yesterday),
      ])

      stats.value = {
        totalPv: totalRes.count ?? 0,
        todayPv: todayRes.count ?? 0,
        yesterdayPv: yesterdayRes.count ?? 0,
      }
    } catch {
      stats.value = { totalPv: 0, todayPv: 0, yesterdayPv: 0 }
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, fetchStats }
}
