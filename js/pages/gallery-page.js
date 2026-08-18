/**
 * MIREVA — gallery page controller
 * Wires search, categories, sorting, advanced filters, the layout switcher
 * and the lightbox into one reactive view. Nothing here reloads the page.
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { el, pluralise } from '../utils.js';
import { AppState, ImageRepository, CATEGORIES, bus } from '../state.js';
import { GalleryManager, renderLayoutSwitcher } from '../gallery.js';
import { LightboxController } from '../lightbox.js';
import { SearchController } from '../search.js';
import { FilterController, filterImages, sortImages, activeFilterCount, SORTS, EMPTY_FILTERS, ORIENTATIONS, ASPECTS } from '../filters.js';
import { announce } from '../accessibility.js';

const $ = (s) => document.querySelector(s);

let gallery;
let filters = AppState.filters;

function categoryCounts() {
  const all = ImageRepository.all();
  const counts = { All: all.length };
  all.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
  return counts;
}

function renderCategories() {
  const host = $('[data-categories]');
  const counts = categoryCounts();
  host.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const btn = el('button', {
      class: 'chip', type: 'button',
      'aria-pressed': String(filters.category === cat),
      html: `<span>${cat}</span><span class="chip__count">${counts[cat] || 0}</span>`,
    });
    btn.addEventListener('click', () => update({ category: cat }));
    host.append(btn);
  });
}

function renderActiveFilters() {
  const host = $('[data-active-filters]');
  host.innerHTML = '';
  const pills = [];
  if (filters.category !== 'All') pills.push(['category', filters.category, 'All']);
  if (filters.orientation !== 'any') pills.push(['orientation', ORIENTATIONS.find((o) => o.value === filters.orientation)?.label, 'any']);
  if (filters.aspect !== 'any') pills.push(['aspect', ASPECTS.find((a) => a.value === filters.aspect)?.label, 'any']);
  if (filters.favoritesOnly) pills.push(['favoritesOnly', 'Favourites only', false]);
  if (filters.recentOnly) pills.push(['recentOnly', 'Recently added', false]);

  pills.forEach(([key, label, reset]) => {
    const pill = el('span', { class: 'filter-pill' }, [el('span', { text: label })]);
    pill.append(el('button', {
      type: 'button', 'aria-label': `Remove ${label} filter`, html: icon('x', { size: 12 }),
      onClick: () => update({ [key]: reset }),
    }));
    host.append(pill);
  });

  const count = activeFilterCount(filters);
  const badge = $('[data-filter-count]');
  badge.textContent = String(count);
  badge.classList.toggle('hide', count === 0);
}

function apply() {
  const filtered = sortImages(filterImages(ImageRepository.all(), filters), filters.sort);
  gallery.render(filtered);

  const total = ImageRepository.all().length;
  const countNode = $('[data-result-count]');
  countNode.innerHTML = filtered.length
    ? `<strong>${filtered.length}</strong> ${filtered.length === 1 ? 'image' : 'images'} found${filtered.length !== total ? ` of ${total}` : ''}`
    : 'No visual matches found.';
  announce(`${pluralise(filtered.length, 'image')} found`);
  renderActiveFilters();
}

function update(patch) {
  filters = { ...filters, ...patch };
  AppState.filters = filters;
  renderCategories();
  filterPanel?.render();
  apply();
}

let filterPanel = null;

(async function init() {
  await bootApp({ page: 'gallery', title: 'Gallery' });

  const container = $('[data-gallery]');
  const empty = $('[data-empty]');
  $('[data-empty-icon]').innerHTML = icon('search', { size: 26 });
  $('[data-clear-search]').innerHTML = icon('x', { size: 16 });

  gallery = new GalleryManager({
    container, empty,
    layout: AppState.layout,
    onOpen: (id, list) => LightboxController.open(id, list),
    badgeFor: (img) => (img.source === 'upload' ? 'Yours' : null),
  });
  gallery.showSkeletons(9);

  renderLayoutSwitcher($('[data-layout-switcher]'), AppState.layout, (layout) => {
    AppState.layout = layout;
    gallery.setLayout(layout);
  });

  const sortSelect = $('#gallery-sort');
  SORTS.forEach((s) => sortSelect.append(el('option', { value: s.value, text: s.label, selected: s.value === filters.sort })));
  sortSelect.addEventListener('change', () => update({ sort: sortSelect.value }));

  const search = new SearchController({
    input: $('#gallery-search'),
    clearBtn: $('[data-clear-search]'),
    initial: filters.query || '',
    onChange: (q) => update({ query: q }),
  });

  const panelHost = $('#filters-panel');
  filterPanel = new FilterController({
    panel: panelHost,
    categories: CATEGORIES,
    getFilters: () => filters,
    onChange: (patch) => update(patch),
    onClear: () => {
      search.input.value = '';
      update({ ...EMPTY_FILTERS, sort: filters.sort });
    },
  });

  const toggle = $('[data-toggle-filters]');
  toggle.addEventListener('click', () => {
    const open = panelHost.classList.toggle('hide');
    panelHost.hidden = open;
    toggle.setAttribute('aria-expanded', String(!open));
  });

  $('[data-clear-all]').addEventListener('click', () => {
    search.input.value = '';
    update({ ...EMPTY_FILTERS, sort: filters.sort });
  });

  renderCategories();
  apply();

  ['favorites:changed', 'repo:changed'].forEach((e) => bus.on(e, () => { renderCategories(); apply(); }));
})();
