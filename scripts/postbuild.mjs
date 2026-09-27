// После `vite build`: считает sha256 встроенных скриптов и вставляет CSP мета-тегом в каждую страницу docs/.
// GitHub Pages не даёт задать заголовки ответа, поэтому политика — в <meta http-equiv>.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = resolve(root, 'docs');

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'assets' ? [] : htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

function inlineScriptHashes(html) {
  const hashes = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = re.exec(html))) {
    const body = match[1];
    if (!body.trim()) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

function csp(hashes) {
  return [
    "default-src 'self'",
    ["script-src 'self'", ...hashes, 'https://connect.facebook.net'].join(' '),
    "style-src 'self'",
    "img-src 'self' data: https://www.facebook.com",
    "font-src 'self'",
    "connect-src 'self' https://www.facebook.com https://connect.facebook.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

// Предзагрузка шрифтов первого экрана: кириллица Inter и шрифт заголовка своего варианта.
const BASE = '/ai-na-zakaz-intensiv/';
const assets = readdirSync(resolve(docs, 'assets'));
const findFont = (prefix) => assets.find((name) => name.startsWith(prefix) && name.endsWith('.woff2'));
const COMMON_FONTS = ['inter-cyrillic-400-normal-', 'inter-cyrillic-600-normal-'];
const DISPLAY_FONT = {
  a: 'inter-tight-cyrillic-900-normal-',
  b: 'onest-cyrillic-900-normal-',
  c: 'fira-sans-extra-condensed-cyrillic-900-normal-',
};

function preloadTags(html) {
  const variant = html.match(/<html[^>]*data-variant="([a-z]+)"/)?.[1];
  const prefixes = [...COMMON_FONTS, ...(DISPLAY_FONT[variant] ? [DISPLAY_FONT[variant]] : [])];
  return prefixes
    .map(findFont)
    .filter(Boolean)
    .map((name) => `<link rel="preload" as="font" type="font/woff2" href="${BASE}assets/${name}" crossorigin>`);
}

for (const file of htmlFiles(docs)) {
  const html = readFileSync(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp(inlineScriptHashes(html))}">`;
  const head = [meta, ...(file.includes('/privacy/') ? [] : preloadTags(html))].join('\n    ');
  const withCsp = html.replace(/<meta charset="utf-8">/i, (m) => `${m}\n    ${head}`);
  if (withCsp === html) throw new Error(`Не нашёл <meta charset> в ${file}`);
  writeFileSync(file, withCsp);
  console.log(`csp + preload: ${file.replace(`${root}/`, '')}`);
}

writeFileSync(resolve(docs, '.nojekyll'), '');
console.log('docs/.nojekyll');
