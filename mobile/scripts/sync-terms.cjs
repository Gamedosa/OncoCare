const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '../../Docs/TERMOS_DE_USO.md');
const destination = path.join(__dirname, '../src/features/legal/terms.json');
const content = fs.readFileSync(source, 'utf8');
const output = `${JSON.stringify({ content }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8') !== output) {
    throw new Error('Terms preview is out of sync. Run npm run sync:terms.');
  }
} else {
  fs.writeFileSync(destination, output, 'utf8');
}
