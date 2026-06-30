const fs = require('fs');
const path = require('path');
const sass = require('sass');

const rootDir = path.join(__dirname, '..');
const stylesDir = path.join(rootDir, 'styles');
const cssDir = path.join(rootDir, 'css');

if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
}

const scssFiles = fs.readdirSync(stylesDir)
  .filter((file) => file.endsWith('.scss') && !file.startsWith('_'));

scssFiles.forEach((file) => {
  const scssPath = path.join(stylesDir, file);
  const cssPath = path.join(cssDir, file.replace(/\.scss$/, '.css'));

  try {
    const result = sass.compile(scssPath, {
      loadPaths: [stylesDir],
    });
    fs.writeFileSync(cssPath, result.css);
    console.log(`Compiled ${file} -> css/${path.basename(cssPath)}`);
  } catch (err) {
    console.error(`Failed to compile ${file}:`, err.message);
    process.exitCode = 1;
  }
});
