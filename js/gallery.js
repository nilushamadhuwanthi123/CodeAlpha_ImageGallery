/**
 * MIREVA — GalleryManager
 * Renders image tiles into masonry, grid or focus layouts, handles lazy
 * loading, skeleton placeholders, empty states and per-tile interactions.
 */

import { icon } from './icons.js';
import { el, escapeHtml, aspectLabel } from './utils.js';
import { AppState } from './state.js';
import { FavoritesManager, bindFavoriteButtons } from './favorites.js';

export const LAYOUTS = [
  { value: 'masonry', label: 'Masonry', icon: 'masonry' },
  { value: 'grid', label: 'Grid', icon: 'grid' },
  { value: 'focus', label: 'Focus', icon: 'focus' },
];

const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23F8EEE8'/%3E%3C/svg%3E";

export class GalleryManager {
  /**
   * @param {{container:HTMLElement, empty?:HTMLElement, onOpen?:(id:string,list:object[])=>void,
   *          layout?:string, badgeFor?:(img:object)=>string|null, showFavorite?:boolean,
   *          extraActions?:(img:object)=>HTMLElement[]}} opts
   */
  constructor({ container, empty, onOpen, layout = 'masonry', badgeFor, showFavorite = true, extraActions }) {
    this.container = container;
    this.empty = empty || null;
    this.onOpen = onOpen;
    this.badgeFor = badgeFor;
    this.showFavorite = showFavorite;
    this.extraActions = extraActions;
    this.images = [];
    this.setLayout(layout, { silent: true });
    this.#bindDelegates();
  }

  setLayout(layout, { silent = false } = {}) {
    this.layout = LAYOUTS.some((l) => l.value === layout) ? layout : 'masonry';
    this.container.dataset.layout = this.layout;
    if (!silent) this.render(this.images);
    return this.layout;
  }

  /** Show shimmering placeholders while data settles. */
  showSkeletons(count = 9) {
    this.container.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const h = [180, 260, 320, 220, 300][i % 5];
      this.container.append(el('div', {
        class: 'skeleton tile-skeleton',
        style: `height:${h}px`, 'aria-hidden': 'true',
      }));
    }
  }

  render(images = []) {
    this.images = images;
    this.container.innerHTML = '';

    if (!images.length) {
      this.container.classList.add('hide');
      this.empty?.classList.remove('hide');
      return;
    }
    this.container.classList.remove('hide');
    this.empty?.classList.add('hide');

    const frag = document.createDocumentFragment();
    images.forEach((img, index) => frag.append(this.#tile(img, index)));
    this.container.append(frag);
    bindFavoriteButtons(this.container);
  }

  #tile(image, index) {
    const isFav = FavoritesManager.has(image.id);
    const ratio = image.width && image.height ? `${image.width} / ${image.height}` : '4 / 3';
    const badge = this.badgeFor?.(image);

    const tile = el('article', {
      class: 'tile',
      dataset: { id: image.id },
      style: `animation-delay:${Math.min(index, 12) * 26}ms`,
    });

    const media = el('div', { class: 'tile__media' });
    const picture = el('img', {
      src: this.layout === 'focus' ? image.src : (image.thumb || image.src),
      alt: image.title ? `${image.title} — ${image.category}` : 'Untitled Image',
      loading: index < 4 ? 'eager' : 'lazy',
      decoding: 'async',
      width: image.width || undefined,
      height: image.height || undefined,
    });
    if (this.layout !== 'grid') media.style.aspectRatio = ratio;
    picture.addEventListener('error', () => {
      picture.src = FALLBACK_SVG;
      picture.alt = 'This image could not be displayed';
      tile.dataset.broken = 'true';
    }, { once: true });
    media.append(picture);

    const openBtn = el('button', {
      class: 'visually-hidden', type: 'button',
      dataset: { open: image.id },
      text: `Open ${image.title || 'Untitled Image'}`,
    });

    tile.append(media, openBtn);

    if (badge) tile.append(el('span', { class: 'tile__badge', text: badge }));

    if (this.showFavorite) {
      tile.append(el('button', {
        class: `tile__fav${isFav ? ' is-on' : ''}`,
        type: 'button',
        dataset: { favToggle: image.id },
        'aria-pressed': String(isFav),
        'aria-label': isFav ? 'Remove from favourites' : 'Add to favourites',
        html: icon('heart', { size: 17, fill: isFav }),
      }));
    }

    tile.append(el('div', { class: 'tile__caption' }, [
      el('strong', { text: image.title || 'Untitled Image' }),
      el('span', { text: `${image.category} · ${aspectLabel(image.width, image.height)}` }),
    ]));

    if (this.extraActions) {
      const actions = el('div', { class: 'row', style: 'position:absolute;bottom:10px;right:10px;z-index:4' });
      this.extraActions(image).forEach((n) => actions.append(n));
      tile.append(actions);
    }

    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.setAttribute('aria-label', `Open ${image.title || 'Untitled Image'} in the lightbox`);
    return tile;
  }

  #bindDelegates() {
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('[data-fav-toggle]') || e.target.closest('[data-tile-action]')) return;
      const tile = e.target.closest('.tile');
      if (!tile) return;
      this.#open(tile.dataset.id);
    });
    this.container.addEventListener('keydown', (e) => {
      const tile = e.target.closest('.tile');
      if (!tile) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#open(tile.dataset.id);
      }
    });
  }

  #open(id) {
    if (!id) return;
    AppState.pushRecent(id);
    this.onOpen?.(id, this.images);
  }
}

/** Build the masonry/grid/focus segmented control. */
export function renderLayoutSwitcher(host, current, onSelect) {
  host.innerHTML = '';
  host.className = 'segmented';
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', 'Gallery layout');
  LAYOUTS.forEach((l) => {
    host.append(el('button', {
      type: 'button',
      'aria-pressed': String(l.value === current),
      html: `${icon(l.icon, { size: 15 })}<span>${escapeHtml(l.label)}</span>`,
      onClick: () => {
        host.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        host.querySelectorAll('button').forEach((b) => {
          if (b.textContent.trim() === l.label) b.setAttribute('aria-pressed', 'true');
        });
        onSelect(l.value);
      },
    }));
  });
}
