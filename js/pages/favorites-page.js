/**
 * MIREVA — favourites page controller
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { pluralise } from '../utils.js';
import { AppState, bus } from '../state.js';
import { GalleryManager, renderLayoutSwitcher } from '../gallery.js';
import { LightboxController } from '../lightbox.js';
import { FavoritesManager } from '../favorites.js';
import { confirmDialog } from '../dialogs.js';

const $ = (s) => document.querySelector(s);
let gallery;

function render() {
  const images = FavoritesManager.list();
  gallery.render(images);
  $('[data-result-count]').innerHTML = images.length
    ? `<strong>${images.length}</strong> ${images.length === 1 ? 'image' : 'images'} in your favourites`
    : 'Nothing here yet.';
  $('[data-clear-favorites]').classList.toggle('hide', images.length === 0);
}

(async function init() {
  await bootApp({ page: 'favorites', title: 'Favourites' });
  $('[data-empty-icon]').innerHTML = icon('heart', { size: 26 });

  gallery = new GalleryManager({
    container: $('[data-gallery]'),
    empty: $('[data-empty]'),
    layout: AppState.layout,
    onOpen: (id, list) => LightboxController.open(id, list),
  });

  renderLayoutSwitcher($('[data-layout-switcher]'), AppState.layout, (layout) => {
    AppState.layout = layout;
    gallery.setLayout(layout);
  });

  $('[data-clear-favorites]').addEventListener('click', async () => {
    if (AppState.preferences.confirmDestructive) {
      const ok = await confirmDialog({
        title: 'Clear all favourites?',
        message: `${pluralise(FavoritesManager.count(), 'image')} will be removed from your favourites. The images themselves stay in your library.`,
        confirmLabel: 'Clear favourites', danger: true,
      });
      if (!ok) return;
    }
    FavoritesManager.clear();
  });

  render();
  ['favorites:changed', 'repo:changed'].forEach((e) => bus.on(e, render));
})();
