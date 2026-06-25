<template>
  <div class="video-box">
    <div class="mini-table-header">
      <h3>{{ title }}</h3>
      <a :href="link" target="_blank" class="view-all-link">B站观看 →</a>
    </div>
    <div
      v-if="!loaded"
      class="video-placeholder"
      @click="loadVideo"
    >
      <span class="play-icon">▶</span>
      <span class="play-text">{{ videoTitle || '点击播放' }}</span>
    </div>
    <div v-else class="video-wrapper">
      <iframe
        :src="embedSrc"
        scrolling="no"
        border="0"
        frameborder="no"
        framespacing="0"
        allowfullscreen="true"
        class="bilibili-iframe"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  link: { type: String, default: '' },
  videoTitle: { type: String, default: '' }
})

const loaded = ref(false)

const embedSrc = computed(() => {
  if (!props.link) return ''
  const bvid = props.link.match(/(?:bvid=|\/video\/)([A-Za-z0-9]+)/)?.[1]
  return bvid ? `//player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&page=1` : ''
})

function loadVideo() {
  if (!embedSrc.value) return
  loaded.value = true
}

onMounted(() => {
  if (props.link) {
    loadVideo()
  }
})
</script>

<style scoped>
.video-box {
  background: var(--bg-secondary);
  border: 1px solid var(--table-border-gold);
  outline: 1.5px solid var(--table-outline-blue);
  outline-offset: 2px;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: var(--card-shadow);
}
.mini-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}
.mini-table-header h3 {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0;
  font-weight: 600;
}
.view-all-link {
  font-size: 0.8rem;
  color: var(--accent);
  text-decoration: none;
}
.video-placeholder {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.play-icon {
  font-size: 2rem;
  color: var(--accent);
  opacity: 0.8;
  margin-top: 10rem;
}
.play-text {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
  max-width: 90%;
  text-align: center;
}
.video-wrapper {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  border-radius: 8px;
}
.bilibili-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .play-icon {
    margin-top: 5rem;
  }
}
</style>