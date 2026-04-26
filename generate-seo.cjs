/**
 * SEO静态HTML生成器 - 双轨制
 * 生成极简HTML，专门服务爬虫和AI
 * 运行方式: node generate-seo.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Supabase 配置（从 .env 读取，不硬编码密钥）
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 缺少环境变量 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY，请检查 .env 文件');
  process.exit(1);
}

function fetchJSON(path_url) {
    return new Promise((resolve, reject) => {
        const url = new URL(path_url, SUPABASE_URL);
        const options = {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(new Error('JSON parse error: ' + data)); }
            });
        }).on('error', reject);
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function generateHTML(cpus, gpus) {
    // 计算性价比分数
    const cpusSorted = [...cpus].sort((a, b) => (b.abs_game_performance || 0) - (a.abs_game_performance || 0));
    const gpusSorted = [...gpus].sort((a, b) => (b.abs_game_performance_2k || 0) - (a.abs_game_performance_2k || 0));

    const baseCPU = cpus.find(c => c.model === 'INTEL Core i5-12490F') || cpus.find(c => c.model.includes('12490F')) || cpusSorted[0];
    const baseGame = baseCPU?.abs_game_performance || 100;

    let rows = '';

    // CPU表
    cpusSorted.forEach((cpu, i) => {
        const gamePct = cpu.abs_game_performance
            ? ((cpu.abs_game_performance / baseGame) * 100).toFixed(0) + '%'
            : '-';
        const multiPct = baseCPU?.abs_multi_performance
            ? ((cpu.abs_multi_performance / baseCPU.abs_multi_performance) * 100).toFixed(0) + '%'
            : '-';
        rows += `<tr>
  <td>${i + 1}</td>
  <td>${escapeHtml(cpu.model)}</td>
  <td>${gamePct}</td>
  <td>${multiPct}</td>
  <td>${cpu.abs_game_performance || '-'}</td>
  <td>${cpu.abs_multi_performance || '-'}</td>
  <td>${cpu.cores || '-'}</td>
  <td>${cpu.threads || '-'}</td>
  <td>${cpu.base_freq || '-'}</td>
  <td>${cpu.boost_freq || '-'}</td>
  <td>${cpu.tdp || '-'}</td>
  <td>${cpu.new_price ? '¥' + cpu.new_price : '-'}</td>
  <td>${cpu.used_price ? '¥' + cpu.used_price : '-'}</td>
</tr>`;
    });

    // GPU表
    let gpuRows = '';
    gpusSorted.forEach((gpu, i) => {
        gpuRows += `<tr>
  <td>${i + 1}</td>
  <td>${escapeHtml(gpu.model)}</td>
  <td>${gpu.abs_game_performance_1080p || '-'}</td>
  <td>${gpu.abs_game_performance_2k || '-'}</td>
  <td>${gpu.abs_game_performance_4k || '-'}</td>
  <td>${gpu.render_performance || '-'}</td>
  <td>${gpu.vram || '-'}</td>
  <td>${gpu.tdp ? gpu.tdp + 'W' : '-'}</td>
  <td>${gpu.new_price ? '¥' + gpu.new_price : '-'}</td>
  <td>${gpu.used_price ? '¥' + gpu.used_price : '-'}</td>
</tr>`;
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CPU性价比榜_显卡性价比榜_历史价格走势 - 奇魂硬件榜</title>
<meta name="description" content="实时更新CPU显卡性价比榜，每周特价推荐，历史价格走势查询。高性价比CPU显卡选购指南，适合游戏玩家和装机小白。">
<link rel="canonical" href="https://www.5vip.top/">
<meta name="robots" content="index, follow">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "奇魂CPU显卡性能排行榜",
  "description": "CPU/显卡游戏性能天梯图，含性价比分析和实时价格",
  "creator": {"@type": "Person", "name": "奇魂", "url": "https://www.5vip.top"},
  "dateModified": "${new Date().toISOString().split('T')[0]}",
  "spatialCoverage": "全球硬件市场",
  "license": "https://creativecommons.org/licenses/by-nc/4.0/"
}
</script>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:1400px;margin:0 auto;padding:20px;line-height:1.6;color:#222;font-size:14px}
h1{font-size:20px;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:4px}
h2{font-size:16px;margin-top:24px;color:#1a1a2e;background:#f5f5f5;padding:6px 10px;border-left:4px solid #d4af37}
.updated{color:#888;font-size:12px;margin-bottom:12px}
.intro{background:#f8f9fa;padding:12px 16px;border-radius:6px;margin-bottom:20px;line-height:1.8}
.intro strong{color:#1a1a2e}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
th{background:#1a1a2e;color:#fff;padding:6px 8px;text-align:left;position:sticky;top:0}
td{padding:5px 8px;border-bottom:1px solid #eee}
tr:nth-child(even){background:#fafafa}
tr:hover{background:#f0f0f0}
.num{text-align:center;color:#888;font-size:11px;width:32px}
.price-new{color:#e04040;font-weight:bold}
.price-used{color:#228b22}
.benchmark{color:#666}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;color:#666;font-size:12px}
a{color:#1a56db;text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>

<h1>CPU显卡性价比榜</h1>
<p class="updated">基准CPU：i5-12490F = 100% | 数据更新：${new Date().toLocaleDateString('zh-CN')} | <a href="https://www.5vip.top">查看完整交互版 →</a></p>

<p class="intro">本榜单每周更新，实时追踪CPU显卡性价比，为您推荐<strong>高性价比CPU</strong>和<strong>高性价比显卡</strong>。包含<strong>历史价格走势</strong>，帮助您把握<strong>特价</strong>时机。数据来源于淘宝、拼多多实测价格，性价比公式为：游戏性能 ÷ 价格 × 倍率。适合预算有限的游戏玩家和装机小白参考。</p>

<h2>高性价比CPU推荐</h2>
<table>
<thead>
<tr><th>#</th><th>型号</th><th>游戏%</th><th>多核%</th><th>游戏帧数</th><th>多核分</th><th>核心</th><th>线程</th><th>基础频率</th><th>加速频率</th><th>TDP</th><th>全新价</th><th>二手价</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

<h2>高性价比显卡推荐</h2>
<table>
<thead>
<tr><th>#</th><th>型号</th><th>1080p帧数</th><th>2K帧数</th><th>4K帧数</th><th>渲染性能</th><th>显存</th><th>TDP</th><th>全新价</th><th>二手价</th></tr>
</thead>
<tbody>
${gpuRows}
</tbody>
</table>

<footer>
<p>📌 数据来源：<a href="https://www.5vip.top">奇魂硬件评测</a> | B站：<a href="https://space.bilibili.com/1723592174">奇魂硬件</a></p>
<p>⚠️ 价格仅供参考，以实际售价为准。性能数据基于公开评测综合整理。</p>
</footer>

</body>
</html>`;
}

async function upsertSiteConfig(key, value) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ key, value });
        const url = new URL('/rest/v1/site_config', SUPABASE_URL);
        const options = {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            }
        };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { resolve(null); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('📡 正在获取数据...');

    const [cpus, gpus] = await Promise.all([
        fetchJSON('/rest/v1/cpu_current?select=*&order=abs_game_performance.desc.nullslast'),
        fetchJSON('/rest/v1/gpu_current?select=*&order=abs_game_performance_2k.desc.nullslast')
    ]);

    console.log(`✅ 获取到 ${cpus.length} 个CPU，${gpus.length} 个GPU`);

    const html = generateHTML(cpus, gpus);
    const outputPath = path.join(__dirname, 'public', 'seo.html');

    fs.writeFileSync(outputPath, html, 'utf8');
    const stats = fs.statSync(outputPath);
    console.log(`✅ 已生成: ${outputPath}`);
    console.log(`📦 文件大小: ${(stats.size / 1024).toFixed(1)} KB`);

    // 自动追加更新日志
    console.log('📝 正在更新日志...');
    let existingLog = [];
    try {
        const data = await fetchJSON('/rest/v1/site_config?key=eq.update_log&select=value');
        if (data && data[0] && data[0].value) {
            existingLog = JSON.parse(data[0].value);
        }
    } catch(e) {}

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
    const newEntry = {
        date: dateStr,
        text: `SEO页面自动更新，CPU榜${cpus.length}款 / 显卡榜${gpus.length}款`,
        type: 'auto'
    };

    // 去重：同一天已存在则跳过
    const alreadyExists = existingLog.some(e => e.date === dateStr && e.type === 'auto');
    if (!alreadyExists) {
        existingLog.unshift(newEntry);
        // 最多保留30条
        if (existingLog.length > 30) existingLog = existingLog.slice(0, 30);
        await upsertSiteConfig('update_log', JSON.stringify(existingLog));
        console.log(`✅ 更新日志已追加: ${dateStr} - ${newEntry.text}`);
    } else {
        console.log(`ℹ️ 今日(${dateStr})日志已存在，跳过`);
    }
}

main().catch(console.error);
