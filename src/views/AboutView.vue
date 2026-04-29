<template>
  <div class="about-page">
    <div class="page-header">
      <h1>关于奇魂</h1>
      <p class="subtitle">实测数据为王，让硬件选购不再迷茫</p>
    </div>

    <div class="about-content">
      <section class="about-section">
        <h2>关于作者</h2>
        <div class="section-card">
          <p>B站UP主「奇魂」，硬件发烧友，致力于为普通玩家提供真实、客观的硬件评测数据。</p>
          <p>每周更新 CPU/显卡性价比排行榜，帮助大家在预算内找到最适合自己的硬件。</p>
          <div class="links">
            <a href="https://space.bilibili.com/3546785037420940" target="_blank" rel="noopener" class="bili-link">访问B站主页</a>
            <div class="charge-wrapper">
              <button class="charge-btn" @click="showCharge = true">充电支持</button>
            </div>
          </div>
        </div>
      </section>

      <section id="test-methodology" class="about-section">
        <h2>数据说明</h2>
        <div class="section-card credibility-card">
          <div class="credibility-item">
            <div class="credibility-icon">&#x1F4D0;</div>
            <div class="credibility-content">
              <h3>独立测试，不依赖厂商数据</h3>
              <p>所有性能数据均为独立实测，不依赖第三方评测机构数据。测试环境：各平台统一测试环境，保持默认设置无手动优化，模拟真实游戏与创作场景。不使用芯片厂商（Intel/AMD/NVIDIA）发布的白皮书数据作为排名依据。</p>
            </div>
          </div>
          <div class="credibility-item">
            <div class="credibility-icon">&#x1F504;</div>
            <div class="credibility-content">
              <h3>第三方数据交叉验证</h3>
              <p>实测数据会与 TechPowerUp、PassMark 等独立评测平台的公开数据进行横向对比，偏差超过15%时会重新测试确认。</p>
            </div>
          </div>
          <div class="credibility-item">
            <div class="credibility-icon">&#x1F4B0;</div>
            <div class="credibility-content">
              <h3>价格数据透明说明</h3>
              <p>所有价格均为手动定期收录，不依赖爬虫。全新价格取自京东/淘宝/拼多多各平台日常活动价（不含限时特价、使用会员券等极端价格）；二手价格取自闲鱼近7日成交均价。如有价格异常波动，会在更新日志中注明。每周更新，热门型号更频繁。</p>
            </div>
          </div>
          <div class="credibility-item">
            <div class="credibility-icon">&#x26A0;&#xFE0F;</div>
            <div class="credibility-content">
              <h3>数据错误修正机制</h3>
              <p>如发现数据有误，欢迎通过微信（qh20241230）反馈。核实后会尽快修正，并在更新日志中记录修正内容。</p>
            </div>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>更新日志</h2>
        <div class="section-card">
          <div class="changelog">
            <div v-if="updateLog.length === 0" class="log-empty">加载中...</div>
            <template v-if="!showAllLogs">
              <div v-for="(entry, i) in updateLog" :key="i" class="log-item">
                <span class="log-date">{{ entry.date }}</span>
                <span class="log-text">{{ entry.text }}</span>
              </div>
            </template>
            <template v-else>
              <div v-for="(entry, i) in allLogs" :key="i" class="log-item">
                <span class="log-date">{{ entry.date }}</span>
                <span class="log-text">{{ entry.text }}</span>
              </div>
            </template>
          </div>
          <button v-if="allLogs.length > 3" class="toggle-logs-btn" @click="showAllLogs = !showAllLogs">
            {{ showAllLogs ? '收起日志' : `查看所有日志 (${allLogs.length}条)` }}
          </button>
        </div>
      </section>

      <section class="about-section">
        <h2>联系作者</h2>
        <div class="section-card contact-section">
          <div class="contact-qr-wrapper">
            <img src="/images/vx.png" alt="UP主微信二维码" class="wechat-qr" />
            <p class="wechat-id">微信号：<span class="id-text">qh20241230</span></p>
            <p class="contact-tip">商务合作、咨询交流欢迎扫码添加</p>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showCharge" class="modal-overlay" @click="showCharge = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>充电支持</h3>
          <button class="close-btn" @click="showCharge = false">&#xD7;</button>
        </div>
        <div class="modal-body">
          <img src="/images/payment.png" alt="充电收款码" class="qr-img" />
          <p class="modal-tip">感谢你的支持！</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

const showCharge = ref(false)
const showAllLogs = ref(false)
const allLogs = ref<{ date: string; text: string }[]>([])
const updateLog = ref<{ date: string; text: string }[]>([])

onMounted(async () => {
  try {
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'update_log')
      .single()

    if (data && data.value) {
      const all = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
      allLogs.value = all
      updateLog.value = all.slice(0, 3)
      injectJsonLd(all)
    }
  } catch {}

  document.addEventListener('click', handleClickOutside)
})

