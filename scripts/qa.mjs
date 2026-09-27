// Автопроверка собранного сайта через установленный Chrome (puppeteer-core).
// Запуск: npm run preview (в другом окне), затем npm run qa -- [baseUrl] [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:4174/ai-na-zakaz-intensiv/';
const OUT = resolve(process.argv[3] ?? 'qa-report');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE_MS = 1800;
const MIN_TAP = 44;
const MIN_FONT = 14;

const VIEWPORTS = [
  { name: '320x640', width: 320, height: 640, mobile: true },
  { name: '360x640', width: 360, height: 640, mobile: true },
  { name: '375x812', width: 375, height: 812, mobile: true },
  { name: '768x1024', width: 768, height: 1024, mobile: true },
  { name: '1024x768', width: 1024, height: 768, mobile: false },
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '1920x1080', width: 1920, height: 1080, mobile: false },
];
const SHOT_VIEWPORTS = new Set(['375x812', '1440x900']);

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openPage(browser, url, vp) {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || /Content Security Policy/i.test(msg.text())) problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ''}`));
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(SETTLE_MS);
  return { page, problems };
}

async function measure(page) {
  return page.evaluate(
    ({ MIN_TAP, MIN_FONT }) => {
      const overflowX = document.documentElement.scrollWidth - window.innerWidth;
      const hero = document.querySelector('.cta--hero')?.getBoundingClientRect();
      const isDecor = (el) => el.closest('[aria-hidden="true"], .phone, .viz, .sticky-cta, .skip-link');

      const smallText = [];
      for (const el of document.querySelectorAll('body *')) {
        if (isDecor(el)) continue;
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const size = parseFloat(cs.fontSize);
        if (size < MIN_FONT) smallText.push(`${el.tagName.toLowerCase()}.${el.className} ${size}px «${el.textContent.trim().slice(0, 30)}»`);
      }

      const smallTaps = [];
      for (const el of document.querySelectorAll('a, button, summary')) {
        if (isDecor(el)) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.height < MIN_TAP || r.width < MIN_TAP) smallTaps.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 30)}» ${Math.round(r.width)}x${Math.round(r.height)}`);
      }

      const badCtas = [...document.querySelectorAll('[data-cta]')]
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => !(href.startsWith('https://t.me/') || (href.startsWith('#') && href.length > 1 && document.querySelector(href))));

      return {
        variant: document.documentElement.dataset.variant,
        badCtas,
        overflowX,
        heroCta: hero ? { top: Math.round(hero.top), bottom: Math.round(hero.bottom) } : null,
        heroCtaInFold: hero ? hero.bottom <= window.innerHeight : false,
        smallText: [...new Set(smallText)].slice(0, 12),
        smallTaps: [...new Set(smallTaps)].slice(0, 12),
        ab: window.__AB ?? null,
      };
    },
    { MIN_TAP, MIN_FONT },
  );
}

async function stickyCheck(page) {
  const before = await page.evaluate(() => document.querySelector('.sticky-cta')?.classList.contains('is-visible') ?? null);
  // Мгновенная прокрутка: плавная (scroll-behavior: smooth) не успевает за замером.
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.getElementById('hosts')?.scrollIntoView();
  });
  await sleep(900);
  const middle = await page.evaluate(() => document.querySelector('.sticky-cta')?.classList.contains('is-visible') ?? null);
  return { atTop: before, atHosts: middle };
}

// Прокрутить страницу сверху вниз, чтобы сработали анимации появления, и вернуться наверх.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await sleep(1200);
}

const report = { base: BASE, generatedAt: new Date().toISOString(), pages: [], split: null, utm: null };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });

