#!/usr/bin/env node

/**
 * Build script for FlashDict Extension
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

  // Note: bg/js/ files are now generated from TypeScript (src/bg/ts/ui/)

  // Sandbox files
  { from: 'bg/sandbox', to: 'bg/sandbox' },

  // Builtin dictionary data (Collins, wordforms)
  { from: 'bg/data', to: 'bg/data' },

  // Frontend CSS files
  { from: 'fg/css', to: 'fg/css' },
  { from: 'fg/font', to: 'fg/font' },
  { from: 'fg/img', to: 'fg/img' },

  // Note: fg/js/ files are now generated from TypeScript (src/fg/ts/)
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
 * Bundle UI scripts with esbuild
 * These are the TypeScript files for popup, options, and background pages
 */
function bundleUIScripts() {
  console.log('📦 Bundling UI scripts...');
  try {
    const esbuild = require('esbuild');

    // UI entry points
    const uiEntryPoints = [
      { entry: 'bg/ts/ui/popup.ts', out: 'bg/js/popup.js' },
      { entry: 'bg/ts/ui/options.ts', out: 'bg/js/options.js' },
      { entry: 'bg/ts/ui/tabmenu.ts', out: 'bg/js/tabmenu.js' },
      { entry: 'bg/ts/ui/utils.ts', out: 'bg/js/utils.js' },
      { entry: 'bg/ts/ui/agent.ts', out: 'bg/js/agent.js' },
      { entry: 'bg/ts/ui/background.ts', out: 'bg/js/background.js' },
    ];

    for (const { entry, out } of uiEntryPoints) {
      const entryPath = path.join(SRC_DIR, entry);
      if (!fs.existsSync(entryPath)) {
        console.warn(`  ⚠️  Skipping ${entry} (not found)`);
        continue;
      }

      esbuild.buildSync({
        entryPoints: [entryPath],
        bundle: true,
        outfile: path.join(DIST_DIR, out),
        format: 'iife', // Immediately Invoked Function Expression for browser scripts
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        minify: false,
      });
      console.log(`  ✓ ${entry} → ${out}`);
    }

    console.log('✅ UI scripts bundled\n');
  } catch (error) {
    console.error('❌ UI scripts bundling failed:', error.message);
    process.exit(1);
  }
}

/**
 * Bundle frontend (content script) files with esbuild
 * These are the TypeScript files for content scripts
 */
function bundleFrontendScripts() {
  console.log('📦 Bundling frontend scripts...');
  try {
    const esbuild = require('esbuild');

    // Frontend entry points
    const frontendEntryPoints = [
      { entry: 'fg/ts/api.ts', out: 'fg/js/api.js' },
      { entry: 'fg/ts/range.ts', out: 'fg/js/range.js' },
      { entry: 'fg/ts/spell.ts', out: 'fg/js/spell.js' },
      { entry: 'fg/ts/frame.ts', out: 'fg/js/frame.js' },
      { entry: 'fg/ts/popup.ts', out: 'fg/js/popup.js' },
      { entry: 'fg/ts/frontend.ts', out: 'fg/js/frontend.js' },
    ];

    for (const { entry, out } of frontendEntryPoints) {
      const entryPath = path.join(SRC_DIR, entry);
      if (!fs.existsSync(entryPath)) {
        console.warn(`  ⚠️  Skipping ${entry} (not found)`);
        continue;
      }

      esbuild.buildSync({
        entryPoints: [entryPath],
        bundle: true,
        outfile: path.join(DIST_DIR, out),
        format: 'iife', // IIFE for content scripts
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        minify: false,
      });
      console.log(`  ✓ ${entry} → ${out}`);
    }

    console.log('✅ Frontend scripts bundled\n');
  } catch (error) {
    console.error('❌ Frontend scripts bundling failed:', error.message);
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
    copyStaticFiles();        // Copy static files first
    bundleServiceWorker();    // Then bundle service worker (overwrites any copied TS output)
    bundleUIScripts();        // Then bundle UI scripts (overwrites legacy JS)
    bundleFrontendScripts();  // Then bundle frontend scripts (overwrites legacy JS)

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
