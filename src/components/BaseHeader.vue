<template>
  <header class="header">
    <div class="header-content">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <img src="/images/logo.png" alt="奇魂的小窝" class="logo-img" />
        <span class="logo-text">奇魂的小窝</span>
      </router-link>

      <!-- 导航：首页、天梯图、视频、关于 -->
      <nav class="nav">
        <router-link to="/" class="nav-link" :class="{ active: isActive('/') }">首页</router-link>
        <router-link to="/tier" class="nav-link" :class="{ active: isActive('/tier') }">天梯图</router-link>
        <router-link to="/videos" class="nav-link" :class="{ active: isActive('/videos') }">视频</router-link>
        <router-link to="/about" class="nav-link" :class="{ active: isActive('/about') }">关于</router-link>
      </nav>

      <!-- 操作按钮：B站主页+充电+粉丝群 -->
      <div class="actions">
        <a href="https://space.bilibili.com/3546785037420940" target="_blank" class="bili-btn">
          <img src="/images/bilibili.svg" alt="B站主页" class="bili-icon" />
          B站主页
        </a>
        <div class="dropdown-wrapper">
          <button class="action-btn charge-btn" @click="toggleDropdown('charge')">
            ⚡ 充电
          </button>
          <!-- 桌面端 dropdown -->
          <transition name="fade">
            <div v-if="showCharge && !isMobile" class="dropdown" @click.stop>
              <img src="/images/payment.png" alt="充电打赏码" class="dropdown-qr" />
            </div>
          </transition>
        </div>
        <div class="dropdown-wrapper">
          <button class="action-btn group-btn" @click="toggleDropdown('fans')">
            🎮 粉丝群
          </button>
          <!-- 桌面端 dropdown -->
          <transition name="fade">
            <div v-if="showFans && !isMobile" class="dropdown" @click.stop>
              <img src="/images/qrcode.jpg" alt="QQ粉丝群二维码" class="dropdown-qr" />
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>

  <!-- 移动端充电动画 -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showCharge && isMobile" class="modal-overlay" @click="showCharge = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>⚡ 充电支持</h3>
            <button class="modal-close" @click="showCharge = false">×</button>
          </div>
          <div class="modal-body">
            <img src="/images/payment.png" alt="充电打赏码" class="modal-qr" />
            <p class="modal-tip">感谢你的支持！</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 移动端粉丝群 -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showFans && isMobile" class="modal-overlay" @click="showFans = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>🎮 粉丝群</h3>
            <button class="modal-close" @click="showFans = false">×</button>
          </div>
          <div class="modal-body">
            <img src="/images/qrcode.jpg" alt="QQ粉丝群二维码" class="modal-qr" />
            <p class="modal-tip">扫码加入粉丝群</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showCharge = ref(false)
const showFans = ref(false)

// 移动端检测
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isMobile = computed(() => windowWidth.value <= 640)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 计算当前路由是否匹配
const isActive = (path: string): boolean => {
  if (path === '/') {
    // 首页和显卡榜都属于首页区块
    return route.path === '/' || route.path === '/gpu'
  }
  return route.path.startsWith(path)
}

const toggleDropdown = (type: 'charge' | 'fans') => {
  if (type === 'charge') {
    showCharge.value = !showCharge.value
    showFans.value = false
  } else {
    showFans.value = !showFans.value
    showCharge.value = false
  }
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.dropdown-wrapper')) {
    showCharge.value = false
    showFans.value = false
  }
}

const handleToggleCharge = () => {
  showCharge.value = !showCharge.value
  showFans.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('toggle-charge', handleToggleCharge)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('toggle-charge', handleToggleCharge)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.header {
  position: relative;
  z-index: 100;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.8rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: #fff;
  flex-shrink: 0;
}

.logo-img {
  height: 32px;
  width: auto;
  border-radius: 4px;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航 */
.nav {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}

/* 导航按钮样式 */
.nav-link {
  background: #2A2F3A;
  border-radius: 6px;
  padding: 6px 14px;
  transition: all 0.2s ease;
  color: #E0E0E0;
  font-weight: 500;
  text-decoration: none;
  font-size: 0.9375rem;
  min-height: 36px;
  display: flex;
  align-items: center;
}

.nav-link:hover {
  background: #3A4455;
  color: #FFFFFF;
  transform: translateY(-1px);
}

.nav-link.router-link-active,
.nav-link.active {
  background: rgba(59, 130, 246, 0.25);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.35);
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

/* B站按钮 */
.bili-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 6px 14px;
  background: #fb7299;
  color: #fff;
  border-radius: 8px;
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.2s;
  min-height: 36px;
  font-weight: 500;
}

.bili-btn:hover {
  background: #ff8ba7;
  color: #fff;
  transform: translateY(-1px);
}

.bili-icon {
  width: 18px;
  height: 18px;
}

/* 下拉框容器 */
.dropdown-wrapper {
  position: relative;
}

/* 充电按钮 */
.charge-btn {
  background: #1E88E5;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.charge-btn:hover {
  background: #3A9AED;
  color: #FFFFFF;
  transform: translateY(-1px);
}

/* 粉丝群按钮 */
.group-btn {
  background: #2E7D32;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.group-btn:hover {
  background: #4CAF50;
  color: #FFFFFF;
  transform: translateY(-1px);
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 1001;
}

.dropdown-qr {
  width: 200px;
  height: auto;
  border-radius: 8px;
  display: block;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 响应式 */
@media (max-width: 900px) {
  .header-content {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .nav {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: 0.25rem;
    gap: 0.35rem;
  }

  .actions {
    gap: 0.4rem;
  }
}

@media (max-width: 640px) {
  .logo-text {
    display: none;
  }

  .nav-link,
  .charge-btn,
  .group-btn,
  .bili-btn {
    padding: 4px 10px;
    font-size: 0.875rem;
    min-height: 34px;
  }

  .bili-btn .bili-icon {
    width: 16px;
    height: 16px;
  }

  .dropdown {
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
}

/* 移动端 Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
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

.modal-close {
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

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.modal-qr {
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

/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.25s ease;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(20px);
}
</style>
