// Генерирует входные HTML для Vite из одного шаблона:
//   index.html      — общий адрес: случайно и «навсегда» для браузера выбирает вариант a/b/c (или ?v=a|b|c)
//   a/, b/, c/      — фиксированные варианты для A/B-теста в рекламе
//   privacy/        — политика конфиденциальности
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOT_USERNAME, HOOK_HEADLINES, INDEXABLE, SITE, VARIANTS } from '../src/config.js';
import { buildBotUrl, buildStartPayload } from '../src/lib/attribution.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(resolve(root, 'src/template.html'), 'utf8');
const privacyTemplate = readFileSync(resolve(root, 'src/privacy.html'), 'utf8');

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Выбор варианта до первой отрисовки, чтобы не было мигания. Только для общего адреса.
const variantKeys = Object.keys(VARIANTS);
const themeColors = Object.fromEntries(variantKeys.map((k) => [k, VARIANTS[k].themeColor]));
const headScript = `<script>(function(){var d=document.documentElement,ok=${JSON.stringify(variantKeys)},c=${JSON.stringify(themeColors)},v=null;try{v=new URLSearchParams(location.search).get('v')}catch(e){}if(ok.indexOf(v)<0){try{v=localStorage.getItem('ab_variant')}catch(e){}}if(ok.indexOf(v)<0){v=ok[Math.floor(Math.random()*ok.length)]}try{localStorage.setItem('ab_variant',v)}catch(e){}d.setAttribute('data-variant',v);var m=document.querySelector('meta[name=theme-color]');if(m){m.setAttribute('content',c[v])}})();</script>`;

// Подмена заголовка под хук рекламы по utm_content — сразу после <h1>, до отрисовки.
const hookScript = `<script>(function(){var h=${JSON.stringify(HOOK_HEADLINES)},k='';try{k=(new URLSearchParams(location.search).get('utm_content')||'').toLowerCase()}catch(e){}for(var key in h){if(k.indexOf(key)>-1){var el=document.getElementById('hero-title');el.innerHTML=h[key];el.setAttribute('data-hook',key);break}}})();</script>`;

// Ссылка кнопок прямо в HTML: страница ведёт в бот, даже если JS не загрузился.
// JS потом добавит в метку UTM. Пока бот не задан — якорь на финальный блок страницы.
function staticCtaHref(variant) {
  const payload = buildStartPayload(variant, { source: '', campaign: '', content: '' });
  return buildBotUrl(BOT_USERNAME, payload) ?? '#start-now';
}

function render(variant, { ogPath }) {
  const isAuto = variant === 'auto';
  const theme = isAuto ? VARIANTS.a.themeColor : VARIANTS[variant].themeColor;
  return template
    .replaceAll('{{VARIANT}}', variant)
    .replaceAll('{{TITLE}}', escapeAttr(SITE.title))
    .replaceAll('{{DESCRIPTION}}', escapeAttr(SITE.description))
    .replaceAll('{{OG_TITLE}}', escapeAttr(SITE.ogTitle))
    .replaceAll('{{ROBOTS}}', INDEXABLE ? 'index, follow' : 'noindex, nofollow')
    .replaceAll('{{THEME_COLOR}}', theme)
    .replaceAll('{{OG_IMAGE}}', `${SITE.url}${ogPath}`)
    .replace('{{HEAD_SCRIPT}}', isAuto ? headScript : '')
    .replace('{{HOOK_SCRIPT}}', hookScript)
    .replaceAll('href="#start"', `href="${escapeAttr(staticCtaHref(variant))}"`)
    // CSP вставляет scripts/postbuild.mjs после сборки, когда известны хеши встроенных скриптов.
    .replace(/\s*<meta http-equiv="Content-Security-Policy" content="\{\{CSP\}\}">/, '');
}

const pages = [
  { out: 'index.html', variant: 'auto' },
  ...variantKeys.map((v) => ({ out: `${v}/index.html`, variant: v })),
];

for (const page of pages) {
  const file = resolve(root, page.out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(page.variant, { ogPath: 'og.png' }));
  console.log(`page: ${page.out} (variant=${page.variant})`);
}

const privacyFile = resolve(root, 'privacy/index.html');
mkdirSync(dirname(privacyFile), { recursive: true });
writeFileSync(
  privacyFile,
  privacyTemplate.replaceAll('{{ROBOTS}}', 'noindex, nofollow'),
);
console.log('page: privacy/index.html');
