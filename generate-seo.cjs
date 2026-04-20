/**
 * SEO静态HTML生成器 - 双轨制
 * 生成极简HTML，专门服务爬虫和AI
 * 运行方式: node generate-seo.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Supabase 配置
const SUPABASE_URL = 'https://azvcjobnbgreffuuceyi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hV8gIo_nFvqyYHhKqsi6Rw_S9AfwazX';

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
<title>CPU显卡性能排行榜 | 奇魂硬件天梯</title>
<meta name="description" content="实时CPU/显卡游戏性能排行榜，以i5-12490F为100%基准，含全新价/二手价、性价比分析。持续更新，独家实测数据。">
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
.updated{color:#888;font-size:12px;margin-bottom:20px}
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

<h1>🖥️ CPU显卡性能天梯排行榜</h1>
<p class="updated">基准CPU：i5-12490F = 100% | 数据更新：${new Date().toLocaleDateString('zh-CN')} | <a href="https://www.5vip.top">查看完整交互版 →</a></p>

<h2>📊 CPU性能排行榜（游戏性能降序）</h2>
<table>
<thead>
<tr><th>#</th><th>型号</th><th>游戏%</th><th>多核%</th><th>游戏帧数</th><th>多核分</th><th>核心</th><th>线程</th><th>基础频率</th><th>加速频率</th><th>TDP</th><th>全新价</th><th>二手价</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

<h2>🎮 GPU性能排行榜（2K游戏性能降序）</h2>
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
}

main().catch(console.error);
