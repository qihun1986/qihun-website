const fs = require('fs');

const path = "C:/Users/Administrator/Desktop/qihun-web/vue-project/src/components/BaseHeader.vue";

let content = fs.readFileSync(path, 'utf-8');

const before = content;

// Fix corrupted closing tags
content = content.replace(/<\?\/router-link>/g, '</router-link>');
content = content.replace(/<\?\/span>/g, '</span>');
content = content.replace(/<\?\/button>/g, '</button>');
content = content.replace(/<\?\/a>/g, '</a>');

// Fix alt="text? class= -> alt="text" class=
// Pattern: alt=" followed by non-quote chars, then ? class=
content = content.replace(/(alt="[^"]+)\?( class=")/g, '$1"$2');

// Fix remaining standalone ? between Chinese chars followed by space or <
content = content.replace(/([\u4e00-\u9fff])\?( <)/g, '$1$2');
content = content.replace(/([\u4e00-\u9fff])\?( )/g, '$1$2');

if (content !== before) {
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Fixed!');
  
  const lines = content.split('\n');
  console.log('\nLines 6-22:');
  for (let i = 5; i < 22; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
} else {
  console.log('No changes needed');
}
