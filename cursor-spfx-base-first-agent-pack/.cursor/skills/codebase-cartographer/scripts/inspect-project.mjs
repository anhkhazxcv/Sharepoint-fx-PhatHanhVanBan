#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function exists(p) {
  return fs.existsSync(path.join(process.cwd(), p));
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));
  } catch (_) {
    return undefined;
  }
}

function list(dir, depth = 1, prefix = '') {
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const entries = fs.readdirSync(abs, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'lib' && e.name !== 'dist')
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const rel = path.join(dir, e.name);
    out.push(prefix + rel + (e.isDirectory() ? '/' : ''));
    if (e.isDirectory() && depth > 0) out.push(...list(rel, depth - 1, prefix + '  '));
  }
  return out;
}

const pkg = readJson('package.json') || {};
const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
const spfx = Object.keys(deps).filter(k => k.startsWith('@microsoft/sp-'))
  .reduce((acc, k) => { acc[k] = deps[k]; return acc; }, {});

const scripts = pkg.scripts || {};
const likelyToolchain = exists('heft.json') || exists('config/rig.json') || scripts.build === 'heft build'
  ? 'heft-based or custom heft-like'
  : Object.values(scripts).some(v => String(v).includes('gulp'))
    ? 'gulp-based or custom gulp-like'
    : 'unknown - inspect package scripts';

console.log(JSON.stringify({
  name: pkg.name || null,
  version: pkg.version || null,
  scripts,
  spfxDependencies: spfx,
  react: deps.react || null,
  typescript: deps.typescript || null,
  likelyToolchain,
  keyFiles: {
    packageJson: exists('package.json'),
    tsconfig: exists('tsconfig.json'),
    eslint: exists('.eslintrc.js') || exists('.eslintrc.json') || exists('eslint.config.js'),
    prettier: exists('.prettierrc') || exists('prettier.config.js'),
    config: exists('config'),
    src: exists('src')
  },
  sourceTree: list('src', 2).slice(0, 160)
}, null, 2));
