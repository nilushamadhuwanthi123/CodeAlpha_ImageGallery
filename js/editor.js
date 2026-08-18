/**
 * MIREVA — image effects & lightweight editor
 *
 * Live CSS-filter preview for speed, Canvas for the final render.
 * Supports rotate, flip, brightness, contrast, saturation, blur, grayscale,
 * sepia and warmth, plus six presets. Originals are never modified: applying
 * saves a new image into your library (or exports a PNG).
 */

import { icon } from './icons.js';
import { el, clamp, loadImage } from './utils.js';
import { ImageRepository, CATEGORIES } from './state.js';
import { Toast } from './notifications.js';
import { trapFocus, lockScroll, unlockScroll } from './accessibility.js';
import { confirmDialog } from './dialogs.js';

const BASE = { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, sepia: 0, warmth: 0 };

export const PRESETS = {
  Original: { ...BASE },
  'Black & White': { ...BASE, grayscale: 100, contrast: 112 },
  Vintage: { ...BASE, sepia: 46, contrast: 92, saturate: 88, warmth: 18 },
  Warm: { ...BASE, warmth: 32, saturate: 112, brightness: 104 },
  Cool: { ...BASE, warmth: -28, saturate: 104, brightness: 101 },
  'High Contrast': { ...BASE, contrast: 148, saturate: 108 },
  Soft: { ...BASE, blur: 1.4, brightness: 106, contrast: 94, saturate: 96 },
};

const SLIDERS = [
  { key: 'brightness', label: 'Brightness', min: 40, max: 180, step: 1, unit: '%' },
  { key: 'contrast', label: 'Contrast', min: 40, max: 200, step: 1, unit: '%' },
  { key: 'saturate', label: 'Saturation', min: 0, max: 220, step: 1, unit: '%' },
  { key: 'warmth', label: 'Warmth', min: -60, max: 60, step: 1, unit: '' },
  { key: 'blur', label: 'Blur', min: 0, max: 12, step: 0.2, unit: 'px' },
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, step: 1, unit: '%' },
];

