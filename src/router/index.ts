import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GpuView from '../views/GpuView.vue'
import TierView from '../views/TierView.vue'
import GpuTierChart from '../views/GpuTierChart.vue'
import AboutView from '../views/AboutView.vue'
import VideosView from '../views/VideosView.vue'
import AdminView from '../views/AdminView.vue'

const routes = [
  { 
    path: '/', 
    name: 'home', 
    component: HomeView,
    meta: {
      title: 'CPU性价比排行榜 - 奇魂的小窝',
      description: 'CPU性价比排行榜，基于实测数据。涵盖Intel/AMD主流处理器游戏性能、多核性能、价格走势，助你找到最高性价比的CPU。'
    }
  },
  { 
    path: '/gpu', 
    name: 'gpu', 
    component: GpuView,
    meta: {
      title: '显卡性价比排行榜 - 奇魂的小窝',
      description: '显卡性价比排行榜，基于实测数据。涵盖NVIDIA/AMD/Intel主流显卡1080P/2K/4K游戏性能、创作效率、价格走势。'
    }
  },
  { 
    path: '/gpu-tier', 
    name: 'gpu-tier', 
    component: GpuTierChart,
    meta: {
      title: '显卡游戏性能天梯图 - 奇魂的小窝',
      description: 'NVIDIA/AMD/Intel显卡游戏性能天梯图，支持1080p/2K/4K分辨率切换，基于实测数据实时更新。'
    }
  },
  { 
    path: '/tier', 
    name: 'tier', 
    component: TierView,
    meta: {
      title: '硬件天梯图 - 奇魂的小窝',
      description: 'CPU和显卡天梯图，基于实测数据。实时更新性能排行，帮助你了解各型号硬件的相对性能水平。'
    }
  },
  { 
    path: '/videos', 
    name: 'videos', 
    component: VideosView,
    meta: {
      title: '视频中心 - 奇魂的小窝',
      description: '奇魂B站视频精选，涵盖CPU显卡评测、装机推荐、性能对比等硬件相关内容。'
    }
  },
  { 
    path: '/about', 
    name: 'about', 
    component: AboutView,
    meta: {
      title: '关于奇魂 - 奇魂的小窝',
      description: '关于B站UP主奇魂，硬件发烧友，致力于为普通玩家提供真实、客观的硬件评测数据。'
    }
  },
  { path: '/admin', name: 'admin', component: AdminView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
