<template>
  <div class="videos-page">
    <main class="main">
      <div class="page-header">
        <h1>🔥 热播视频</h1>
        <p class="subtitle">精选硬件评测 · 真实数据 · 不信云评测</p>
      </div>

      <!-- 视频列表 -->
      <div class="video-list">
        <a
          v-for="video in videos"
          :key="video.bvid"
          :href="video.link"
          target="_blank"
          rel="noopener"
          class="video-item"
        >
          <div class="video-info">
            <h3 class="video-title">{{ video.title }}</h3>
            <div class="video-meta">
              <span class="video-date">{{ video.date }}</span>
              <span class="video-link-text">前往B站观看 →</span>
            </div>
          </div>
        </a>
      </div>

      <!-- 无数据提示 -->
      <div v-if="videos.length === 0" class="no-data">
        <p>暂无视频数据</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Video {
  bvid: string
  title: string
  date: string
  link: string
}

const videos = ref<Video[]>([
  {
    bvid: 'BV1sxgAzbEg5',
    title: '暴打国外榜单！国内首个《CPU游戏天梯图》来了！省流避坑！选U指南~26颗CPU X 12款热游 对比实测',
    date: '2025-03-15',
    link: 'https://www.bilibili.com/video/BV1sxgAzbEg5'
  },
  {
    bvid: 'BV121HkzMESh',
    title: '颠覆认知！【2000元】CPU 横评，结果出乎所有人意料！生产力 | 游戏 | 功耗 全面对比',
    date: '2025-04-02',
    link: 'https://www.bilibili.com/video/BV121HkzMESh'
  },
  {
    bvid: 'BV1owECz1EVa',
    title: '海量数据 DDR4 和 DDR5 游戏对比测试！内存 对性能的影响到底有多大？？？',
    date: '2025-02-28',
    link: 'https://www.bilibili.com/video/BV1owECz1EVa'
  },
  {
    bvid: 'BV1ANgozkE8c',
    title: '千元CPU谁最强？实测结果可能和你想的不一样！14600KF、12700KF、12600KF、12490F、9600X...',
    date: '2025-03-20',
    link: 'https://www.bilibili.com/video/BV1ANgozkE8c'
  },
  {
    bvid: 'BV1xY411s7Nk',
    title: '显卡性价比天梯图来了！RTX 40系 vs 30系 vs 20系 全面对比',
    date: '2025-04-05',
    link: 'https://www.bilibili.com/video/BV1xY411s7Nk'
  }
])
</script>

<style scoped>
.videos-page {
  min-height: 100vh;
  background: var(--bg-primary);
}

.main {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: var(--text-primary);
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.video-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.video-item {
  display: block;
  padding: 1rem 1.25rem;
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
}

.video-item:last-child {
  border-bottom: none;
}

.video-item:hover {
  background: var(--bg-tertiary);
}

.video-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.video-title {
  color: var(--accent);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
  font-weight: 500;
}

.video-item:hover .video-title {
  text-decoration: underline;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
}

.video-date {
  color: var(--text-secondary);
}

.video-link-text {
  color: var(--text-secondary);
  margin-left: auto;
}

.video-item:hover .video-link-text {
  color: var(--accent);
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .main {
    padding: 1rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .video-item {
    padding: 0.875rem 1rem;
  }

  .video-title {
    font-size: 0.875rem;
  }

  .video-meta {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .video-link-text {
    margin-left: 0;
    width: 100%;
  }
}
</style>