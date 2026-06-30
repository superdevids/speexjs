const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'cli.test.ts');
let c = fs.readFileSync(filePath, 'utf8');
c = c.replace(/endsWith\('src\/index\.ts`/g, "endsWith('src/index.ts'");
c = c.replace(/endsWith\('src\/app\.ts`/g, "endsWith('src/server/index.ts'");
c = c.replace(/endsWith\('src\/config\/index\.ts`/g, "endsWith('src/config/index.ts'");
fs.writeFileSync(filePath, c);
console.log('Fixed');
