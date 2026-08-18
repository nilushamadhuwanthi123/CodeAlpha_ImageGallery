/**
 * MIREVA — search
 * Matches across title, category, tags and description. Pure matching logic
 * lives here so it can be reused by the gallery, favourites and command centre.
 */

import { debounce } from './utils.js';

export function normalise(value = '') {
  return String(value).toLowerCase().trim();
}

/** Does an image match a free-text query? */
export function matchesQuery(image, query) {
  const q = normalise(query);
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const haystack = [
    image.title, image.category, image.description,
    ...(image.tags || []), image.fileName || '',
  ].join(' ').toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export function searchImages(images, query) {
  const q = normalise(query);
  if (!q) return images;
  return images.filter((img) => matchesQuery(img, q));
}

/**
 * Binds a search input (plus optional clear button) to a callback.
 * Debounced, keyboard friendly, and never reloads the page.
 */
export class SearchController {
  /**
   * @param {{input:HTMLInputElement, clearBtn?:HTMLElement, onChange:(q:string)=>void, initial?:string, delay?:number}} opts
   */
  constructor({ input, clearBtn, onChange, initial = '', delay = 180 }) {
    this.input = input;
    this.clearBtn = clearBtn;
    this.onChange = onChange;
    if (!input) return;

    this.input.value = initial;
    this.#syncClear();

    const emit = debounce((v) => this.onChange(v), delay);
    this.input.addEventListener('input', () => {
      this.#syncClear();
      emit(this.input.value);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.input.value) {
        e.stopPropagation();
        this.clear();
      }
    });
    this.clearBtn?.addEventListener('click', () => this.clear());
  }

  get value() { return this.input?.value ?? ''; }

  clear() {
    if (!this.input) return;
    this.input.value = '';
    this.#syncClear();
    this.onChange('');
    this.input.focus();
  }

  focus() { this.input?.focus(); this.input?.select(); }

  #syncClear() {
    if (!this.clearBtn) return;
    this.clearBtn.classList.toggle('hide', !this.input.value);
  }
}
