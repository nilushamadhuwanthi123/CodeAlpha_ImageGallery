/**
 * MIREVA — first-run onboarding + personalisation
 * Three editorial screens, then an optional interest picker. Shown once and
 * remembered in localStorage; can be replayed from Settings.
 */

import { icon } from './icons.js';
import { el, assetUrl } from './utils.js';
import { StorageService, KEYS } from './storage.js';
import { AppState, CATEGORIES } from './state.js';
import { SEED_LIBRARY } from './library.js';
import { trapFocus, lockScroll, unlockScroll } from './accessibility.js';
import { Toast } from './notifications.js';

const INTERESTS = ['Photography', 'Nature', 'Architecture', 'Travel', 'Art', 'People', 'Technology', 'Fashion', 'Abstract'];

const SLIDES = [
  {
    kind: 'intro',
    title: 'Your personal visual space.',
    body: 'Discover, organise and experience your favourite images in one beautiful workspace.',
    cta: 'Continue',
  },
  {
    kind: 'features',
    title: 'Curate Your Visual World',
    body: 'Everything you need to shape a collection that feels like yours.',
    cta: 'Continue',
    features: [
      ['layers', 'Categories', 'Eight curated categories, filtered instantly'],
      ['heart', 'Favourites', 'One tap to keep what you love'],
      ['bookmark', 'Collections', 'Group images into your own sets'],
      ['search', 'Search', 'Title, category, tags and description'],
      ['palette', 'Image effects', 'Presets and fine-grained adjustments'],
    ],
  },
  {
    kind: 'features',
    title: 'Make Every Image Yours',
    body: 'Bring your own photographs in and shape them however you like.',
    cta: 'Start Exploring',
    features: [
      ['upload', 'Local upload', 'Drag & drop straight into your gallery'],
      ['heart', 'Favourites', 'Saved on this device, always available'],
      ['expand', 'Lightbox', 'Cinematic full-screen viewing with zoom'],
      ['pencil', 'Image editing', 'Rotate, flip, adjust and apply'],
      ['masonry', 'Responsive gallery', 'Masonry, grid and focus layouts'],
    ],
  },
];

class Onboarding {
  #root = null;
  #release = null;
  #step = 0;
  #dots = null;
  #cta = null;
  #interests = [];

  get completed() { return StorageService.get(KEYS.onboarding, false) === true; }

  /** Show onboarding when it has never been completed. */
  maybeShow() {
    if (this.completed) return false;
    this.show();
    return true;
  }

  show({ replay = false } = {}) {
    if (replay) StorageService.set(KEYS.onboarding, false);
    this.#step = 0;
    this.#render();
  }

