/**
 * MIREVA — LightboxController
 * A cinematic, fully keyboard- and touch-navigable image viewer with zoom,
 * pan, metadata, a colour explorer and a filmstrip.
 *
 * Keyboard:  Esc close · ← previous · → next · + zoom in · − zoom out
 *            0 reset zoom · F favourite · I info
 */

import { icon } from './icons.js';
import { el, clamp, formatDate, fileExtLabel, aspectLabel, onSwipe, copyText, rgbToHex, rgbToHsl, escapeHtml } from './utils.js';
import { AppState, ImageRepository } from './state.js';
import { FavoritesManager } from './favorites.js';
import { Toast } from './notifications.js';
import { trapFocus, lockScroll, unlockScroll, announce } from './accessibility.js';
import { EditorController } from './editor.js';
import { CollectionManager } from './collections.js';
import { chooseDialog, promptDialog, confirmDialog } from './dialogs.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const STEP = 0.4;

class Lightbox {
  #root = null;
  #releaseFocus = null;

  constructor() {
    this.list = [];
    this.index = 0;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.isOpen = false;
  }

  /* ------------------------------ mounting ------------------------------ */
  #mount() {
    if (this.#root) return this.#root;

    const root = el('div', {
      class: 'lightbox', id: 'mireva-lightbox',
      role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Image viewer',
    });

    root.innerHTML = `
      <header class="lightbox__bar">
        <div class="lightbox__title">
          <strong data-lb="title">Untitled Image</strong>
          <span data-lb="subtitle"></span>
        </div>
        <div class="lightbox__tools">
          <button class="icon-btn" type="button" data-lb="zoomOut" aria-label="Zoom out (−)">${icon('zoomOut')}</button>
          <button class="icon-btn" type="button" data-lb="zoomReset" aria-label="Reset zoom (0)">${icon('shrink')}</button>
          <button class="icon-btn" type="button" data-lb="zoomIn" aria-label="Zoom in (+)">${icon('zoomIn')}</button>
          <button class="icon-btn" type="button" data-lb="fav" aria-pressed="false" aria-label="Add to favourites">${icon('heart')}</button>
          <button class="icon-btn" type="button" data-lb="collect" aria-label="Add to a collection">${icon('folderPlus')}</button>
          <button class="icon-btn" type="button" data-lb="edit" aria-label="Edit this image">${icon('pencil')}</button>
          <button class="icon-btn" type="button" data-lb="remove" aria-label="Remove this image">${icon('trash')}</button>
          <button class="icon-btn" type="button" data-lb="info" aria-expanded="false" aria-label="Image information (I)">${icon('info')}</button>
          <button class="icon-btn" type="button" data-lb="close" aria-label="Close viewer (Esc)">${icon('x')}</button>
        </div>
      </header>

      <div class="lightbox__stage" data-lb="stage">
        <button class="lightbox__nav lightbox__nav--prev" type="button" data-lb="prev" aria-label="Previous image (←)">${icon('chevronLeft')}</button>
        <img data-lb="image" alt="" draggable="false">
        <button class="lightbox__nav lightbox__nav--next" type="button" data-lb="next" aria-label="Next image (→)">${icon('chevronRight')}</button>
        <aside class="lightbox__info" data-lb="infoPanel" aria-label="Image details" hidden></aside>
      </div>

      <footer class="lightbox__foot">
        <div class="stack" style="gap:var(--sp-2)">
          <div class="lightbox__meta" data-lb="meta"></div>
          <div class="lightbox__tags" data-lb="tags"></div>
          <p class="lightbox__desc" data-lb="desc"></p>
        </div>
        <div class="stack" style="gap:var(--sp-2);justify-items:end">
          <span class="lightbox__counter" data-lb="counter"></span>
          <div class="lightbox__filmstrip" data-lb="strip"></div>
        </div>
      </footer>`;

    document.body.append(root);
    this.#root = root;
    this.el = Object.fromEntries(
      Array.from(root.querySelectorAll('[data-lb]')).map((n) => [n.dataset.lb, n]),
    );

    this.el.close.addEventListener('click', () => this.close());
    this.el.prev.addEventListener('click', () => this.prev());
    this.el.next.addEventListener('click', () => this.next());
    this.el.zoomIn.addEventListener('click', () => this.setZoom(this.zoom + STEP));
    this.el.zoomOut.addEventListener('click', () => this.setZoom(this.zoom - STEP));
    this.el.zoomReset.addEventListener('click', () => this.setZoom(1));
    this.el.fav.addEventListener('click', () => this.#toggleFavorite());
    this.el.info.addEventListener('click', () => this.#toggleInfo());
    this.el.edit.addEventListener('click', () => this.#edit());
    this.el.collect.addEventListener('click', () => this.#addToCollection());
    this.el.remove.addEventListener('click', () => this.#removeCurrent());

    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    this.el.stage.addEventListener('click', (e) => { if (e.target === this.el.stage) this.close(); });

    document.addEventListener('keydown', (e) => this.#onKey(e));
    this.#bindPointer();
    onSwipe(this.el.stage, { onLeft: () => this.next(), onRight: () => this.prev() });

    this.el.image.addEventListener('error', () => {
      this.el.image.alt = 'This image could not be displayed';
      Toast.error('That image could not be loaded.');
    });

    return root;
  }

  /* ------------------------------ lifecycle ------------------------------ */
  /**
   * @param {string} id      image id to show
   * @param {object[]} list  the navigable set (defaults to the whole library)
   */
  open(id, list) {
    this.#mount();
    this.list = (list && list.length ? list : ImageRepository.all());
    const idx = this.list.findIndex((i) => i.id === id);
    this.index = idx > -1 ? idx : 0;
    if (!this.list.length) { Toast.warn('There are no images to display.'); return; }

    this.isOpen = true;
    this.#root.classList.add('is-open');
    lockScroll();
    this.#renderStrip();
    this.show(this.index, { record: false });
    this.#releaseFocus = trapFocus(this.#root, { initial: this.el.close });
    announce('Image viewer opened');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.#root.classList.remove('is-open');
    this.#infoOpen = false;
    this.el.infoPanel.classList.remove('is-open');
    this.el.infoPanel.hidden = true;
    this.el.info.setAttribute('aria-expanded', 'false');
    unlockScroll();
    this.#releaseFocus?.();
    this.#releaseFocus = null;
    announce('Image viewer closed');
  }

  next() { if (this.list.length > 1) this.show((this.index + 1) % this.list.length); }
  prev() { if (this.list.length > 1) this.show((this.index - 1 + this.list.length) % this.list.length); }

  show(index, { record = true } = {}) {
    this.index = clamp(index, 0, this.list.length - 1);
    const image = this.list[this.index];
    if (!image) return;

    if (record) AppState.pushRecent(image.id);
    this.setZoom(1, { silent: true });
    this.el.image.src = image.src;
    this.el.image.alt = image.title ? `${image.title} — ${image.category}` : 'Untitled Image';
    this.el.title.textContent = image.title || 'Untitled Image';
    this.el.subtitle.textContent = `${image.category}${image.source === 'upload' ? ' · Your upload' : ''}`;
    this.el.counter.textContent = `${this.index + 1} of ${this.list.length}`;
    this.el.desc.textContent = image.description || '';

    this.el.meta.innerHTML = this.#metaMarkup(image);
    this.el.tags.innerHTML = (image.tags || []).length
      ? image.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')
      : '<span class="tag">No tags</span>';

    const fav = FavoritesManager.has(image.id);
    this.el.fav.classList.toggle('is-active', fav);
    this.el.fav.setAttribute('aria-pressed', String(fav));
    this.el.fav.setAttribute('aria-label', fav ? 'Remove from favourites' : 'Add to favourites');
    this.el.fav.innerHTML = icon('heart', { fill: fav });

    const single = this.list.length < 2;
    this.el.prev.classList.toggle('hide', single);
    this.el.next.classList.toggle('hide', single);

    this.#syncStrip();
    if (this.#infoOpen) this.#renderInfo(image);
  }

  #metaMarkup(image) {
    const dims = image.width && image.height ? `${image.width} × ${image.height}` : 'Metadata unavailable';
    const rows = [
      ['Dimensions', dims],
      ['Aspect', aspectLabel(image.width, image.height)],
      ['Format', fileExtLabel(image.type)],
      ['Added', formatDate(image.dateAdded)],
      ['Viewed by you', `${AppState.viewsFor(image.id)}×`],
    ];
    return rows.map(([dt, dd]) => `<div><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(dd)}</dd></div>`).join('');
  }

  /* ------------------------------ filmstrip ------------------------------ */
  #renderStrip() {
    this.el.strip.innerHTML = '';
    if (this.list.length < 2) return;
    this.list.forEach((img, i) => {
      this.el.strip.append(el('button', {
        type: 'button', 'aria-label': `Show ${img.title || 'Untitled Image'}`,
        onClick: () => this.show(i),
      }, [el('img', { src: img.thumb || img.src, alt: '', loading: 'lazy', decoding: 'async' })]));
    });
  }

  #syncStrip() {
    const buttons = Array.from(this.el.strip.children);
    buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === this.index)));
    buttons[this.index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  /* ------------------------------ zoom / pan ------------------------------ */
  setZoom(value, { silent = false } = {}) {
    this.zoom = clamp(Number(value.toFixed(2)), MIN_ZOOM, MAX_ZOOM);
    if (this.zoom === 1) this.pan = { x: 0, y: 0 };
    this.#applyTransform();
    this.el.zoomOut.disabled = this.zoom <= MIN_ZOOM;
    this.el.zoomIn.disabled = this.zoom >= MAX_ZOOM;
    if (!silent) announce(`Zoom ${Math.round(this.zoom * 100)} percent`);
  }

  #applyTransform() {
    this.el.image.style.transform =
      `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  #bindPointer() {
    const img = this.el.image;
    let dragging = false, start = null, pinchStart = null;

    img.addEventListener('pointerdown', (e) => {
      if (this.zoom <= 1) return;
      dragging = true;
      start = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
      img.classList.add('is-panning');
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.pan = { x: e.clientX - start.x, y: e.clientY - start.y };
      this.#applyTransform();
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      img.classList.remove('is-panning');
      try { img.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    img.addEventListener('pointerup', end);
    img.addEventListener('pointercancel', end);

    img.addEventListener('dblclick', () => this.setZoom(this.zoom > 1 ? 1 : 2.2));

    this.el.stage.addEventListener('wheel', (e) => {
      if (!this.isOpen) return;
      if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      this.setZoom(this.zoom + (e.deltaY < 0 ? STEP / 2 : -STEP / 2), { silent: true });
    }, { passive: false });

    // Pinch-to-zoom
    this.el.stage.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 2) return;
      pinchStart = { dist: this.#distance(e.touches), zoom: this.zoom };
    }, { passive: true });
    this.el.stage.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2 || !pinchStart) return;
      e.preventDefault();
      const ratio = this.#distance(e.touches) / pinchStart.dist;
      this.setZoom(pinchStart.zoom * ratio, { silent: true });
    }, { passive: false });
    this.el.stage.addEventListener('touchend', () => { pinchStart = null; }, { passive: true });
  }

  #distance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy) || 1;
  }

  /* ------------------------------ info panel ------------------------------ */
  #infoOpen = false;

  #toggleInfo() {
    this.#infoOpen = !this.#infoOpen;
    this.el.infoPanel.hidden = false;
    this.el.infoPanel.classList.toggle('is-open', this.#infoOpen);
    this.el.info.setAttribute('aria-expanded', String(this.#infoOpen));
    this.el.info.classList.toggle('is-active', this.#infoOpen);
    if (this.#infoOpen) this.#renderInfo(this.list[this.index]);
    else setTimeout(() => { if (!this.#infoOpen) this.el.infoPanel.hidden = true; }, 340);
  }

  #renderInfo(image) {
    if (!image) return;
    const rows = [
      ['Title', image.title || 'Untitled Image'],
      ['Category', image.category],
      ['Dimensions', image.width && image.height ? `${image.width} × ${image.height}` : 'Metadata unavailable'],
      ['Aspect ratio', aspectLabel(image.width, image.height)],
      ['Orientation', image.orientation || 'Metadata unavailable'],
      ['File type', fileExtLabel(image.type)],
      ['File size', image.size ? `${(image.size / 1024).toFixed(0)} KB` : 'Metadata unavailable'],
      ['Date added', formatDate(image.dateAdded)],
      ['Favourite', FavoritesManager.has(image.id) ? 'Yes' : 'No'],
      ['Viewed by you', `${AppState.viewsFor(image.id)} time${AppState.viewsFor(image.id) === 1 ? '' : 's'}`],
      ['Source', image.source === 'upload' ? 'Uploaded by you' : 'MIREVA library'],
    ];

    this.el.infoPanel.innerHTML = `
      <h4>Image details</h4>
      <dl class="stack" style="gap:0">
        ${rows.map(([dt, dd]) => `<div class="info-row"><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(String(dd))}</dd></div>`).join('')}
      </dl>
      <div class="stack" style="gap:var(--sp-2)">
        <span class="label" style="color:rgba(255,248,245,.55)">Colour explorer</span>
        <div class="swatches" data-lb-swatches>
          <p class="muted" style="font-size:var(--fs-2xs)">Reading colours…</p>
        </div>
      </div>`;

    this.#extractColours(image).then((colours) => {
      const host = this.el.infoPanel.querySelector('[data-lb-swatches]');
      if (!host) return;
      if (!colours) {
        host.innerHTML = '<p class="muted" style="font-size:var(--fs-2xs)">Colour extraction is not available for this image in your browser.</p>';
        return;
      }
      const labels = ['Dominant', 'Secondary', 'Accent'];
      host.innerHTML = '';
      colours.slice(0, 3).forEach((c, i) => {
        const btn = el('button', { class: 'swatch', type: 'button', 'aria-label': `Copy ${c.hex}` }, [
          el('span', { class: 'swatch__dot', style: `background:${c.hex}` }),
          el('span', { class: 'swatch__meta' }, [
            el('strong', { text: c.hex }),
            el('span', { text: `${labels[i]} · hsl(${c.hsl[0]}, ${c.hsl[1]}%, ${c.hsl[2]}%)` }),
          ]),
        ]);
        btn.addEventListener('click', async () => {
          const ok = await copyText(c.hex);
          ok ? Toast.success(`${c.hex} copied`) : Toast.error('Could not copy that colour.');
        });
        host.append(btn);
      });
    });
  }

  /**
   * Estimate dominant colours by down-sampling into a canvas and bucketing.
   * Returns null when the canvas cannot be read (e.g. a tainted cross-origin
   * image) — MIREVA never invents colour values.
   */
  async #extractColours(image) {
    try {
      const img = new Image();
      img.decoding = 'async';
      const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      img.src = image.src;
      await loaded;

      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = `${r >> 4},${g >> 4},${b >> 4}`;
        const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
        bucket.r += r; bucket.g += g; bucket.b += b; bucket.n += 1;
        buckets.set(key, bucket);
      }
      const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 8)
        .map((b) => {
          const r = b.r / b.n, g = b.g / b.n, bl = b.b / b.n;
          return { hex: rgbToHex(r, g, bl), hsl: rgbToHsl(r, g, bl), n: b.n };
        });

      // Prefer three visually distinct entries.
      const picked = [];
      for (const c of sorted) {
        if (picked.every((p) => Math.abs(p.hsl[0] - c.hsl[0]) > 18 || Math.abs(p.hsl[2] - c.hsl[2]) > 14)) picked.push(c);
        if (picked.length === 3) break;
      }
      while (picked.length < 3 && sorted[picked.length]) picked.push(sorted[picked.length]);
      return picked.length ? picked : null;
    } catch {
      return null;
    }
  }

  /* ------------------------------ actions ------------------------------ */
  #edit() {
    const image = this.list[this.index];
    if (!image) return;
    this.close();
    setTimeout(() => EditorController.open(image.id), 200);
  }

  async #addToCollection() {
    const image = this.list[this.index];
    if (!image) return;
    let collections = CollectionManager.all();

    if (!collections.length) {
      const name = await promptDialog({
        title: 'Create your first collection',
        description: 'Collections let you group images into your own sets.',
        label: 'Collection name', placeholder: 'Inspiration', confirmLabel: 'Create',
      });
      if (name === null) return;
      const created = CollectionManager.create(name);
      if (!created) return;
      CollectionManager.addImage(created.id, image.id);
      return;
    }

    const choice = await chooseDialog({
      title: 'Add to a collection',
      description: `“${image.title || 'Untitled Image'}” will be added to the collection you pick.`,
      options: collections.map((c) => ({ value: c.id, label: `${c.name} (${c.images.length})` })),
      confirmLabel: 'Add',
    });
    if (choice) CollectionManager.addImage(choice, image.id);
  }

  async #removeCurrent() {
    const image = this.list[this.index];
    if (!image) return;
    const isUpload = image.source === 'upload';
    const ok = await confirmDialog({
      title: isUpload ? 'Delete this image?' : 'Hide this image?',
      message: isUpload
        ? `“${image.title}” will be permanently removed from your library, favourites and collections.`
        : `“${image.title}” will be hidden from your gallery. You can restore every hidden image from Settings.`,
      confirmLabel: isUpload ? 'Delete' : 'Hide', danger: true,
    });
    if (!ok) return;

    if (isUpload) await ImageRepository.deleteUpload(image.id);
    else ImageRepository.hide(image.id);
    Toast.info(isUpload ? 'Image deleted' : 'Image hidden — restore it from Settings');

    this.list = this.list.filter((i) => i.id !== image.id);
    if (!this.list.length) { this.close(); return; }
    this.#renderStrip();
    this.show(Math.min(this.index, this.list.length - 1), { record: false });
  }

  /* ------------------------------ input ------------------------------ */
  #toggleFavorite() {
    const image = this.list[this.index];
    if (!image) return;
    const on = FavoritesManager.toggle(image.id);
    this.el.fav.classList.toggle('is-active', on);
    this.el.fav.setAttribute('aria-pressed', String(on));
    this.el.fav.innerHTML = icon('heart', { fill: on });
    const svg = this.el.fav.querySelector('svg');
    if (svg) { svg.classList.remove('heart-pop'); void svg.offsetWidth; svg.classList.add('heart-pop'); }
    if (this.#infoOpen) this.#renderInfo(image);
  }

  #onKey(e) {
    if (!this.isOpen) return;
    // A <dialog> opened from the lightbox (add-to-collection prompts) sits above
    // it and owns the keyboard while it is up. Without this guard the shortcuts
    // below swallow ordinary typing - naming a collection "Film" was impossible
    // because f and i were intercepted - and Escape closed the lightbox behind
    // the dialog as well as the dialog itself.
    if (document.querySelector('dialog[open]')) return;
    const target = e.target;
    if (target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    // Leave browser and OS chords alone: Ctrl/Cmd+F, Ctrl/Cmd+0 and friends.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case 'Escape': e.preventDefault(); this.close(); break;
      case 'ArrowLeft': e.preventDefault(); this.prev(); break;
      case 'ArrowRight': e.preventDefault(); this.next(); break;
      case '+': case '=': e.preventDefault(); this.setZoom(this.zoom + STEP); break;
      case '-': case '_': e.preventDefault(); this.setZoom(this.zoom - STEP); break;
      case '0': e.preventDefault(); this.setZoom(1); break;
      case 'f': case 'F': e.preventDefault(); this.#toggleFavorite(); break;
      case 'i': case 'I': e.preventDefault(); this.#toggleInfo(); break;
      default: break;
    }
  }
}

export const LightboxController = new Lightbox();
