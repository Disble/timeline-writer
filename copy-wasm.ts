import fs from 'fs-extra';
import path from 'path';

const wasmFileName = 'sql-wasm.wasm';
const projectRoot = process.cwd();
const srcPath = path.resolve(
  projectRoot,
  'node_modules/sql.js/dist',
  wasmFileName
);
const distPath = path.resolve(projectRoot, 'dist', wasmFileName);

try {
  if (fs.existsSync(srcPath)) {
    fs.copySync(srcPath, distPath, { overwrite: true });
    console.log(`✅ Copied ${wasmFileName} to dist/`);
  } else {
    console.error(`❌ ${wasmFileName} not found at ${srcPath}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Error copying ${wasmFileName}:`, error);
  process.exit(1);
} 
