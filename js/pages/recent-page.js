/**
 * MIREVA — recently viewed page controller
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { el, relativeTime, pluralise } from '../utils.js';
import { AppState, ImageRepository, bus } from '../state.js';
import { LightboxController } from '../lightbox.js';
import { FavoritesManager } from '../favorites.js';
import { confirmDialog } from '../dialogs.js';

const $ = (s) => document.querySelector(s);

function render() {
  const host = $('[data-recent]');
  const entries = AppState.recent;
  const images = ImageRepository.byIds(entries.map((e) => e.id));
  host.innerHTML = '';

  $('[data-empty]').classList.toggle('hide', images.length > 0);
  $('[data-clear-recent]').classList.toggle('hide', images.length === 0);
  $('[data-result-count]').innerHTML = images.length
    ? `<strong>${images.length}</strong> ${images.length === 1 ? 'image' : 'images'} in your history`
    : 'Your history is empty.';

  images.forEach((img) => {
    const entry = entries.find((e) => e.id === img.id);
    const row = el('article', { class: 'recent-row' }, [
      el('img', { class: 'recent-row__thumb', src: img.thumb || img.src, alt: '', loading: 'lazy', decoding: 'async' }),
      el('div', { class: 'recent-row__body' }, [
        el('strong', { text: img.title || 'Untitled Image' }),
        el('span', { text: `${img.category} · ${relativeTime(entry?.ts)} · viewed by you ${AppState.viewsFor(img.id)}×` }),
      ]),
    ]);

    const actions = el('div', { class: 'recent-row__actions' });
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Open', 'aria-label': `Open ${img.title}`,
      html: icon('expand', { size: 17 }),
      onClick: () => { AppState.pushRecent(img.id); LightboxController.open(img.id, images); },
    }));
    const on = FavoritesManager.has(img.id);
    actions.append(el('button', {
      class: `icon-btn${on ? ' is-active' : ''}`, type: 'button', title: 'Favourite',
      'aria-label': on ? 'Remove from favourites' : 'Add to favourites',
      html: icon('heart', { size: 17, fill: on }),
      onClick: (e) => {
        const next = FavoritesManager.toggle(img.id);
        e.currentTarget.classList.toggle('is-active', next);
        e.currentTarget.innerHTML = icon('heart', { size: 17, fill: next });
      },
    }));
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Remove from history',
      'aria-label': `Remove ${img.title} from history`,
      html: icon('trash', { size: 17 }),
      onClick: () => AppState.removeRecent(img.id),
    }));
    row.append(actions);
    host.append(row);
  });
}

(async function init() {
  await bootApp({ page: 'recent', title: 'Recently Viewed' });
  $('[data-empty-icon]').innerHTML = icon('clock', { size: 26 });

  $('[data-clear-recent]').addEventListener('click', async () => {
    if (AppState.preferences.confirmDestructive) {
      const ok = await confirmDialog({
        title: 'Clear your history?',
        message: `${pluralise(AppState.recent.length, 'entry', 'entries')} will be removed. Your images and favourites are not affected.`,
        confirmLabel: 'Clear history', danger: true,
      });
      if (!ok) return;
    }
    AppState.clearRecent();
  });

  render();
  ['recent:changed', 'favorites:changed', 'repo:changed'].forEach((e) => bus.on(e, render));
})();
