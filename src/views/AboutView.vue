<template>
  <div class="about-page">
    <div class="page-header">
      <h1>关于奇魂</h1>
      <p class="subtitle">实测数据为王，让硬件选购不再迷茫</p>
    </div>

    <div class="about-content">
      <!-- 关于我 -->
      <section class="about-section">
        <h2>关于作者</h2>
        <div class="section-card">
          <p>
            B站UP主「奇魂」，硬件发烧友，致力于为普通玩家提供真实、客观的硬件评测数据。
          </p>
          <p>
            每周更新 CPU/显卡性价比排行榜，帮助大家在预算内找到最适合自己的硬件。
          </p>
          <div class="links">
            <a href="https://space.bilibili.com/3546785037420940" target="_blank" rel="noopener" class="bili-link">
              访问B站主页
            </a>
            <div class="charge-wrapper">
              <button class="charge-btn" @click="showCharge = !showCharge">
                充电支持
              </button>
              <transition name="fade">
                <div v-if="showCharge" class="charge-popup" @click.stop>
                  <img src="/images/payment.png" alt="充电收款码" class="charge-qr" />
                </div>
              </transition>
            </div>
          </div>
        </div>
      </section>

      <!-- 数据来源 -->
      <section class="about-section">
        <h2>数据说明</h2>
        <div class="section-card">
          <ul class="data-list">
            <li>性能数据基于实测，模拟真实使用场景</li>
            <li>价格数据来自京东/淘宝/拼多多等主流平台日常售价（不含特价）</li>
            <li>二手价格数据来自闲鱼7日内成交均价</li>
            <li>性能分=100代表畅玩大多数主流游戏</li>
            <li>数据每周更新，热门型号可能更频繁</li>
          </ul>
        </div>
      </section>

      <!-- 更新日志 -->
      <section class="about-section">
        <h2>更新日志</h2>
        <div class="section-card">
          <div class="changelog">
            <div class="log-item">
              <span class="log-date">2026.04.10</span>
              <span class="log-text">显卡榜上线，优化UI交互，添加性价比皇冠标识</span>
            </div>
            <div class="log-item">
              <span class="log-date">2026.04.09</span>
              <span class="log-text">网站框架搭建完成，CPU性价比榜上线</span>
            </div>
            <div class="log-item">
              <span class="log-date">2026.04.08</span>
              <span class="log-text">项目初始化，开始开发</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 联系作者 -->
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

    <!-- 充电二维码弹窗 -->
    <div v-if="showCharge" class="modal-overlay" @click="showCharge = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>充电支持</h3>
          <button class="close-btn" @click="showCharge = false">×</button>
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

const showCharge = ref(false)

// 点击空白处关闭充电弹窗
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (showCharge.value && !target.closest('.charge-wrapper')) {
    showCharge.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2.5rem;
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

.about-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.about-section h2 {
  color: var(--text-primary);
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.section-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.section-card p {
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.7;
}

.section-card p:last-child {
  margin-bottom: 0;
}

.links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  align-items: flex-start;
}

.bili-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.2rem;
  background: #fb7299;
  color: #fff;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  min-height: 44px;
}

.bili-link:hover {
  background: #ff8ba7;
  color: #fff;
  transform: translateY(-2px);
}

.charge-wrapper {
  position: relative;
}

.charge-btn {
  padding: 0.6rem 1.2rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
}

.charge-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
}

.charge-popup {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.charge-qr {
  width: 200px;
  height: auto;
  border-radius: 8px;
  display: block;
}

.data-list {
  list-style: none;
  padding: 0;
}

.data-list li {
  color: var(--text-secondary);
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.6;
}

.data-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: bold;
}

.changelog {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.log-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.log-date {
  color: var(--accent);
  font-family: 'Roboto Mono', monospace;
  font-size: 0.85rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.log-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 联系作者区块 */
.contact-section {
  text-align: center;
}

.contact-qr-wrapper {
  margin-bottom: 1.5rem;
}

.wechat-qr {
  width: 150px;
  height: 150px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  margin-bottom: 0.75rem;
}

.wechat-id {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.id-text {
  color: var(--accent);
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
}

.contact-tip {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}

.contact-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
}

.action-btn:hover {
  border-color: var(--accent);
  background: var(--border);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 1.1rem;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.3s;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border);
  width: 90vw;
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  min-height: 44px;
  min-width: 44px;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.qr-img {
  width: 240px;
  height: 240px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-tip {
  margin: 1rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 600px) {
  .about-page {
    padding: 1.5rem 1rem;
  }

  .links {
    flex-direction: column;
  }

  .bili-link,
  .charge-btn {
    width: 100%;
    justify-content: center;
  }

  .charge-popup {
    left: 50%;
    transform: translateX(-50%);
  }

  .modal {
    width: 95vw;
  }

  .qr-img {
    width: 200px;
    height: 200px;
  }

  .log-item {
    flex-direction: column;
    gap: 0.25rem;
  }

  .contact-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
