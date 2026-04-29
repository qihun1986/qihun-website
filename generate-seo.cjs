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
    // 计算排序
    const cpusSorted = [...cpus].sort((a, b) => (b.abs_game_performance || 0) - (a.abs_game_performance || 0));
    const gpusSorted = [...gpus].sort((a, b) => (b.abs_game_performance_2k || 0) - (a.abs_game_performance_2k || 0));

    // 性价比排序（游戏性能/全新价格，仅计算有价格的型号）
    const cpusWithValue = cpus.filter(c => c.new_price && c.abs_game_performance);
    const gpusWithValue = gpus.filter(g => g.new_price && g.abs_game_performance_2k);
    const cpusValueSorted = [...cpusWithValue].sort((a, b) => (a.new_price / a.abs_game_performance) - (b.new_price / b.abs_game_performance));
    const gpusValueSorted = [...gpusWithValue].sort((a, b) => (a.new_price / a.abs_game_performance_2k) - (b.new_price / b.abs_game_performance_2k));

    const baseCPU = cpus.find(c => c.model === 'INTEL Core i5-12490F') || cpus.find(c => c.model.includes('12490F')) || cpusSorted[0];
    const baseGame = baseCPU?.abs_game_performance || 100;
    const baseNewPrice = baseCPU?.new_price || 1; // 用于计算性价比基准
    const baseValueCPU = cpusWithValue.find(c => c.model === 'INTEL Core i5-12490F') || cpusWithValue[0];
    const cpuValueBase = baseValueCPU ? (baseValueCPU.new_price / baseValueCPU.abs_game_performance) : 1;

    const today = new Date().toISOString().split('T')[0];
    const dateDisplay = new Date().toLocaleDateString('zh-CN');
    const year = new Date().getFullYear();

    // --- 构建 ItemList JSON-LD (TOP10 CPU + TOP10 GPU) ---
    const cpuListItems = cpusSorted.slice(0, 10).map((cpu, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `https://www.5vip.top/?search=${encodeURIComponent(cpu.model)}`,
        'name': cpu.model
    }));
    const gpuListItems = gpusSorted.slice(0, 10).map((gpu, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `https://www.5vip.top/gpu?search=${encodeURIComponent(gpu.model)}`,
        'name': gpu.model
    }));

    // --- 构建 Product JSON-LD (TOP3 CPU + TOP3 GPU) ---
    const cpuProducts = cpusSorted.slice(0, 3).filter(c => c.new_price).map(cpu => ({
        '@type': 'Product',
        'name': cpu.model,
        'description': `游戏性能 ${((cpu.abs_game_performance / baseGame) * 100).toFixed(0)}% / ${cpu.cores || '-'}核${cpu.threads || '-'}线程`,
        'offers': {
            '@type': 'Offer',
            'price': cpu.new_price,
            'priceCurrency': 'CNY',
            'availability': 'https://schema.org/InStock',
            'seller': {'@type': 'Person', 'name': '奇魂'}
        },
        'additionalProperty': [
            {'@type': 'PropertyValue', 'name': '游戏性能基准分', 'value': cpu.abs_game_performance},
            {'@type': 'PropertyValue', 'name': '核心线程', 'value': `${cpu.cores || '-'}/${cpu.threads || '-'}`},
            {'@type': 'PropertyValue', 'name': 'TDP', 'value': cpu.tdp ? cpu.tdp + 'W' : '-'}
        ]
    }));
    const gpuProducts = gpusSorted.slice(0, 3).filter(g => g.new_price).map(gpu => ({
        '@type': 'Product',
        'name': gpu.model,
        'description': `2K游戏帧数 ${gpu.abs_game_performance_2k || '-'} / 显存 ${gpu.vram || '-'}`,
        'offers': {
            '@type': 'Offer',
            'price': gpu.new_price,
            'priceCurrency': 'CNY',
            'availability': 'https://schema.org/InStock',
            'seller': {'@type': 'Person', 'name': '奇魂'}
        },
        'additionalProperty': [
            {'@type': 'PropertyValue', 'name': '2K帧数', 'value': gpu.abs_game_performance_2k || '-'},
            {'@type': 'PropertyValue', 'name': '显存', 'value': gpu.vram || '-'},
            {'@type': 'PropertyValue', 'name': 'TDP', 'value': gpu.tdp ? gpu.tdp + 'W' : '-'}
        ]
    }));

    // --- 构建 FAQPage JSON-LD ---
    const topCpu = cpusValueSorted[0];
    const topGpu = gpusValueSorted[0];
    const cheapGamingCpu = cpusWithValue.filter(c => c.new_price <= 800).sort((a, b) => (b.abs_game_performance || 0) - (a.abs_game_performance || 0))[0];
    const midGpu = gpusWithValue.filter(g => g.new_price >= 2000 && g.new_price <= 4000).sort((a, b) => (b.abs_game_performance_2k || 0) - (a.abs_game_performance_2k || 0))[0];

    const faqItems = [
        {
            question: `${year}年性价比最高的游戏CPU是哪款？`,
            answer: topCpu ? `根据奇魂硬件榜实测数据，${topCpu.model}是${year}年性价比最高的游戏CPU，全新价¥${topCpu.new_price}，游戏性能达${((topCpu.abs_game_performance / baseGame) * 100).toFixed(0)}%（以i5-12490F为100%基准），每元性能最高。数据来源：https://www.5vip.top` : `${year}年游戏CPU性价比排行请参考奇魂硬件榜，以i5-12490F为100%基准，按游戏性能/价格计算性价比。`
        },
        {
            question: `${year}年性价比最高的显卡是哪款？`,
            answer: topGpu ? `根据奇魂硬件榜实测数据，${topGpu.model}是${year}年性价比最高的显卡，全新价¥${topGpu.new_price}，2K游戏帧数${topGpu.abs_game_performance_2k}，每元帧数最高。数据来源：https://www.5vip.top` : `${year}年显卡性价比排行请参考奇魂硬件榜，按2K游戏帧数/价格计算性价比。`
        },
        {
            question: `800元以内游戏CPU推荐？`,
            answer: cheapGamingCpu ? `预算800元以内，推荐${cheapGamingCpu.model}，全新价¥${cheapGamingCpu.new_price}，游戏性能${((cheapGamingCpu.abs_game_performance / baseGame) * 100).toFixed(0)}%，是入门游戏最优选。更多预算档位推荐见：https://www.5vip.top` : `800元以内游戏CPU推荐请参考奇魂硬件榜，按性价比排序筛选。`
        },
        {
            question: `2000-4000元显卡推荐？`,
            answer: midGpu ? `2000-4000元档位推荐${midGpu.model}，全新价¥${midGpu.new_price}，2K游戏帧数${midGpu.abs_game_performance_2k}，是中端游戏甜点级选择。更多档位推荐见：https://www.5vip.top` : `2000-4000元显卡推荐请参考奇魂硬件榜，按性价比排序筛选。`
        },
        {
            question: `CPU游戏性能天梯图怎么看？`,
            answer: `奇魂硬件榜CPU天梯图以i5-12490F为100%基准，所有CPU按12款热门游戏实际表现排名，非跑分。百分比越高游戏帧数越强，可按预算和需求筛选。访问 https://www.5vip.top/tier 查看完整天梯图。`
        },
        {
            question: `显卡游戏性能天梯图怎么看？`,
            answer: `奇魂硬件榜显卡天梯图按2K游戏帧数排名，包含1080p/2K/4K三档分辨率性能数据。百分比越高游戏表现越强。访问 https://www.5vip.top/gpu 查看完整榜单。`
        }
    ];

    // --- 构建 HowTo JSON-LD ---
    const howToSteps = [
        {
            '@type': 'HowToStep',
            'name': '确定预算',
            'text': '先确定整体装机预算，建议CPU占总预算15-25%，显卡占30-50%。例如5000元装机，CPU预算750-1250元，显卡1500-2500元。'
        },
        {
            '@type': 'HowToStep',
            'name': '选择CPU',
            'text': '根据游戏需求选择CPU：纯游戏优先看游戏性能%（i5-12490F=100%基准），兼顾生产力看多核性能。入门推荐12400F/5600，中端推荐12490F/7500F，高端推荐9800X3D/14600K。'
        },
        {
            '@type': 'HowToStep',
            'name': '选择显卡',
            'text': '根据分辨率选择显卡：1080p选RX 6600/RTX 3060以上，2K选RTX 4060 Ti/RX 7700 XT以上，4K选RTX 4080S/RX 7900 XTX以上。关注显存容量和功耗。'
        },
        {
            '@type': 'HowToStep',
            'name': '查看性价比排行',
            'text': '在奇魂硬件榜(https://www.5vip.top)按性价比排序，找到同价位性能最强的型号。注意价格波动，参考历史最低价判断入手时机。'
        },
        {
            '@type': 'HowToStep',
            'name': '确认兼容性',
            'text': '确认CPU和主板接口匹配（Intel用LGA1700/LGA1851，AMD用AM5），内存选择对应平台（DDR4/DDR5），电源功率满足显卡和CPU的TDP需求。'
        }
    ];

    let rows = '';

    // CPU表（加性价比列）
    cpusSorted.forEach((cpu, i) => {
        const gamePct = cpu.abs_game_performance
            ? ((cpu.abs_game_performance / baseGame) * 100).toFixed(0) + '%'
            : '-';
        const multiPct = baseCPU?.abs_multi_performance
            ? ((cpu.abs_multi_performance / baseCPU.abs_multi_performance) * 100).toFixed(0) + '%'
            : '-';
        // 性价比 = (游戏性能/价格) / 基准CPU的(游戏性能/价格) * 100
        const cpuValue = (cpu.new_price && cpu.abs_game_performance)
            ? ((cpuValueBase / (cpu.new_price / cpu.abs_game_performance)) * 100).toFixed(0) + '%'
            : '-';
        rows += `<tr>
  <td>${i + 1}</td>
  <td>${escapeHtml(cpu.model)}</td>
  <td>${cpuValue}</td>
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

    // GPU性价比基准
    const baseValueGpu = gpusWithValue.find(g => g.model.includes('RTX 4060')) || gpusWithValue[0];
    const gpuValueBase = baseValueGpu ? (baseValueGpu.new_price / baseValueGpu.abs_game_performance_2k) : 1;

    // GPU表（加性价比列）
    let gpuRows = '';
    gpusSorted.forEach((gpu, i) => {
        const gpuValue = (gpu.new_price && gpu.abs_game_performance_2k)
            ? ((gpuValueBase / (gpu.new_price / gpu.abs_game_performance_2k)) * 100).toFixed(0) + '%'
            : '-';
        gpuRows += `<tr>
  <td>${i + 1}</td>
  <td>${escapeHtml(gpu.model)}</td>
  <td>${gpuValue}</td>
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
<title>${year}年CPU性价比排行榜（含游戏帧数/多核性能）_显卡性价比榜_历史最低价查询 - 奇魂硬件榜</title>
<meta name="description" content="奇魂硬件榜实时更新${year}年CPU显卡性价比排行榜，涵盖${cpusSorted.length}款CPU和${gpusSorted.length}款显卡，含游戏帧数、多核性能对比及历史最低价走势。适合游戏玩家和装机用户，高性价比CPU显卡推荐。">
<meta name="keywords" content="CPU性价比排行榜,${year}年CPU推荐,显卡性价比排行,游戏CPU天梯图,显卡天梯图,历史最低价,装机推荐,游戏帧数对比">
<link rel="canonical" href="https://www.5vip.top/">
<meta name="robots" content="index, follow">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "奇魂CPU显卡性能排行榜",
  "description": "${year}年最新CPU/显卡性价比排行榜，含游戏帧数、多核性能、实时价格及历史走势分析。收录${cpusSorted.length}款主流CPU和${gpusSorted.length}款显卡数据。",
  "creator": {"@type": "Person", "name": "奇魂", "url": "https://www.5vip.top"},
  "dateModified": "${today}",
  "spatialCoverage": "全球硬件市场",
  "license": "https://creativecommons.org/licenses/by-nc/4.0/",
  "variableMeasured": [
    {"@type": "PropertyValue", "name": "CPU数量", "value": "${cpusSorted.length}"},
    {"@type": "PropertyValue", "name": "GPU数量", "value": "${gpusSorted.length}"}
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "${year}年CPU性价比排行榜TOP10",
  "description": "按游戏性能排序的CPU推荐榜单，基准：i5-12490F=100%",
  "itemListElement": ${JSON.stringify(cpuListItems)}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "${year}年显卡性价比排行榜TOP10",
  "description": "按2K游戏性能排序的显卡推荐榜单",
  "itemListElement": ${JSON.stringify(gpuListItems)}
}
</script>
${cpuProducts.length ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": ${JSON.stringify(cpuProducts)}
}
</script>` : ''}
${gpuProducts.length ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": ${JSON.stringify(gpuProducts)}
}
</script>` : ''}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": ${JSON.stringify(faqItems.map(f => ({
    '@type': 'Question',
    'name': f.question,
    'acceptedAnswer': {'@type': 'Answer', 'text': f.answer}
  })))}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "如何选择游戏CPU和显卡",
  "description": "${year}年游戏装机CPU显卡选购指南，根据预算和需求选择性价比最高的搭配方案",
  "step": ${JSON.stringify(howToSteps)},
  "tool": [
    {"@type": "HowToTool", "name": "奇魂硬件榜 - CPU显卡性价比排行"},
    {"@type": "HowToTool", "name": "B站奇魂硬件 - 实测视频"}
  ]
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