const injectJsonLd = (logs: Array<{ date: string; text: string }>) => {
  const existing = document.querySelector('script[data-jsonld="site-schema"]')
  if (existing) existing.remove()

  const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.5vip.top/#organization',
        name: '奇魂',
        url: 'https://www.5vip.top',
        description: 'B站UP主奇魂的硬件性价比排行榜网站，提供实测CPU/GPU性能数据与实时价格对比',
        sameAs: ['https://space.bilibili.com/3546785037420940']
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://www.5vip.top/#software',
        name: '奇魂硬件性价比排行榜',
        applicationCategory: 'ShoppingComparisonTool',
        operatingSystem: 'Web',
        url: 'https://www.5vip.top',
        description: 'CPU/显卡游戏性价比排行榜，基于实测性能数据与京东/淘宝/拼多多日常售价，为玩家提供客观的硬件选购参考',
        offers: { '@type': 'Offer', 'price': '0', 'priceCurrency': 'CNY' }
      },
      ...logs.map((log, i) => ({
        '@type': 'Article',
        '@id': `https://www.5vip.top/#changelog-${i}`,
        headline: log.text.slice(0, 60),
        datePublished: log.date.replace(/\./g, '-'),
        dateModified: log.date.replace(/\./g, '-'),
        author: { '@type': 'Person', name: '奇魂', url: 'https://www.5vip.top' },
        publisher: { '@type': 'Organization', name: '奇魂', url: 'https://www.5vip.top' },
        about: { '@type': 'Thing', name: '硬件价格更新' },
        description: log.text
      }))
    ]
  }

  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-jsonld', 'site-schema')
  script.textContent = JSON.stringify(siteSchema)
  document.head.appendChild(script)
}

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  const old = document.querySelector('script[data-jsonld="site-schema"]')
  if (old) old.remove()
})

const handleClickOutside = (e: MouseEvent) => {
  if (showCharge.value && !(e.target as Element).closest('.charge-wrapper')) {
    showCharge.value = false
  }
}
</script>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
.page-header { text-align: center; margin-bottom: 2.5rem; }
.page-header h1 { color: var(--text-primary); font-size: 2rem; margin-bottom: 0.5rem; }
.subtitle { color: var(--text-secondary); font-size: 1rem; }
.about-content { display: flex; flex-direction: column; gap: 1.5rem; }
.about-section h2 { color: var(--text-primary); font-size: 1.2rem; margin-bottom: 1rem; }
.section-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
.section-card p { color: var(--text-secondary); margin-bottom: 0.75rem; line-height: 1.7; }
.section-card p:last-child { margin-bottom: 0; }
.links { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem; align-items: flex-start; }
.bili-link {
  display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.2rem;
  background: #fb7299; color: #fff; border-radius: 8px; font-size: 0.9rem; font-weight: 500;
  transition: all 0.2s ease; text-decoration: none; min-height: 44px;
}
.bili-link:hover { background: #ff8ba7; color: #fff; transform: translateY(-2px); }
.charge-wrapper { position: relative; }
.charge-btn {
  padding: 0.6rem 1.2rem; background: var(--accent); color: #fff; border: none;
  border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease; min-height: 44px;
}
.charge-btn:hover { background: var(--accent-hover); transform: translateY(-2px); }
.data-list { list-style: none; padding: 0; margin: 0; }
.data-list li { color: var(--text-secondary); padding: 0.5rem 0 0.5rem 1.5rem; position: relative; line-height: 1.6; }
.data-list li::before { content: '\2022'; color: var(--accent); font-weight: 700; position: absolute; left: 0; }
.changelog { display: flex; flex-direction: column; gap: 0.75rem; }
.toggle-logs-btn {
  color: var(--accent); border: 1px solid var(--accent); cursor: pointer;
  background: transparent; border-radius: 6px; margin-top: 1rem; padding: 0.5rem 1rem;
  font-size: 0.85rem; transition: all 0.2s;
}
.toggle-logs-btn:hover { background: var(--accent); color: var(--bg-primary); }
.log-item { display: flex; gap: 1rem; align-items: flex-start; }
.log-date { color: var(--accent); white-space: nowrap; flex-shrink: 0; font-family: 'Roboto Mono', monospace; font-size: 0.85rem; }
.log-text { color: var(--text-secondary); font-size: 0.9rem; }
.log-empty { color: var(--text-secondary); opacity: 0.6; font-size: 0.9rem; }
.contact-section { text-align: center; }
.contact-qr-wrapper { margin-bottom: 1.5rem; }
.wechat-qr { width: 150px; height: 150px; object-fit: cover; border-radius: 12px; margin-bottom: 0.75rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.wechat-id { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }
.id-text { color: var(--accent); font-family: 'Roboto Mono', monospace; font-weight: 600; }
.contact-tip { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.8; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85);
  display: flex; justify-content: center; align-items: center; z-index: 1000;
  animation: fadeIn 0.2s ease;
}
.modal {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px;
  width: 90vw; max-width: 400px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: slideUp 0.3s ease;
}
.modal-header {
  background: var(--bg-tertiary); border-bottom: 1px solid var(--border);
  padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { color: var(--text-primary); margin: 0; font-size: 1.1rem; }
.close-btn {
  color: var(--text-secondary); cursor: pointer; background: transparent; border: none;
  padding: 0; font-size: 1.5rem; line-height: 1; min-width: 44px; min-height: 44px;
}
.close-btn:hover { color: var(--text-primary); }
.modal-body { text-align: center; padding: 1.5rem; }
.qr-img { width: 240px; height: 240px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.modal-tip { color: var(--text-secondary); margin: 1rem 0 0; font-size: 0.9rem; }
.credibility-card { display: flex; flex-direction: column; gap: 1rem; }
.credibility-item { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; }
.credibility-icon { font-size: 1.5rem; flex-shrink: 0; line-height: 1.4; }
.credibility-content h3 { color: var(--text-primary); font-size: 0.95rem; font-weight: 600; margin-bottom: 0.4rem; }
.credibility-content p { color: var(--text-secondary); font-size: 0.88rem; line-height: 1.65; margin: 0; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@media (max-width: 600px) {
  .about-page { padding: 1.5rem 1rem; }
  .links { flex-direction: column; }
  .bili-link, .charge-btn { width: 100%; justify-content: center; }
  .modal { width: 95vw; }
  .qr-img { width: 200px; height: 200px; }
  .log-item { flex-direction: column; gap: 0.25rem; }
}
</style>