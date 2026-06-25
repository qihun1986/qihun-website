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
          placeholder="想说点什么？魂哥审核后大家都会看到哦 😊"
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

      <!-- 桌面端：横向表格时间轴（可左右滑动） -->
      <div class="timeline-table-wrapper desktop-only" v-if="timeline.length > 0">
        <table class="timeline-table">
          <!-- 上方事件行（偶数索引） -->
          <tr class="timeline-above-row">
            <td
              v-for="(item, idx) in timeline"
              :key="'a' + item.id"
              class="timeline-cell above-cell"
              :class="{ hidden: idx % 2 !== 0 }"
            >
              <div v-if="idx % 2 === 0" class="node-content">
                <div v-if="item.description" class="node-desc">{{ item.description }}</div>
                <div class="node-title">{{ item.title }}</div>
                <div class="node-date">{{ formatDate(item.event_date) }}</div>
                <div class="node-dot"></div>
              </div>
            </td>
          </tr>
          <!-- 时间轴横线行 -->
          <tr class="timeline-line-row">
            <td
              v-for="(item, idx) in timeline"
              :key="'l' + item.id"
              class="timeline-line-cell"
            ></td>
          </tr>
          <!-- 下方事件行（奇数索引） -->
          <tr class="timeline-below-row">
            <td
              v-for="(item, idx) in timeline"
              :key="'b' + item.id"
              class="timeline-cell below-cell"
              :class="{ hidden: idx % 2 === 0 }"
            >
              <div v-if="idx % 2 !== 0" class="node-content">
                <div class="node-dot"></div>
                <div class="node-date">{{ formatDate(item.event_date) }}</div>
                <div class="node-title">{{ item.title }}</div>
                <div v-if="item.description" class="node-desc">{{ item.description }}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- 移动端：竖向时间轴（中间竖线，左右交错卡片） -->
      <div class="timeline-vertical-mobile mobile-only" v-if="timeline.length > 0">
        <div class="v-timeline-line"></div>
        <div
          v-for="(item, idx) in timeline"
          :key="item.id"
          class="v-row"
          :class="{ 'v-left': idx % 2 === 0, 'v-right': idx % 2 !== 0 }"
        >
          <div class="v-spacer"></div>
          <div class="v-dot"></div>
          <div class="v-card">
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

// 三行弹幕：第1行=高亮消息（专用），第2/3行=普通消息轮流分配
const marqueeRows = computed(() => {
  const msgs = approvedMessages.value
  if (msgs.length === 0) return [[], [], []]
  
  const highlighted = msgs.filter(m => m.highlight)
  const normal = msgs.filter(m => !m.highlight)
  
  const rows = [[], [], []]
  
  // 第1行：只放高亮消息
  rows[0] = highlighted.length > 0 ? [...highlighted, ...highlighted] : []
  
  // 第2/3行：普通消息轮流分配
  normal.forEach((msg, idx) => {
    rows[1 + (idx % 2)].push(msg)
  })
  
  // 每行复制一份实现无缝滚动
  return rows.map(row => [...row, ...row])
})

// 三行不同速度
const speeds = [25, 35, 30]

// 提交留言（已修复 Supabase 动态导入）
async function submitMessage() {
  const content = messageContent.value.trim()
  if (!content) return

  try {
    // 动态导入 Supabase 客户端，避免本地开发时静态加载
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.rpc('insert_thanks_message', { 
      message_content: content 
    })

    if (error) {
      submitStatus.value = '发送失败，请稍后再试 😢'
      return
    }
    submitStatus.value = '已发送，待魂哥审核后就显示啦 🙏'
    messageContent.value = ''
    setTimeout(() => { submitStatus.value = '' }, 3000)
  } catch (e) {
    submitStatus.value = '网络错误，请检查连接后重试 📡'
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
</script>

<style scoped>
/* ============================================================
   全局容器 & 弹幕区 & 表单 & 小字说明（保持原样）
   ============================================================ */
.thanks-inner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.marquee-area {
  background: var(--highlight-bg);
  border-radius: 8px;
  padding: 0.25rem 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  height: auto;
}
.marquee-row { height: 1.6rem; overflow: hidden; position: relative; }
.marquee-scroll {
  display: flex; gap: 1.2rem;
  animation: marqueeRightToLeft linear infinite;
  white-space: nowrap; position: absolute; left: 0;
}
.marquee-item {
  font-size: 0.82rem; color: var(--text-primary);
  background: var(--bg-tertiary); padding: 0.15rem 0.6rem;
  border-radius: 12px; white-space: nowrap; flex-shrink: 0; line-height: 1.3;
}
.marquee-item.highlight {
  background: var(--value-gold-bg); font-weight: 600;
}
.emoji-deco { margin-left: 0.25rem; font-size: 0.65rem; opacity: 0.7; }
.marquee-empty {
  text-align: center; padding: 0.8rem 0;
  color: var(--text-secondary); font-size: 0.85rem;
}
@keyframes marqueeRightToLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.message-form { display: flex; flex-direction: column; gap: 0.4rem; }
.input-row { display: flex; gap: 0.5rem; }
.input-message {
  flex: 1; background: var(--bg-secondary); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); padding: 0.5rem; font-size: 0.85rem;
}
.submit-btn {
  padding: 0.5rem 1rem; background: transparent;
  border: 2px solid var(--btn-gold); color: var(--btn-gold);
  font-weight: 600; border-radius: 6px; cursor: pointer;
  font-size: 0.85rem; transition: all 0.15s; min-height: 44px;
}
.submit-btn:hover { background: var(--btn-gold); color: var(--btn-gold-text); }
.submit-btn:active { transform: scale(0.95); }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.submit-tip { font-size: 0.8rem; color: var(--accent); margin: 0; }
.thanks-note { font-size: 0.8rem; color: var(--text-secondary); text-align: center; margin: 0; }

/* ============================================================
   时间轴标题 & 空状态
   ============================================================ */
.timeline-title { font-size: 1rem; color: var(--text-primary); font-weight: 600; margin-bottom: 1rem; }
.timeline-empty { font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 1rem 0; }

/* ============================================================
   桌面端横向表格时间轴
   ============================================================ */
.timeline-table-wrapper {
  overflow-x: auto;          /* 内容超出时左右滑动 */
  padding-bottom: 0.5rem;
}
.timeline-table {
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 100%;
}

/* 每个事件列 */
.timeline-cell {
  width: 130px;              /* ★ 列宽 */
  text-align: center;
  padding: 0 6px;
  position: relative;        /* 让圆点相对于单元格定位 */
  vertical-align: middle;    /* 配合时间线行居中 */
}

/* 上方行 */
.above-cell .node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 14px;      /* ★ 底部留空给圆点（可调） */
}
/* 上方圆点：贴单元格底部 */
.above-cell .node-dot {
  position: absolute;
  bottom: -12px;              /* ★ 圆点露出单元格底部的高度（可调） */
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
}

