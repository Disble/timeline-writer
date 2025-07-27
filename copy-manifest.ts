import fs from 'fs';
import path from 'path';

// Ensure dist directory exists
const distDir = 'dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json to dist
const manifestSrc = 'manifest.json';
const manifestDest = path.join(distDir, 'manifest.json');

if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  // eslint-disable-next-line no-console -- for debugging
  console.log('✅ Copied manifest.json to dist/');
} else {
  // eslint-disable-next-line no-console -- for debugging
  console.error('❌ manifest.json not found');
  process.exit(1);
} 
