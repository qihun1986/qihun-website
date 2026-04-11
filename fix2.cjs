const fs = require('fs');
const path = 'C:/Users/Administrator/Desktop/qihun-web/vue-project/src/components/BaseHeader.vue';
let content = fs.readFileSync(path, 'utf8');
const before = content;

// The literal ? in the file is ASCII 0x3F, regex \? matches literal ?
content = content.replace(/<\?\/router-link>/g, '</router-link>');
content = content.replace(/<\?\/span>/g, '</span>');
content = content.replace(/<\?\/button>/g, '</button>');
content = content.replace(/<\?\/a>/g, '</a>');
content = content.replace(/(alt="[^"]+)\?( class=")/g, '$1"$2');
content = content.replace(/([\u4e00-\u9fff])\?( <)/g, '$1$2');
content = content.replace(/([\u4e00-\u9fff])\?( )/g, '$1$2');

fs.writeFileSync(path, content);
console.log(before === content ? 'No change' : 'Fixed!');
// Show affected lines
content.split('\n').forEach((l, i) => { if (l.includes('?/') || l.includes('?" ')) console.log(`${i+1}: ${l}`); });
