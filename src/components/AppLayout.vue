<template>
  <div class="app-layout">
    <header class="navbar">
      <div class="logo">
        <span class="icon">⚡</span>
        <span class="brand">奇魂实测</span>
      </div>
      <nav>
        <router-link to="/">CPU榜</router-link>
        <router-link to="/gpu">显卡榜</router-link>
        <router-link to="/tier">天梯图</router-link>
        <router-link to="/videos">视频</router-link>
        <router-link to="/about">关于/支持</router-link>
      </nav>
      <div class="actions">
        <a href="https://space.bilibili.com/3546785037420940" target="_blank" class="bili-link">B站</a>
        <button class="charge-btn" @click="showPayment = true">⚡充电</button>
        <button class="qr-btn" @click="showQr = true">📱粉丝群</button>
      </div>
    </header>
    <main>
      <router-view />
    </main>
    <footer>
      <p>数据来源：奇魂实测 | 更新周期：每月 | © 2026 奇魂实测</p>
    </footer>

    <!-- 充电收款码弹窗 -->
    <div v-if="showPayment" class="modal-overlay" @click.self="showPayment = false">
      <div class="modal-card payment-modal">
        <h3>⚡ 支持奇魂</h3>
        <img src="/images/payment.png" alt="微信收款码" class="payment-img" />
        <p>扫码支持，感谢兄弟！</p>
        <button @click="showPayment = false">关闭</button>
      </div>
    </div>

    <!-- 粉丝群二维码弹窗 -->
    <div v-if="showQr" class="modal-overlay" @click.self="showQr = false">
      <div class="modal-card qr-modal">
        <h3>📱 QQ粉丝群</h3>
        <img src="/images/qrcode.jpg" alt="QQ群二维码" class="qr-img" />
        <p>扫码加入，一起聊硬件！</p>
        <button @click="showQr = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const showPayment = ref(false)
const showQr = ref(false)
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background-color: #0a0a1a;
  color: #e0e0e0;
}
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #1a1a2e;
  border-bottom: 1px solid #2a2a3e;
}
.logo {
  font-size: 1.5rem;
  font-weight: bold;
}
.logo .icon {
  margin-right: 0.5rem;
}
nav a {
  color: #ccc;
  text-decoration: none;
  margin: 0 1rem;
  transition: color 0.2s;
}
nav a.router-link-active {
  color: #ffaa44;
  border-bottom: 2px solid #ffaa44;
}
.actions button,
.actions a {
  background: #2a2a3e;
  border: none;
  color: white;
  padding: 0.4rem 0.8rem;
  margin-left: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
}
.charge-btn {
  background-color: #e67e22;
  transition: all 0.2s ease;
}
.charge-btn:hover {
  background-color: #f5a623;
  transform: translateY(-2px);
}
.qr-btn {
  transition: all 0.2s ease;
}
.qr-btn:hover {
  background-color: #3a3a4e;
  transform: translateY(-2px);
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem; /* 防止小屏贴边 */
}
.modal-card {
  background: #1a1a2e;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-sizing: border-box; /* 关键：padding算在宽度内 */
  max-height: 90vh;
  overflow-y: auto;
}
.payment-modal {
  max-width: 350px;
  width: 100%;
}
.qr-modal {
  max-width: 400px;
  width: 100%;
}
.payment-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  margin: 10px 0;
}
.qr-img {
  width: 250px;
  height: 250px;
  border-radius: 8px;
  margin: 10px 0;
}
.modal-card h3 {
  margin-bottom: 10px;
  color: #ffaa44;
}
.modal-card p {
  color: #ccc;
  margin: 5px 0;
}
.modal-card button {
  background: #2a2a3e;
  border: none;
  color: #ccc;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

/* 手机端 */
@media (max-width: 480px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end; /* 弹窗从底部弹出，体验更好 */
  }
  .modal-card {
    padding: 1rem;
    border-radius: 12px 12px 0 0;
    width: 100%;
    max-height: 92dvh; /* 用 dvh（动态视口高度），解决移动浏览器地址栏问题 */
    overflow-y: auto;
    overflow-x: hidden;
  }
  .qr-modal {
    max-width: 100%;
  }
  .payment-modal {
    max-width: 100%;
  }
  .qr-img {
    width: 100%;
    max-width: 220px;
    height: auto;
  }
  .payment-img {
    width: 100%;
    max-width: 200px;
    height: auto;
  }
}

footer {
  text-align: center;
  padding: 1rem;
  font-size: 0.8rem;
  background-color: #0a0a1a;
  border-top: 1px solid #1a1a2e;
}
</style>