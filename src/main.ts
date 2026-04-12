import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import router from './router'
import { trackPageView } from './composables/usePageStats'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Vercel Analytics（自动采集访问，Vercel后台可见）
inject()

// 路由切换时记录访问
router.afterEach(() => {
  trackPageView()
})

app.mount('#app')
