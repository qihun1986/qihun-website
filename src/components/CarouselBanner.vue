<template>
  <div
    v-if="items.length"
    class="carousel-wrapper"
    @mouseenter="stopAutoPlay"
    @mouseleave="startAutoPlay"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <component
      :is="cardTag"
      :href="currentLink"
      :target="linkTarget"
      :rel="linkRel"
      class="carousel-card"
      @click="onCardClick"
    >
      <div class="card-content">
        <span class="card-icon">{{ icon }}</span>
        <span class="card-badge">{{ badge }}</span>
        <span class="card-text">{{ currentText }}</span>
      </div>
      <div v-if="items.length > 1" class="carousel-dots">
        <button
          v-for="(_, idx) in items"
          :key="idx"
          :class="{ active: idx === currentIndex }"
          class="dot-btn"
          @click.prevent.stop="goToSlide(idx)"
          :aria-label="`切换到第${idx + 1}条`"
        ></button>
      </div>
    </component>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  type: { type: String, default: 'video' }
})

const emit = defineEmits(['cardClick'])

const currentIndex = ref(0)
const AUTO_INTERVAL = 5000
let timer = null
let touchStartX = 0

const icon = computed(() => props.type === 'deal' ? '⚡' : '▶')
const badge = computed(() => props.type === 'deal' ? '特价' : '视频')

const currentItem = computed(() => {
  const item = props.items[currentIndex.value]
  if (!item) return { text: '', link: '' }
  if (typeof item === 'string') return { text: item, link: '' }
  return { text: item.text || '', link: item.link || '' }
})

const currentText = computed(() => currentItem.value.text || '')
const currentLink = computed(() => currentItem.value.link || '')

const cardTag = computed(() => {
  if (props.type === 'video' && currentLink.value) return 'a'
  return 'div'
})
const linkTarget = computed(() => props.type === 'video' ? '_blank' : undefined)
const linkRel = computed(() => props.type === 'video' ? 'noopener' : undefined)

const onCardClick = (e) => {
  if (props.type === 'deal') {
    e.preventDefault()
    emit('cardClick', currentItem.value)
  }
}

const startAutoPlay = () => {
  stopAutoPlay()
  if (props.items.length <= 1) return
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % props.items.length
  }, AUTO_INTERVAL)
}
const stopAutoPlay = () => {
  if (timer) { clearInterval(timer); timer = null }
}
const goToSlide = (idx) => {
  currentIndex.value = idx
  startAutoPlay()
}
const onTouchStart = (e) => { touchStartX = e.touches[0].clientX }
const onTouchEnd = (e) => {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  if (deltaX > 50) {
    currentIndex.value = (currentIndex.value - 1 + props.items.length) % props.items.length
    startAutoPlay()
  } else if (deltaX < -50) {
    currentIndex.value = (currentIndex.value + 1) % props.items.length
    startAutoPlay()
  }
}

onMounted(() => startAutoPlay())
onUnmounted(() => stopAutoPlay())
</script>

<style scoped>
.carousel-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.carousel-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  min-height: 60px;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.15s;
  box-shadow: var(--shadow-card);
  box-sizing: border-box;
  overflow: hidden;
}
.carousel-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 12px var(--highlight-border);
  background: var(--highlight-bg);
}
.carousel-card:active {
  transform: scale(0.96);
  background: var(--value-gold-bg);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.card-icon {
  font-size: var(--text-base, 0.9rem);
  flex-shrink: 0;
  line-height: 1;
}

.card-badge {
  font-size: var(--text-xs, 0.7rem);
  font-weight: 600;
  color: var(--value-gold-text);
  background: var(--value-gold-bg);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  flex-shrink: 0;
  line-height: 1.3;
}

.card-text {
  font-size: var(--text-sm, 0.82rem);
  color: var(--text-primary);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* 圆点：底部居中 */
.carousel-dots {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: var(--carousel-dot);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.25s ease;
  min-width: 8px;
  min-height: 8px;
}
.dot-btn.active {
  width: 20px;
  background: var(--accent);
}

@media (max-width: 768px) {
  .carousel-card {
    min-height: 50px;
    padding: 0.4rem 0.65rem;
  }
  .dot-btn {
    width: 6px;
    height: 6px;
    border-radius: 3px;
    min-width: 6px;
    min-height: 6px;
  }
  .dot-btn.active {
    width: 16px;
  }
}
</style>