  #picks() {
    // three varied library covers for the visual column
    const wanted = ['Abstract', 'Architecture', 'Nature'];
    return wanted.map((cat) => SEED_LIBRARY.find((i) => i.category === cat && i.orientation === 'portrait')
      || SEED_LIBRARY.find((i) => i.category === cat));
  }

  #render() {
    this.#root?.remove();

    const root = el('div', {
      class: 'onboarding', role: 'dialog', 'aria-modal': 'true',
      'aria-label': 'Welcome to MIREVA',
    });
    const inner = el('div', { class: 'onboarding__inner' });

    SLIDES.forEach((slide, i) => inner.append(this.#slide(slide, i)));
    inner.append(this.#tasteSlide());

    const dots = el('div', { class: 'ob-dots', 'aria-hidden': 'true' });
    for (let i = 0; i < SLIDES.length + 1; i += 1) dots.append(el('span', { class: 'ob-dot' }));

    const skip = el('button', {
      class: 'btn btn--ghost btn--sm', type: 'button', text: 'Skip',
      onClick: () => this.#finish({ skipped: true }),
    });
    const nextBtn = el('button', {
      class: 'btn btn--primary', type: 'button',
      html: `<span data-ob="cta">Continue</span>${icon('arrowRight', { size: 17 })}`,
      onClick: () => this.#advance(),
    });

    inner.append(el('div', { class: 'ob-foot' }, [
      el('div', { class: 'row' }, [dots]),
      el('div', { class: 'row' }, [skip, nextBtn]),
    ]));

    root.append(inner);
    document.body.append(root);
    this.#root = root;
    this.#dots = dots;
    this.#cta = nextBtn.querySelector('[data-ob="cta"]');

    lockScroll();
    this.#release = trapFocus(root, { initial: nextBtn });
    this.#sync();
  }

  #slide(slide, index) {
    const copy = el('div', { class: 'ob-slide__copy' });
    if (slide.kind === 'intro') {
      copy.append(
        el('span', { class: 'eyebrow', text: 'Welcome to' }),
        el('h1', { class: 'ob-wordmark', html: '<span>MIREVA</span>' }),
        el('h2', { style: 'font-size:clamp(1.3rem,3vw,2rem)', text: slide.title }),
        el('p', { text: slide.body }),
        el('p', { class: 'muted', style: 'font-size:var(--fs-2xs);letter-spacing:.16em;text-transform:uppercase', text: 'Discover · Curate · Experience' }),
      );
    } else {
      copy.append(
        el('span', { class: 'eyebrow', text: `Step ${index + 1} of ${SLIDES.length}` }),
        el('h2', { text: slide.title }),
        el('p', { text: slide.body }),
      );
      const list = el('div', { class: 'ob-features' });
      slide.features.forEach(([ic, name, desc]) => {
        list.append(el('div', { class: 'ob-feature' }, [
          el('span', { class: 'ob-feature__icon', html: icon(ic, { size: 17 }) }),
          el('div', {}, [el('strong', { text: name }), el('span', { text: desc })]),
        ]));
      });
      copy.append(list);
    }

    const visual = el('div', { class: 'ob-visual' });
    this.#picks().forEach((img) => {
      if (!img) return;
      visual.append(el('img', { src: assetUrl(img.thumb), alt: '', loading: 'lazy', decoding: 'async' }));
    });

    return el('section', {
      class: `ob-slide${index === 0 ? ' is-active' : ''}`,
      dataset: { obSlide: String(index) },
    }, [copy, visual]);
  }

  #tasteSlide() {
    const copy = el('div', { class: 'ob-slide__copy' });
    copy.append(
      el('span', { class: 'eyebrow', text: 'Optional' }),
      el('h2', { text: 'What do you love to explore?' }),
      el('p', { text: 'Pick as many as you like — MIREVA will surface those categories first on your dashboard. You can change this any time in Settings.' }),
    );

    const grid = el('div', { class: 'taste-grid' });
    const selected = new Set(AppState.preferences.interests || []);
    INTERESTS.forEach((name) => {
      const btn = el('button', {
        class: 'taste-chip', type: 'button',
        'aria-pressed': String(selected.has(name)),
      }, [el('span', { class: 'taste-chip__dot' }), el('span', { text: name })]);
      btn.addEventListener('click', () => {
        selected.has(name) ? selected.delete(name) : selected.add(name);
        btn.setAttribute('aria-pressed', String(selected.has(name)));
        this.#interests = [...selected];
      });
      grid.append(btn);
    });
    this.#interests = [...selected];
    copy.append(grid);

    return el('section', { class: 'ob-slide', dataset: { obSlide: String(SLIDES.length) } }, [copy]);
  }

  #advance() {
    if (this.#step < SLIDES.length) { this.#step += 1; this.#sync(); }
    else this.#finish({ skipped: false });
  }

  #sync() {
    this.#root.querySelectorAll('[data-ob-slide]').forEach((s) => {
      s.classList.toggle('is-active', Number(s.dataset.obSlide) === this.#step);
    });
    Array.from(this.#dots.children).forEach((d, i) => d.classList.toggle('is-active', i === this.#step));
    const last = this.#step === SLIDES.length;
    this.#cta.textContent = last ? 'Enter MIREVA' : (SLIDES[this.#step]?.cta || 'Continue');
    this.#root.querySelector('.onboarding__inner')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  #finish({ skipped }) {
    StorageService.set(KEYS.onboarding, true);
    if (!skipped && this.#interests?.length) {
      AppState.preferences = { interests: this.#interests };
      Toast.success(`Saved ${this.#interests.length} interest${this.#interests.length > 1 ? 's' : ''}`);
    }
    this.#release?.();
    this.#release = null;
    unlockScroll();
    this.#root?.remove();
    this.#root = null;
    document.dispatchEvent(new CustomEvent('mireva:onboarding-complete'));
  }
}

export const OnboardingFlow = new Onboarding();
export { INTERESTS };
