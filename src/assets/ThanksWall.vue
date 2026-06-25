<template>
  <div class="thanks-inner">
    <!-- 弹幕区：3行独立滚动，高度压缩 -->
    <div class="marquee-area">
      <div class="marquee-row" v-for="(row, rowIdx) in marqueeRows" :key="rowIdx">
        <div
          class="marquee-scroll"
          :style="{ animationDuration: speeds[rowIdx] + 's' }"
        >
          <span
            v-for="(msg, idx) in row"
            :key="idx"
            class="marquee-item"
            :class="{ highlight: msg.highlight }"
            :style="msg.highlight ? { color: msg.highlight_color || 'var(--accent)', fontSize: (msg.font_size || '1') + 'em' } : {}"
          >
            <template v-if="msg.nickname">{{ msg.nickname }}：</template>{{ msg.content }}
            <span class="emoji-deco">⭐❤️✨</span>
          </span>
        </div>
      </div>
      <div v-if="approvedMessages.length === 0" class="marquee-empty">
        🍃 还没有留言，成为第一个送上鼓励的人吧
      </div>
    </div>

    <!-- 留言入口 -->
    <div class="message-form">
      <div class="input-row">
        <input
          v-model="messageContent"
          type="text"
          placeholder="想说点什么？魂哥看到会审核的 😊"
          class="input-message"
          maxlength="100"
          @keyup.enter="submitMessage"
        />
        <button class="submit-btn" @click="submitMessage" :disabled="!messageContent.trim()">发送</button>
      </div>
      <p v-if="submitStatus" class="submit-tip">{{ submitStatus }}</p>
    </div>

    <!-- 小字说明 -->
    <p class="thanks-note">每一条留言都是动力，每一份支持都记在心里</p>

    <!-- 时间轴区 -->
    <div class="timeline-section">
      <div class="timeline-title">📅 站点历程</div>

      <!-- 桌面端横向轴线 -->
      <div class="timeline-horizontal desktop-only" v-if="timeline.length > 0">
        <div class="timeline-line"></div>
        <div class="timeline-nodes">
          <div
            v-for="(item, idx) in timeline"
            :key="item.id"
            class="timeline-node"
            :class="{ above: idx % 2 === 0, below: idx % 2 !== 0 }"
          >
            <div class="node-dot"></div>
            <div class="node-content">
              <div class="node-date">{{ formatDate(item.event_date) }}</div>
              <div class="node-title">{{ item.title }}</div>
              <div v-if="item.description" class="node-desc">{{ item.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 移动端纵向列表 -->
      <div class="timeline-vertical mobile-only" v-if="timeline.length > 0">
        <div class="v-line"></div>
        <div
          v-for="item in timeline"
          :key="item.id"
          class="v-item"
        >
          <div class="v-dot"></div>
          <div class="v-content">
            <div class="v-date">{{ formatDate(item.event_date) }}</div>
            <div class="v-title">{{ item.title }}</div>
            <div v-if="item.description" class="v-desc">{{ item.description }}</div>
          </div>
        </div>
      </div>

      <p v-if="timeline.length === 0" class="timeline-empty">📝 站点历程正在整理中，稍后更新</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  initialMessages: { type: Array, default: () => [] },
  initialTimeline: { type: Array, default: () => [] }
})

const messageContent = ref('')
const submitStatus = ref('')

const approvedMessages = ref(props.initialMessages || [])
const timeline = ref(props.initialTimeline || [])

// 三行弹幕：把留言打散到三行里
const marqueeRows = computed(() => {
  const msgs = approvedMessages.value
  if (msgs.length === 0) return [[], [], []]
  const rows = [[], [], []]
  msgs.forEach((msg, idx) => {
    rows[idx % 3].push(msg)
  })
  return rows.map(row => [...row, ...row])
})

// 三行不同速度
const speeds = [25, 35, 30]

// 提交留言
async function submitMessage() {
  const content = messageContent.value.trim()
  if (!content) return
  const { error } = await supabase
    .from('thanks_messages')
    .insert({
      nickname: null,
      content,
      status: 'pending'
    })
  if (error) {
    submitStatus.value = '发送失败，请稍后再试 😢'
    return
  }
  submitStatus.value = '已发送，待魂哥审核后显示 🙏'
  messageContent.value = ''
  setTimeout(() => { submitStatus.value = '' }, 3000)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
</script>

<style scoped>
.thanks-inner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ═══════════ 弹幕区域（可调参数） ═══════════ */
.marquee-area {
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 0.2rem 0;        /* 【可调】上下内边距，控制弹幕区域整体高度 */
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;               /* 【可调】三行之间的垂直间距，越小越紧凑 */
  height: auto;
}

.marquee-row {
  height: 1.4rem;            /* 【可调】每行高度，改小压缩单行，改大松散 */
  overflow: hidden;
  position: relative;
}

.marquee-scroll {
  display: flex;
  gap: 1.2rem;               /* 【可调】弹幕气泡之间的水平间距 */
  animation: marqueeRightToLeft linear infinite;
  white-space: nowrap;
  position: absolute;
  left: 0;
}

.marquee-item {
  font-size: 0.82rem;        /* 【可调】弹幕文字大小 */
  color: var(--text-primary);
  background: var(--overlay-white-06);
  padding: 0.1rem 0.6rem;    /* 【可调】气泡内边距，上下值越小单行越矮 */
  border-radius: 12px;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.2;          /* 【可调】行高，越小文字越紧凑 */
}

.marquee-item.highlight {
  background: var(--brand-border);
  font-weight: 600;
}

.emoji-deco {
  margin-left: 0.25rem;
  font-size: 0.65rem;
  opacity: 0.7;
}

.marquee-empty {
  text-align: center;
  padding: 0.8rem 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

@keyframes marqueeRightToLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* 留言表单 */
.message-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-message {
  flex: 1;
  background: var(--overlay-white-06);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  padding: 0.5rem;
  font-size: 0.85rem;
}

.submit-btn {
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: #000;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
  min-height: 44px;
}

.submit-btn:active {
  transform: scale(0.95);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.submit-tip {
  font-size: 0.8rem;
  color: var(--accent);
  margin: 0;
}

/* 小字说明 */
.thanks-note {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
}

/* 时间轴标题 */
.timeline-title {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 1rem;
}

.timeline-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
  padding: 1rem 0;
}

/* 桌面端横向时间轴 */
.timeline-horizontal {
  position: relative;
  padding: 2rem 0 1rem;
}

.timeline-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--border);
  transform: translateY(-50%);
}

.timeline-nodes {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.timeline-node {
  position: relative;
  width: 120px;
  text-align: center;
}

.timeline-node.above {
  top: -30px;
}

.timeline-node.below {
  top: 30px;
}

.node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  margin: 0 auto 0.5rem;
}

.node-date {
  font-size: 0.65rem;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.2rem;
}

.node-title {
  font-size: 0.8rem;
  color: var(--text-primary);
  font-weight: 500;
}

.node-desc {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
  line-height: 1.3;
}

/* 移动端纵向时间轴 */
.timeline-vertical {
  position: relative;
  padding-left: 1.5rem;
}

.v-line {
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border);
}

.v-item {
  position: relative;
  margin-bottom: 1.25rem;
}

.v-dot {
  position: absolute;
  left: -1.5rem;
  top: 0.35rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.v-date {
  font-size: 0.7rem;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.15rem;
}

.v-title {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 500;
}

.v-desc {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.1rem;
  line-height: 1.4;
}

.desktop-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none; }
  .mobile-only { display: block; }
}
</style>