/** Build the CSS filter string for a given adjustment set. */
export function filterString(a) {
  const warm = a.warmth || 0;
  const sepiaFromWarmth = warm > 0 ? warm * 0.35 : 0;
  const hue = warm < 0 ? warm * 0.5 : 0; // cool → shift towards blue
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturate}%)`,
    a.blur ? `blur(${a.blur}px)` : '',
    a.grayscale ? `grayscale(${a.grayscale}%)` : '',
    a.sepia + sepiaFromWarmth ? `sepia(${clamp(a.sepia + sepiaFromWarmth, 0, 100)}%)` : '',
    hue ? `hue-rotate(${hue}deg)` : '',
  ].filter(Boolean).join(' ');
}

class Editor {
  #root = null;
  #release = null;

  constructor() {
    this.adjust = { ...BASE };
    this.rotation = 0;
    this.flipH = false;
    this.flipV = false;
    this.image = null;
  }

  /** @param {string} imageId */
  async open(imageId) {
    const image = ImageRepository.byId(imageId);
    if (!image) { Toast.error('That image is no longer available.'); return; }
    this.image = image;
    this.adjust = { ...BASE };
    this.rotation = 0; this.flipH = false; this.flipV = false;
    this.#render();
  }

  close() {
    this.#release?.();
    this.#release = null;
    unlockScroll();
    this.#root?.remove();
    this.#root = null;
  }

  /* ------------------------------ UI ------------------------------ */
  #render() {
    this.#root?.remove();
    const root = el('div', {
      class: 'lightbox is-open', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Image editor',
      style: 'display:grid;grid-template-rows:auto 1fr;background:var(--overlay-deep)',
    });

    const bar = el('header', { class: 'lightbox__bar' }, [
      el('div', { class: 'lightbox__title' }, [
        el('strong', { text: 'Image editor' }),
        el('span', { text: this.image.title || 'Untitled Image' }),
      ]),
    ]);
    const tools = el('div', { class: 'lightbox__tools' });
    tools.append(el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'Close editor',
      html: icon('x'), onClick: () => this.close(),
    }));
    bar.append(tools);

    const stage = el('div', { class: 'editor__stage', style: 'background:transparent;border:none' });
    this.preview = el('img', { src: this.image.src, alt: this.image.title || 'Untitled Image', decoding: 'async' });
    stage.append(this.preview);

    const panel = el('div', { class: 'editor__panel', style: 'align-content:start;overflow-y:auto;max-height:100%' });
    panel.append(
      el('div', { class: 'stack', style: 'gap:var(--sp-3)' }, [
        el('span', { class: 'label', text: 'Presets' }),
        this.#presets(),
      ]),
      el('div', { class: 'stack', style: 'gap:var(--sp-3)' }, [
        el('span', { class: 'label', text: 'Transform' }),
        this.#transforms(),
      ]),
      el('div', { class: 'stack', style: 'gap:var(--sp-3)' }, [
        el('span', { class: 'label', text: 'Adjustments' }),
        this.#sliders(),
      ]),
      this.#actions(),
    );

    const body = el('div', {
      class: 'editor',
      style: 'padding:var(--sp-4);overflow:hidden;color:#FFF8F5',
    }, [stage, panel]);

    panel.style.background = 'rgba(255,255,255,.04)';
    panel.style.border = '1px solid rgba(255,255,255,.1)';
    panel.style.borderRadius = 'var(--r-lg)';
    panel.style.padding = 'var(--sp-5)';

    root.append(bar, body);
    document.body.append(root);
    this.#root = root;
    lockScroll();
    this.#release = trapFocus(root);
    this.#apply();
  }

  #presets() {
    const wrap = el('div', { class: 'presets' });
    Object.entries(PRESETS).forEach(([name, values]) => {
      const btn = el('button', {
        class: 'preset', type: 'button', 'aria-pressed': String(name === 'Original'),
        style: 'background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12)',
      }, [
        el('span', { class: 'preset__swatch' }, [
          el('img', { src: this.image.thumb || this.image.src, alt: '', style: `filter:${filterString(values)}` }),
        ]),
        el('span', { text: name, style: 'color:rgba(255,248,245,.8)' }),
      ]);
      btn.addEventListener('click', () => {
        this.adjust = { ...values };
        wrap.querySelectorAll('.preset').forEach((p) => p.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        this.#syncSliders();
        this.#apply();
      });
      wrap.append(btn);
    });
    return wrap;
  }

  #transforms() {
    const row = el('div', { class: 'transform-row' });
    const mk = (ic, label, fn) => el('button', {
      class: 'btn btn--sm', type: 'button', style: 'background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14);color:#FFF8F5',
      html: `${icon(ic, { size: 15 })}<span>${label}</span>`, onClick: fn,
    });
    row.append(
      mk('rotateCcw', 'Rotate left', () => { this.rotation = (this.rotation - 90 + 360) % 360; this.#apply(); }),
      mk('rotateCw', 'Rotate right', () => { this.rotation = (this.rotation + 90) % 360; this.#apply(); }),
      mk('flipH', 'Flip H', () => { this.flipH = !this.flipH; this.#apply(); }),
      mk('flipV', 'Flip V', () => { this.flipV = !this.flipV; this.#apply(); }),
    );
    return row;
  }

  #sliders() {
    const wrap = el('div', { class: 'sliders' });
    this.sliderNodes = {};
    SLIDERS.forEach((s) => {
      const output = el('output', { text: `${this.adjust[s.key]}${s.unit}` });
      const input = el('input', {
        class: 'range', type: 'range', min: String(s.min), max: String(s.max), step: String(s.step),
        value: String(this.adjust[s.key]), 'aria-label': s.label,
      });
      input.addEventListener('input', () => {
        this.adjust[s.key] = Number(input.value);
        output.textContent = `${input.value}${s.unit}`;
        this.#apply();
      });
      this.sliderNodes[s.key] = { input, output, unit: s.unit };
      wrap.append(el('div', { class: 'slider-row' }, [
        el('div', { class: 'slider-row__head' }, [
          el('label', { text: s.label, style: 'color:rgba(255,248,245,.86)' }), output,
        ]),
        input,
      ]));
    });
    return wrap;
  }

  #syncSliders() {
    SLIDERS.forEach((s) => {
      const node = this.sliderNodes?.[s.key];
      if (!node) return;
      node.input.value = String(this.adjust[s.key]);
      node.output.textContent = `${this.adjust[s.key]}${s.unit}`;
    });
  }

  #actions() {
    const row = el('div', { class: 'row', style: 'gap:var(--sp-2)' });
    row.append(
      el('button', {
        class: 'btn btn--primary', type: 'button',
        html: `${icon('check', { size: 16 })}<span>Apply</span>`,
        onClick: () => this.#applyToLibrary(),
      }),
      el('button', {
        class: 'btn', type: 'button', style: 'background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14);color:#FFF8F5',
        html: `${icon('download', { size: 16 })}<span>Export PNG</span>`,
        onClick: () => this.#export(),
      }),
      el('button', {
        class: 'btn btn--ghost', type: 'button', style: 'color:rgba(255,248,245,.8)',
        html: `${icon('refresh', { size: 16 })}<span>Reset</span>`,
        onClick: () => this.reset(),
      }),
      el('button', {
        class: 'btn btn--ghost', type: 'button', style: 'color:rgba(255,248,245,.8)',
        text: 'Cancel', onClick: () => this.close(),
      }),
    );
    return row;
  }

  reset() {
    this.adjust = { ...BASE };
    this.rotation = 0; this.flipH = false; this.flipV = false;
    this.#syncSliders();
    this.#root?.querySelectorAll('.preset').forEach((p, i) => p.setAttribute('aria-pressed', String(i === 0)));
    this.#apply();
    Toast.info('Adjustments reset');
  }

  #apply() {
    if (!this.preview) return;
    this.preview.style.filter = filterString(this.adjust);
    this.preview.style.transform =
      `rotate(${this.rotation}deg) scaleX(${this.flipH ? -1 : 1}) scaleY(${this.flipV ? -1 : 1})`;
  }

  /** Render the edited image onto a canvas and return a Blob. */
  async #renderToBlob() {
    const img = await loadImage(this.image.src);
    const w = img.naturalWidth || 1200;
    const h = img.naturalHeight || 900;
    const swap = this.rotation === 90 || this.rotation === 270;

    const canvas = document.createElement('canvas');
    canvas.width = swap ? h : w;
    canvas.height = swap ? w : h;
    const ctx = canvas.getContext('2d');
    ctx.filter = filterString(this.adjust);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve({ blob, width: canvas.width, height: canvas.height })
        : reject(new Error('The edited image could not be rendered.'))), 'image/png', 0.92);
    });
  }

  async #applyToLibrary() {
    try {
      const { blob, width, height } = await this.#renderToBlob();
      if (this.image.source === 'upload') {
        const replace = await confirmDialog({
          title: 'Save changes',
          message: 'Replace the original upload with this edited version, or keep both?',
          confirmLabel: 'Replace original', cancelLabel: 'Save as a copy',
        });
        if (replace) {
          await ImageRepository.updateUpload(this.image.id, { blob, width, height, type: 'image/png' });
          Toast.success('Changes applied');
          this.close();
          return;
        }
      }
      await ImageRepository.addUpload({
        blob, fileName: `${this.image.title || 'image'}-edited.png`,
        title: `${this.image.title || 'Untitled Image'} (edited)`,
        category: CATEGORIES.includes(this.image.category) ? this.image.category : 'Photography',
        tags: [...(this.image.tags || []), 'edited'],
        description: this.image.description || '',
        width, height, type: 'image/png',
      });
      Toast.success('Edited image saved to your library');
      this.close();
    } catch (err) {
      console.warn('[MIREVA] editor apply failed', err);
      Toast.error('This image could not be edited in your browser. Try running MIREVA from a local server.');
    }
  }

  async #export() {
    try {
      const { blob } = await this.#renderToBlob();
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: `${(this.image.title || 'mireva-image').replace(/\s+/g, '-').toLowerCase()}.png` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      Toast.success('Export complete');
    } catch {
      Toast.error('That image could not be exported from this browser.');
    }
  }
}

export const EditorController = new Editor();
