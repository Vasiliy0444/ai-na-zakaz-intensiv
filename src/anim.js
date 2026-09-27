// Анимации на GSAP. Модуль грузится лениво, после первой отрисовки: первый экран виден сразу,
// а блоки ниже появляются при прокрутке. Без JS или при «уменьшить движение» всё просто видно.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_OFFSET_Y = 28;
const FALLBACK_VIEWPORT_SHARE = 0.95;

function showAll(items) {
  gsap.set(items, { autoAlpha: 1, y: 0 });
}

// Страховка: если ScrollTrigger по какой-то причине не сработал (встроенные браузеры бывают капризны),
// блок всё равно проявится, когда окажется на экране.
function revealFallback(items) {
  const pending = new Set(items);
  let frame = 0;
  const check = () => {
    frame = 0;
    const edge = window.innerHeight * FALLBACK_VIEWPORT_SHARE;
    pending.forEach((el) => {
      if (el.getBoundingClientRect().top < edge) {
        if (Number(gsap.getProperty(el, 'autoAlpha')) < 1) gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' });
        pending.delete(el);
      }
    });
    if (!pending.size) window.removeEventListener('scroll', onScroll);
  };
  const onScroll = () => {
    if (!frame) frame = window.requestAnimationFrame(check);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

function revealBelowFold() {
  const fold = window.innerHeight * 0.92;
  const items = gsap.utils
    .toArray('[data-reveal]')
    .filter((el) => el.getBoundingClientRect().top > fold);
  if (!items.length) return;

  try {
    gsap.set(items, { autoAlpha: 0, y: REVEAL_OFFSET_Y });
    ScrollTrigger.batch(items, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: 'expo.out',
          stagger: 0.08,
          overwrite: true,
        }),
    });
    revealFallback(items);
  } catch (error) {
    showAll(items);
    throw error;
  }
}

function popMoneyPill() {
  const money = document.querySelector('.h1-money');
  if (!money) return;
  gsap.from(money, { scale: 0.86, duration: 0.9, ease: 'back.out(2.2)', clearProps: 'scale' });
}

function parallaxLessonVisuals() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    gsap.utils.toArray('.viz').forEach((el) => {
      gsap.fromTo(
        el,
        { y: 14 },
        {
          y: -14,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  });
}

export function initAnimations() {
  revealBelowFold();
  popMoneyPill();
  parallaxLessonVisuals();
  if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
