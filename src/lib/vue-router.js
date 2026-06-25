import { createRouter, createWebHistory } from 'vue-router'

// 空路由，仅为组件内 useRouter 提供实例
const router = createRouter({
  history: createWebHistory(),
  routes: []
})

export default router