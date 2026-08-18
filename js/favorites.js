/**
 * MIREVA — favourites
 * Thin, well-named wrapper around AppState so UI code never pokes at storage.
 */

import { AppState, ImageRepository, bus } from './state.js';
import { Toast } from './notifications.js';
import { announce } from './accessibility.js';

class Favorites {
  list() { return ImageRepository.byIds(AppState.favorites); }
  count() { return this.list().length; }
  has(id) { return AppState.isFavorite(id); }

  /** @returns {boolean} the new favourite state */
  toggle(id, { quiet = false } = {}) {
    const image = ImageRepository.byId(id);
    const on = AppState.toggleFavorite(id);
    if (!quiet) {
      const name = image?.title || 'Image';
      Toast.success(on ? `${name} added to favourites` : `${name} removed from favourites`);
      announce(on ? 'Added to favourites' : 'Removed from favourites');
    }
    return on;
  }

  remove(id) {
    AppState.favorites = AppState.favorites.filter((x) => x !== id);
    Toast.info('Removed from favourites');
  }

  clear() {
    AppState.favorites = [];
    Toast.info('Favourites cleared');
  }

  onChange(fn) { return bus.on('favorites:changed', fn); }
}

export const FavoritesManager = new Favorites();

/**
 * Wire every `[data-fav-toggle="<id>"]` button inside `root`.
 * Buttons keep their own pressed state and animate on activation.
 */
export function bindFavoriteButtons(root = document) {
  root.querySelectorAll('[data-fav-toggle]').forEach((btn) => {
    if (btn.dataset.favBound === 'true') return;
    btn.dataset.favBound = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.favToggle;
      const on = FavoritesManager.toggle(id);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Remove from favourites' : 'Add to favourites');
      const svg = btn.querySelector('svg');
      if (svg) { svg.classList.remove('heart-pop'); void svg.offsetWidth; svg.classList.add('heart-pop'); }
    });
  });
}