<h1>${year}年CPU显卡性价比排行榜</h1>
<p class="updated">基准CPU：i5-12490F = 100% | 数据更新：${dateDisplay}（${today}） | 共${cpusSorted.length}款CPU / ${gpusSorted.length}款显卡 | <a href="https://www.5vip.top">查看完整交互版 →</a></p>

<p class="intro"><strong>奇魂硬件榜</strong>实时追踪<strong>${year}年最新CPU显卡性价比排行榜</strong>，收录<strong>${cpusSorted.length}款主流CPU</strong>和<strong>${gpusSorted.length}款显卡</strong>游戏帧数实测数据。按游戏性能/多核性能排序，支持按价格筛选，关注<strong>历史最低价</strong>走势。数据来源淘宝/拼多多全新散片实售价格，每日更新。适合游戏玩家、装机小白和硬件爱好者参考。</p>

<h2>高性价比CPU推荐</h2>
<table>
<thead>
<tr><th>#</th><th>型号</th><th>性价比</th><th>游戏%</th><th>多核%</th><th>游戏帧数</th><th>多核分</th><th>核心</th><th>线程</th><th>基础频率</th><th>加速频率</th><th>TDP</th><th>全新价</th><th>二手价</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>

<h2>高性价比显卡推荐</h2>
<table>
<thead>
<tr><th>#</th><th>型号</th><th>性价比</th><th>1080p帧数</th><th>2K帧数</th><th>4K帧数</th><th>渲染性能</th><th>显存</th><th>TDP</th><th>全新价</th><th>二手价</th></tr>
</thead>
<tbody>
${gpuRows}
</tbody>
</table>

<footer>
<p>📌 数据来源：<a href="https://www.5vip.top">奇魂硬件评测</a> | B站：<a href="https://space.bilibili.com/3546785037420940">奇魂硬件</a></p>
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
