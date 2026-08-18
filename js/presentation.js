/**
 * MIREVA — PresentationController
 * A full-screen slideshow with play/pause, manual navigation, speed control
 * and selectable sources. Honours the reduced-motion setting.
 */

import { icon } from './icons.js';
import { el, motionDisabled } from './utils.js';
import { ImageRepository, AppState, CATEGORIES } from './state.js';
import { FavoritesManager } from './favorites.js';
import { CollectionManager } from './collections.js';
import { Toast } from './notifications.js';
import { announce } from './accessibility.js';

export const SPEEDS = [
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
  { value: 8000, label: '8 seconds' },
];

export class PresentationController {
  /**
   * @param {{stage:HTMLElement, sourceSelect:HTMLSelectElement, speedSelect:HTMLSelectElement,
   *          controls:HTMLElement, counter?:HTMLElement, empty?:HTMLElement}} opts
   */
  constructor({ stage, sourceSelect, speedSelect, controls, counter, empty }) {
    this.stage = stage;
    this.sourceSelect = sourceSelect;
    this.speedSelect = speedSelect;
    this.controls = controls;
    this.counter = counter;
    this.empty = empty;

    this.images = [];
    this.index = 0;
    this.playing = false;
    this.speed = Number(speedSelect?.value) || 5000;
    this.timer = null;
    this.rafId = null;

    this.#buildControls();
    this.#bind();
    this.loadSource(sourceSelect?.value || 'all');
  }

  /* ------------------------------ sources ------------------------------ */
  static sourceOptions() {
    const options = [
      { value: 'all', label: 'All images' },
      { value: 'favorites', label: 'Favourites' },
      { value: 'recent', label: 'Recently viewed' },
    ];
    CATEGORIES.filter((c) => c !== 'All').forEach((c) => options.push({ value: `cat:${c}`, label: `Category — ${c}` }));
    CollectionManager.all().forEach((c) => options.push({ value: `col:${c.id}`, label: `Collection — ${c.name}` }));
    return options;
  }

  loadSource(value) {
    const all = ImageRepository.all();
    if (value === 'favorites') this.images = FavoritesManager.list();
    else if (value === 'recent') this.images = ImageRepository.byIds(AppState.recent.map((r) => r.id));
    else if (value.startsWith('cat:')) this.images = all.filter((i) => i.category === value.slice(4));
    else if (value.startsWith('col:')) this.images = CollectionManager.imagesOf(value.slice(4));
    else this.images = all;

    this.index = 0;
    this.pause({ silent: true });
    this.#renderSlides();
    return this.images.length;
  }

  /* ------------------------------ rendering ------------------------------ */
  #renderSlides() {
    this.stage.querySelectorAll('.slide').forEach((n) => n.remove());
    const hasImages = this.images.length > 0;
    this.empty?.classList.toggle('hide', hasImages);
    this.controls.classList.toggle('hide', !hasImages);
    if (!hasImages) { this.#syncCounter(); return; }

    const frag = document.createDocumentFragment();
    this.images.forEach((img, i) => {
      const slide = el('figure', { class: `slide${i === 0 ? ' is-active' : ''}`, dataset: { index: String(i) } });
      slide.append(el('div', { class: 'slide__bg', style: `background-image:url("${img.src}")` }));
      slide.append(el('img', { src: img.src, alt: img.title || 'Untitled Image', loading: i < 2 ? 'eager' : 'lazy', decoding: 'async' }));
      slide.append(el('figcaption', { class: 'slide-caption' }, [
        el('strong', { text: img.title || 'Untitled Image' }),
        el('span', { text: `${img.category}${img.source === 'upload' ? ' · Your upload' : ''}` }),
      ]));
      frag.append(slide);
    });
    this.stage.insertBefore(frag, this.stage.firstChild);
    this.#syncCounter();
  }

