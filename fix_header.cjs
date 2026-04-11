const fs = require('fs');

const path = "C:/Users/Administrator/Desktop/qihun-web/vue-project/src/components/BaseHeader.vue";

let content = fs.readFileSync(path, 'utf-8');
const before = content;

// CORRECT regex: < followed by literal ? followed by /router-link>
// The ? in the file is a literal ASCII 0x3F character, not a regex wildcard
// In regex, ? needs to be escaped as \?
content = content.replace(/<\?\/router-link>/g, '</router-link>');
content = content.replace(/<\?\/span>/g, '</span>');
content = content.replace(/<\?\/button>/g, '</button>');
content = content.replace(/<\?\/a>/g, '</a>');

// Fix alt="text? class= -> alt="text" class=
content = content.replace(/(alt="[^"]+)\?( class=")/g, '$1"$2');

// Fix remaining ? between Chinese chars followed by space or <
content = content.replace(/([\u4e00-\u9fff])\?( <)/g, '$1$2');
content = content.replace(/([\u4e00-\u9fff])\?( )/g, '$1$2');

if (content !== before) {
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Fixed!');
  const lines = content.split('\n');
  for (let i = 5; i < 25; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
} else {
  console.log('No changes needed');
}