try {
  for (const variant of ['a', 'b', 'c']) {
    for (const vp of VIEWPORTS) {
      const { page, problems } = await openPage(browser, `${BASE}${variant}/`, vp);
      const m = await measure(page);
      const sticky = vp.mobile && vp.width < 1024 ? await stickyCheck(page) : null;
      if (SHOT_VIEWPORTS.has(vp.name)) {
        await scrollThrough(page);
        await page.screenshot({ path: `${OUT}/${variant}_${vp.name}.png` });
        await page.screenshot({ path: `${OUT}/${variant}_${vp.name}_full.png`, fullPage: true });
      }
      report.pages.push({ page: `${variant}/`, viewport: vp.name, ...m, sticky, problems });
      await page.close();
    }
  }

  // Случайное распределение на общем адресе: новый «браузер» на каждый заход.
  const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 30; i += 1) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const v = await page.evaluate(() => document.documentElement.dataset.variant);
    counts[v] = (counts[v] ?? 0) + 1;
    await ctx.close();
  }
  const forced = await (async () => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}?v=b`, { waitUntil: 'domcontentloaded' });
    const first = await page.evaluate(() => document.documentElement.dataset.variant);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const sticky = await page.evaluate(() => document.documentElement.dataset.variant);
    await ctx.close();
    return { forcedB: first, sameBrowserLater: sticky };
  })();
  report.split = { counts, ...forced };

  // Без JavaScript: контент виден, кнопки ведут в бот или к существующему якорю.
  report.noJs = [];
  for (const path of ['', 'a/', 'b/', 'c/']) {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
    report.noJs.push(
      await page.evaluate((p) => {
        const hidden = [...document.querySelectorAll('[data-reveal]')].filter((el) => {
          const cs = getComputedStyle(el);
          return cs.visibility === 'hidden' || Number(cs.opacity) === 0;
        }).length;
        const hrefs = [...new Set([...document.querySelectorAll('[data-cta]')].map((a) => a.getAttribute('href')))];
        const broken = hrefs.filter((h) => !(h.startsWith('https://t.me/') || (h.startsWith('#') && document.querySelector(h))));
        return { page: p || '/', hidden, hrefs, broken };
      }, path),
    );
    await page.close();
  }

  // Метки рекламы и подмена заголовка под хук.
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}a/?utm_source=instagram&utm_campaign=sep_test&utm_content=hook_math_v2`, { waitUntil: 'networkidle0' });
  report.utm = await page.evaluate(() => ({
    ab: window.__AB,
    hook: document.getElementById('hero-title')?.dataset.hook ?? null,
    h1: document.getElementById('hero-title')?.textContent.replace(/\s+/g, ' ').trim(),
    ctaHref: document.querySelector('.cta--hero')?.getAttribute('href'),
  }));
  await page.goto(`${BASE}b/`, { waitUntil: 'networkidle0' });
  report.utm.afterReturnWithoutUtm = await page.evaluate(() => window.__AB?.payload);
  await ctx.close();
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

let failures = 0;
for (const p of report.pages) {
  const flags = [];
  if (p.overflowX > 0) flags.push(`горизонтальная прокрутка ${p.overflowX}px`);
  if (['320x640', '360x640', '375x812'].includes(p.viewport) && !p.heroCtaInFold) flags.push(`кнопка ниже первого экрана (${p.heroCta?.bottom}px)`);
  if (p.smallText.length) flags.push(`мелкий текст: ${p.smallText.join('; ')}`);
  if (p.smallTaps.length) flags.push(`маленькие зоны нажатия: ${p.smallTaps.join('; ')}`);
  if (p.badCtas?.length) flags.push(`кнопки ведут в никуда: ${p.badCtas.join(', ')}`);
  if (p.problems.length) flags.push(`консоль: ${p.problems.join(' | ')}`);
  if (p.sticky && (p.sticky.atTop !== false || p.sticky.atHosts !== true)) flags.push(`липкая кнопка: ${JSON.stringify(p.sticky)}`);
  if (flags.length) failures += 1;
  console.log(`${flags.length ? '✖' : '✔'} ${p.page} ${p.viewport} cta=${JSON.stringify(p.heroCta)}${flags.length ? `\n   ${flags.join('\n   ')}` : ''}`);
}
for (const n of report.noJs ?? []) {
  const bad = n.hidden > 0 || n.broken.length > 0;
  if (bad) failures += 1;
  console.log(`${bad ? '✖' : '✔'} без JS ${n.page}: скрытых блоков ${n.hidden}, ссылки кнопок ${n.hrefs.join(', ')}${n.broken.length ? ` — битые: ${n.broken.join(', ')}` : ''}`);
}
console.log('split:', JSON.stringify(report.split));
console.log('utm:', JSON.stringify(report.utm));
console.log(failures ? `\nПроблем на ${failures} страницах из ${report.pages.length}` : `\nВсе ${report.pages.length} проверок чистые`);
process.exitCode = failures ? 1 : 0;