  #buildControls() {
    this.controls.innerHTML = '';
    const mk = (name, label, fn) => {
      const b = el('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, html: icon(name) });
      b.addEventListener('click', fn);
      return b;
    };
    this.playBtn = mk('play', 'Play slideshow', () => this.toggle());
    this.controls.append(
      mk('skipBack', 'Previous image', () => this.prev()),
      this.playBtn,
      mk('skipForward', 'Next image', () => this.next()),
    );

    const speed = el('select', { class: 'select', 'aria-label': 'Slide duration' });
    SPEEDS.forEach((s) => speed.append(el('option', { value: String(s.value), text: s.label, selected: s.value === this.speed })));
    speed.addEventListener('change', () => this.setSpeed(Number(speed.value)));
    this.barSpeed = speed;
    this.controls.append(speed);
    this.controls.append(mk('expand', 'Toggle full screen', () => this.toggleFullscreen()));
  }

  /** Change slide duration and keep both speed controls in sync. */
  setSpeed(value) {
    this.speed = value;
    if (this.barSpeed) this.barSpeed.value = String(value);
    if (this.speedSelect) this.speedSelect.value = String(value);
    if (this.playing) { this.pause({ silent: true }); this.play({ silent: true }); }
  }

  #bind() {
    this.speedSelect?.addEventListener('change', () => this.setSpeed(Number(this.speedSelect.value)));
    this.sourceSelect?.addEventListener('change', () => {
      const count = this.loadSource(this.sourceSelect.value);
      if (!count) Toast.info('That selection has no images yet.');
    });

    document.addEventListener('keydown', (e) => {
      if (!document.body.contains(this.stage)) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ') { e.preventDefault(); this.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      else if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen?.();
    });

    let idleTimer;
    const wake = () => {
      this.stage.classList.remove('is-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { if (this.playing) this.stage.classList.add('is-idle'); }, 2600);
    };
    this.stage.addEventListener('pointermove', wake);
    this.stage.addEventListener('pointerdown', wake);
  }

  /* ------------------------------ playback ------------------------------ */
  play({ silent = false } = {}) {
    if (!this.images.length) { Toast.warn('Add some images first.'); return; }
    this.playing = true;
    this.playBtn.innerHTML = icon('pause');
    this.playBtn.setAttribute('aria-label', 'Pause slideshow');
    this.#schedule();
    if (!silent) announce('Slideshow playing');
  }

  pause({ silent = false } = {}) {
    this.playing = false;
    if (this.playBtn) {
      this.playBtn.innerHTML = icon('play');
      this.playBtn.setAttribute('aria-label', 'Play slideshow');
    }
    clearTimeout(this.timer);
    cancelAnimationFrame(this.rafId);
    this.#setProgress(0);
    this.stage.classList.remove('is-idle');
    if (!silent) announce('Slideshow paused');
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  #schedule() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.rafId);
    const duration = motionDisabled() ? Math.max(this.speed, 5000) : this.speed;
    const start = performance.now();
    const tick = (now) => {
      if (!this.playing) return;
      this.#setProgress(Math.min(1, (now - start) / duration));
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
    this.timer = setTimeout(() => { if (this.playing) { this.next({ auto: true }); this.#schedule(); } }, duration);
  }

  #setProgress(ratio) {
    const bar = this.stage.querySelector('.slide-progress__bar');
    if (bar) bar.style.width = `${ratio * 100}%`;
  }

  next({ auto = false } = {}) { this.show((this.index + 1) % this.images.length, { auto }); }
  prev() { this.show((this.index - 1 + this.images.length) % this.images.length); }

  show(index, { auto = false } = {}) {
    if (!this.images.length) return;
    this.index = index;
    this.stage.querySelectorAll('.slide').forEach((s) => {
      s.classList.toggle('is-active', Number(s.dataset.index) === index);
    });
    this.#syncCounter();
    AppState.pushRecent(this.images[index].id);
    if (!auto && this.playing) this.#schedule();
  }

  #syncCounter() {
    if (!this.counter) return;
    this.counter.textContent = this.images.length
      ? `${this.index + 1} / ${this.images.length}`
      : 'No images';
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.stage.requestFullscreen();
    } catch {
      Toast.warn('Full screen is not available in this browser.');
    }
  }
}
