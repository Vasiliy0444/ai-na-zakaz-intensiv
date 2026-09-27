// Все настройки лендинга в одном месте. Меняются здесь — страницы пересобираются командой `npm run build`.

// Username Telegram-бота без @. Пока пусто: кнопки показывают подсказку «бот ещё не подключён».
export const BOT_USERNAME = '';

// ID пикселя Meta (Facebook). Пока пусто: пиксель не загружается.
export const PIXEL_ID = '';

// Пока в блоке «Кто ведёт» заглушки, страницу не индексируем.
export const INDEXABLE = false;

// Варианты дизайна для A/B-теста. Корневой адрес случайно и «навсегда» для браузера выбирает один из них.
export const VARIANTS = {
  a: { name: 'Лаймовый билборд', themeColor: '#87ea5c' },
  b: { name: 'Ночное бенто', themeColor: '#061206' },
  c: { name: 'Белая мозаика', themeColor: '#f6f7f1' },
};

// Заголовок первого экрана под хук рекламы: ключ ищется внутри utm_content (например, utm_content=hook_math_v2).
// Тексты согласованы Васей 27.09.2026 — research/13-lending-intensiva/LANDING_PROTOTYPE_RU.md, блок 1, «Опция».
export const HOOK_HEADLINES = {
  compare: 'Такси, трейдинг, Uzum или&nbsp;<span class="h1-ai">ИИ</span>: на&nbsp;чём реально заработать <span class="h1-money">$1000</span> в&nbsp;месяц в&nbsp;2026&nbsp;году',
  math: '<span class="h1-money">$1000</span> в&nbsp;месяц на&nbsp;<span class="h1-ai">ИИ</span> — это не&nbsp;пассивный доход, а&nbsp;3–4 заказа от&nbsp;бизнеса',
  now: '<span class="h1-ai">ИИ</span> собирает сайт за&nbsp;вечер, а&nbsp;бизнес платит за&nbsp;него от&nbsp;2,5 до&nbsp;5&nbsp;млн сум',
  zero: 'Можно ли с&nbsp;нуля заработать на&nbsp;<span class="h1-ai">ИИ</span>, если ты студент и&nbsp;не&nbsp;программист?',
};

// Путь сайта на GitHub Pages (имя репозитория). Меняется только здесь.
export const BASE_PATH = '/ai-na-zakaz-intensiv/';

export const SITE = {
  title: 'Как заработать на ИИ в 2026 году и выйти на стабильные $1000 в месяц — «ИИ на заказ»',
  description: 'Делаешь для бизнеса ИИ-услуги: сайты, Telegram-ботов, контент, дизайн, автоматизацию. 3–4 заказа по $300 в месяц — это и есть $1000. Бесплатный интенсив в Telegram, 3 урока.',
  ogTitle: 'Как заработать на ИИ в 2026 году и выйти на стабильные $1000 в месяц',
  url: `https://vasiliy0444.github.io${BASE_PATH}`,
};
