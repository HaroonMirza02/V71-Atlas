const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const uiDir = path.join(__dirname, 'src/components/ui');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const componentName = file.replace('.tsx', '');
  try {
    const result = execSync(`git grep -l "@/components/ui/${componentName}"`, { encoding: 'utf8', cwd: __dirname });
    const usageCount = result.split('\n').filter(Boolean).length;
    // Keep it if it's used
  } catch (err) {
    // git grep returns 1 if no match found
    console.log('Deleting unused component:', file);
    fs.unlinkSync(path.join(uiDir, file));
  }
}