/* 下方行 */
.below-cell .node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 14px;         /* ★ 顶部留空给圆点（可调） */
}
/* 下方圆点：贴单元格顶部 */
.below-cell .node-dot {
  position: absolute;
  top: -12px;                 /* ★ 圆点露出单元格顶部的高度（可调） */
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
}

/* 隐藏空单元格 */
.timeline-cell.hidden {
  visibility: hidden;
}

/* 时间线横线行 */
.timeline-line-cell {
  height: 14px;              /* ★ 时间线行高（可调） */
  position: relative;
  padding: 0;
}
/* ★ 让时间线行的层级低于上方事件行（避免遮住圆点） */
.timeline-above-row .timeline-cell {
  z-index: 2;
}
.timeline-line-row {
  z-index: 1;
}
.timeline-line-cell::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;               /* ★ 时间线粗细 */
  background: var(--border); /* ★ 时间线颜色（可换 var(--accent) 等） */
  transform: translateY(-50%);
}

/* 圆点 */
.node-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--accent);
  margin: 0.3rem auto;       /* ★ 圆点与上下文字的间距 */
}

/* 日期、标题、描述 */
.node-date {
  font-size: 0.65rem;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.2rem;
}
.node-title { font-size: 0.8rem; color: var(--text-primary); font-weight: 500; }
.node-desc { font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem; line-height: 1.3; }

/* ============================================================
   移动端竖向时间轴（中间竖线 + 左右卡片）
   ============================================================ */
.timeline-vertical-mobile {
  position: relative;
  max-height: 60vh;          /* ★ 限制最大高度，超出可上下滑动（改这个数字控制高度） */
  overflow-y: auto;          /* 允许上下滑动 */
  padding: 0;
}

/* 中间竖线 */
.v-timeline-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;               /* ★ 竖线粗细 */
  background: var(--border); /* ★ 竖线颜色 */
  transform: translateX(-50%);
  z-index: 0;
}

/* 每一行 */
.v-row {
  display: flex;
  align-items: flex-start;
  position: relative;
  margin-bottom: 1.5rem;     /* ★ 行间距 */
  z-index: 1;
}

/* 左右空白区域（撑开空间） */
.v-spacer {
  flex: 1;
}

/* 圆点：通过绝对定位固定在竖线上 */
.v-dot {
  position: absolute;
  top: 0.5rem;               /* ★ 圆点距卡片顶部的距离（可微调） */
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  z-index: 2;
}

/* 卡片样式 */
.v-card {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-card);
  z-index: 1;
}

/* 左侧卡片（偶数）：卡片在左 */
.v-left {
  flex-direction: row-reverse;
}
.v-left .v-card {
  margin-right: 3rem;        /* ★ 左侧卡片距离竖线的距离 */
  text-align: right;
}
/* 右侧卡片（奇数）：卡片在右 */
.v-right {
  flex-direction: row;
}
.v-right .v-card {
  margin-left: 3rem;         /* ★ 右侧卡片距离竖线的距离 */
  text-align: left;
}

/* 移动端文字样式 */
.v-date {
  font-size: 0.65rem;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.15rem;
}
.v-title { font-size: 0.8rem; color: var(--text-primary); font-weight: 500; }
.v-desc { font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.1rem; line-height: 1.3; }

/* ============================================================
   响应式显示控制
   ============================================================ */
.desktop-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .desktop-only { display: none; }
  .mobile-only { display: block; }
}
</style>