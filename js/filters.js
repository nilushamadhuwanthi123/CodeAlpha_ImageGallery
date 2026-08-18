/**
 * MIREVA — filtering & sorting
 * Pure query functions plus a controller that wires the advanced filter panel.
 */

import { AppState } from './state.js';
import { searchImages } from './search.js';
import { icon } from './icons.js';
import { el } from './utils.js';

export const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Title A–Z' },
  { value: 'za', label: 'Title Z–A' },
  { value: 'views', label: 'Most viewed by you' },
  { value: 'favorites', label: 'Favourites first' },
];

export const ORIENTATIONS = [
  { value: 'any', label: 'Any' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
];

export const ASPECTS = [
  { value: 'any', label: 'Any' },
  { value: 'wide', label: 'Wide (≥ 3:2)' },
  { value: 'standard', label: 'Standard (4:3 – 3:2)' },
  { value: 'tall', label: 'Tall (≤ 3:4)' },
];

function aspectBucket(image) {
  if (!image.width || !image.height) return 'unknown';
  const r = image.width / image.height;
  if (r >= 1.5) return 'wide';
  if (r >= 1.2) return 'standard';
  if (r <= 0.75) return 'tall';
  return 'standard';
}

const RECENT_WINDOW_DAYS = 45;

/** Apply the full filter set to a list of images. */
export function filterImages(images, filters = {}) {
  const favs = new Set(AppState.favorites);
  const recentIds = new Set(AppState.recent.map((r) => r.id));
  let out = images;

  if (filters.category && filters.category !== 'All') {
    out = out.filter((i) => i.category === filters.category);
  }
  if (filters.orientation && filters.orientation !== 'any') {
    out = out.filter((i) => i.orientation === filters.orientation);
  }
  if (filters.aspect && filters.aspect !== 'any') {
    out = out.filter((i) => aspectBucket(i) === filters.aspect);
  }
  if (filters.favoritesOnly) out = out.filter((i) => favs.has(i.id));
  if (filters.recentOnly) {
    const cutoff = Date.now() - RECENT_WINDOW_DAYS * 864e5;
    out = out.filter((i) => recentIds.has(i.id) || new Date(i.dateAdded).getTime() >= cutoff);
  }
  if (filters.query) out = searchImages(out, filters.query);
  return out;
}

export function sortImages(images, sort = 'newest') {
  const favs = new Set(AppState.favorites);
  const views = AppState.views;
  const list = [...images];
  const byDate = (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded);

  switch (sort) {
    case 'oldest': return list.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    case 'az': return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'za': return list.sort((a, b) => b.title.localeCompare(a.title));
    case 'views': return list.sort((a, b) => (views[b.id] || 0) - (views[a.id] || 0) || byDate(a, b));
    case 'favorites': return list.sort((a, b) => (favs.has(b.id) - favs.has(a.id)) || byDate(a, b));
    case 'newest':
    default: return list.sort(byDate);
  }
}

/** Number of filters currently narrowing the result set (search excluded). */
export function activeFilterCount(f = {}) {
  let n = 0;
  if (f.category && f.category !== 'All') n += 1;
  if (f.orientation && f.orientation !== 'any') n += 1;
  if (f.aspect && f.aspect !== 'any') n += 1;
  if (f.favoritesOnly) n += 1;
  if (f.recentOnly) n += 1;
  return n;
}

export const EMPTY_FILTERS = {
  category: 'All', orientation: 'any', aspect: 'any',
  favoritesOnly: false, recentOnly: false, query: '', sort: 'newest',
};

/**
 * Renders and wires the advanced filter panel.
 */
export class FilterController {
  /**
   * @param {{panel:HTMLElement, categories:string[], getFilters:()=>object, onChange:(patch:object)=>void, onClear:()=>void}} opts
   */
  constructor({ panel, categories, getFilters, onChange, onClear }) {
    this.panel = panel;
    this.categories = categories;
    this.getFilters = getFilters;
    this.onChange = onChange;
    this.onClear = onClear;
    this.render();
  }

  render() {
    const f = this.getFilters();
    this.panel.innerHTML = '';

    const grid = el('div', { class: 'filters-panel__grid' });
    grid.append(
      this.#selectGroup('Category', 'category', ['All', ...this.categories.filter((c) => c !== 'All')].map((c) => ({ value: c, label: c })), f.category),
      this.#chipGroup('Orientation', 'orientation', ORIENTATIONS, f.orientation),
      this.#chipGroup('Aspect ratio', 'aspect', ASPECTS, f.aspect),
      this.#toggleGroup(f),
    );

    const foot = el('div', { class: 'spread' }, [
      el('p', { class: 'muted', style: 'font-size:var(--fs-2xs)', text: 'Filters are saved on this device.' }),
      el('button', {
        class: 'btn btn--ghost btn--sm', type: 'button',
        html: `${icon('refresh', { size: 15 })}<span>Clear filters</span>`,
        onClick: () => this.onClear(),
      }),
    ]);

    this.panel.append(grid, el('hr', { class: 'divider' }), foot);
  }

  #selectGroup(label, key, options, current) {
    const select = el('select', { class: 'select', 'aria-label': label });
    options.forEach((o) => select.append(el('option', { value: o.value, text: o.label, selected: o.value === current })));
    select.addEventListener('change', () => this.onChange({ [key]: select.value }));
    return el('div', { class: 'filters-group' }, [el('span', { class: 'label', text: label }), select]);
  }

  #chipGroup(label, key, options, current) {
    const wrap = el('div', { class: 'filters-group__options', role: 'group', 'aria-label': label });
    options.forEach((o) => {
      wrap.append(el('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(o.value === current), text: o.label,
        onClick: () => this.onChange({ [key]: o.value }),
      }));
    });
    return el('div', { class: 'filters-group' }, [el('span', { class: 'label', text: label }), wrap]);
  }

  #toggleGroup(f) {
    const mk = (key, text) => {
      const input = el('input', { type: 'checkbox', checked: Boolean(f[key]) });
      input.addEventListener('change', () => this.onChange({ [key]: input.checked }));
      return el('label', { class: 'switch' }, [
        input, el('span', { class: 'switch__track' }), el('span', { text, style: 'font-size:var(--fs-sm);font-weight:600' }),
      ]);
    };
    return el('div', { class: 'filters-group' }, [
      el('span', { class: 'label', text: 'Quick filters' }),
      mk('favoritesOnly', 'Favourites only'),
      mk('recentOnly', 'Recently added'),
    ]);
  }
}
