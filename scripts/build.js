#!/usr/bin/env node

/**
 * Build script for ODH Extension
 *
 * This script:
 * 1. Cleans the dist directory
 * 2. Compiles TypeScript files
 * 3. Copies static files (HTML, CSS, images, manifest, locales, etc.)
 * 4. Preserves directory structure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Files/directories to copy from src/ to dist/
const COPY_PATTERNS = [
  // Static assets
  { from: 'manifest.json', to: 'manifest.json' },
  { from: '_locales', to: '_locales' },
  { from: 'img', to: 'img' },
  { from: 'data', to: 'data' },
  { from: 'dict', to: 'dict' },
  { from: 'lib', to: 'lib' },

  // Background HTML files
  { from: 'bg/background.html', to: 'bg/background.html' },
  { from: 'bg/popup.html', to: 'bg/popup.html' },
  { from: 'bg/options.html', to: 'bg/options.html' },
  { from: 'bg/legal.html', to: 'bg/legal.html' },
  { from: 'bg/update.html', to: 'bg/update.html' },
  { from: 'bg/guide.html', to: 'bg/guide.html' },

  // Background CSS files
  { from: 'bg/css', to: 'bg/css' },

  // Background JS files (remaining legacy for UI and offscreen document)
  { from: 'bg/js', to: 'bg/js' },

  // Sandbox files
  { from: 'bg/sandbox', to: 'bg/sandbox' },

  // Builtin dictionary data (Collins, wordforms)
  { from: 'bg/data', to: 'bg/data' },

  // Frontend CSS files
  { from: 'fg/css', to: 'fg/css' },
  { from: 'fg/font', to: 'fg/font' },
  { from: 'fg/img', to: 'fg/img' },

  // Frontend JS files (legacy, will be replaced by TS gradually)
  { from: 'fg/js', to: 'fg/js' },
];

/**
 * Recursively creates directory structure
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Recursively copies files/directories
 */
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    ensureDir(dest);
    const entries = fs.readdirSync(src);

    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursive(srcPath, destPath);
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

/**
 * Cleans the dist directory
 */
function clean() {
  console.log('🧹 Cleaning dist directory...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  ensureDir(DIST_DIR);
  console.log('✅ Dist directory cleaned\n');
}

/**
 * Compiles TypeScript files
 */
function compileTypeScript() {
  console.log('🔨 Compiling TypeScript...');
  try {
    execSync('npm run build:tsc', { stdio: 'inherit', cwd: ROOT_DIR });
    console.log('✅ TypeScript compilation complete\n');
  } catch (error) {
    console.error('❌ TypeScript compilation failed');
    process.exit(1);
  }
}

/**
 * Bundle service worker with esbuild
 * Chrome extension ES modules require .js extensions in imports,
 * so we bundle everything into a single file
 */
function bundleServiceWorker() {
  console.log('📦 Bundling service worker...');
  try {
    const esbuild = require('esbuild');

    esbuild.buildSync({
      entryPoints: [path.join(SRC_DIR, 'bg/ts/service-worker.ts')],
      bundle: true,
      outfile: path.join(DIST_DIR, 'bg/ts/service-worker.js'),
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      minify: false,
      // Don't bundle chrome API - it's provided by the browser
      external: [],
    });

    console.log('✅ Service worker bundled\n');
  } catch (error) {
    console.error('❌ Service worker bundling failed:', error.message);
    process.exit(1);
  }
}

/**
 * Copies static files to dist
 */
function copyStaticFiles() {
  console.log('📦 Copying static files...');

  let copiedCount = 0;

  for (const pattern of COPY_PATTERNS) {
    const srcPath = path.join(SRC_DIR, pattern.from);
    const destPath = path.join(DIST_DIR, pattern.to);

    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️  Source not found: ${pattern.from}`);
      continue;
    }

    try {
      copyRecursive(srcPath, destPath);
      console.log(`  ✓ ${pattern.from} → ${pattern.to}`);
      copiedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to copy ${pattern.from}: ${error.message}`);
    }
  }

  console.log(`✅ Copied ${copiedCount} items\n`);
}

/**
 * Displays build summary
 */
function buildSummary() {
  console.log('📊 Build Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Count files in dist
  let fileCount = 0;
  let dirCount = 0;

  function countFiles(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        dirCount++;
        countFiles(fullPath);
      } else {
        fileCount++;
      }
    }
  }

  countFiles(DIST_DIR);

  console.log(`  Total files:       ${fileCount}`);
  console.log(`  Total directories: ${dirCount}`);
  console.log(`  Output directory:  ${DIST_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Build complete!\n');
}

/**
 * Main build function
 */
function build() {
  console.log('🚀 Starting build process...\n');
  const startTime = Date.now();

  try {
    clean();
    compileTypeScript();
    bundleServiceWorker();
    copyStaticFiles();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    buildSummary();
    console.log(`⏱️  Build time: ${duration}s\n`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run build
build();
