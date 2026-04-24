import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import router from './router'
import { trackPageView } from './composables/usePageStats'

const app = createApp(App)

// 全局错误处理（调试用）
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', info, err)
  // 在页面上显示错误（方便本地调试）
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:red;color:white;padding:12px;font-size:14px;word-break:break-all;'
  div.textContent = `[Vue Error] ${info}: ${err}`
  document.body.prepend(div)
}

app.use(createPinia())
app.use(router)

// Vercel Analytics（自动采集访问，Vercel后台可见）
inject()

// 路由切换时记录访问
router.afterEach(() => {
  trackPageView()
})

app.mount('#app')
