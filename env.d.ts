/// <reference types="vite/client" />

// 路由元数据类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
  }
}

