/**
 * MIREVA — collections page controller
 * Create · rename · delete collections, and add or remove images inside one.
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { el, formatDate, pluralise } from '../utils.js';
import { AppState, ImageRepository, bus } from '../state.js';
import { CollectionManager } from '../collections.js';
import { GalleryManager } from '../gallery.js';
import { LightboxController } from '../lightbox.js';
import { promptDialog, confirmDialog, imagePickerDialog } from '../dialogs.js';

const $ = (s) => document.querySelector(s);
let detailGallery = null;
let openId = null;

function coverFor(collection) {
  const images = CollectionManager.imagesOf(collection.id).slice(0, 3);
  const cover = el('div', { class: 'collection-card__cover' });
  if (!images.length) {
    cover.append(el('div', { class: 'empty-cover', html: icon('image', { size: 26 }) }));
  } else {
    images.forEach((img) => cover.append(el('img', { src: img.thumb || img.src, alt: '', loading: 'lazy', decoding: 'async' })));
    for (let i = images.length; i < 3; i += 1) cover.append(el('div', { style: 'background:var(--surface-soft)' }));
  }
  return cover;
}

function renderList() {
  const host = $('[data-collections]');
  const list = CollectionManager.all();
  host.innerHTML = '';

  $('[data-empty]').classList.toggle('hide', list.length > 0);
  $('[data-result-count]').innerHTML = list.length
    ? `<strong>${list.length}</strong> ${list.length === 1 ? 'collection' : 'collections'}`
    : 'No collections yet.';

  list.forEach((c) => {
    const count = CollectionManager.imagesOf(c.id).length;
    const card = el('article', { class: 'collection-card' });
    card.append(coverFor(c));

    const actions = el('div', { class: 'collection-card__actions' });
    actions.append(el('button', {
      class: 'btn btn--sm btn--soft', type: 'button', text: 'Open',
      onClick: () => openDetail(c.id),
    }));
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Add images', 'aria-label': `Add images to ${c.name}`,
      html: icon('plus', { size: 17 }), onClick: () => addImages(c.id),
    }));
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Rename', 'aria-label': `Rename ${c.name}`,
      html: icon('pencil', { size: 17 }),
      onClick: async () => {
        const name = await promptDialog({ title: 'Rename collection', label: 'Collection name', value: c.name });
        if (name !== null) CollectionManager.rename(c.id, name);
      },
    }));
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Delete', 'aria-label': `Delete ${c.name}`,
      html: icon('trash', { size: 17 }),
      onClick: async () => {
        if (AppState.preferences.confirmDestructive) {
          const ok = await confirmDialog({
            title: `Delete “${c.name}”?`,
            message: 'The collection will be removed. The images inside it stay in your library.',
            confirmLabel: 'Delete collection', danger: true,
          });
          if (!ok) return;
        }
        CollectionManager.remove(c.id);
        if (openId === c.id) closeDetail();
      },
    }));

    card.append(el('div', { class: 'collection-card__body' }, [
      el('h3', { class: 'collection-card__title', text: c.name }),
      el('p', { class: 'collection-card__meta', text: `${pluralise(count, 'image')} · created ${formatDate(c.createdAt)}` }),
      actions,
    ]));
    host.append(card);
  });
}

async function addImages(id) {
  const collection = CollectionManager.get(id);
  if (!collection) return;
  const chosen = await imagePickerDialog({
    title: `Add images to “${collection.name}”`,
    images: ImageRepository.all(),
    selected: collection.images,
    confirmLabel: 'Save selection',
  });
  if (chosen === null) return;
  AppState.collections = CollectionManager.all().map((c) => (c.id === id ? { ...c, images: chosen } : c));
  if (openId === id) renderDetail();
}

function openDetail(id) {
  openId = id;
  $('[data-detail]').classList.remove('hide');
  renderDetail();
  $('[data-detail]').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDetail() {
  openId = null;
  $('[data-detail]').classList.add('hide');
}

function renderDetail() {
  const collection = CollectionManager.get(openId);
  if (!collection) { closeDetail(); return; }
  $('[data-detail-title]').textContent = collection.name;
  const images = CollectionManager.imagesOf(collection.id);

  if (!detailGallery) {
    detailGallery = new GalleryManager({
      container: $('[data-detail-gallery]'),
      empty: $('[data-detail-empty]'),
      layout: 'grid',
      onOpen: (imgId, list) => LightboxController.open(imgId, list),
      extraActions: (img) => [el('button', {
        class: 'icon-btn icon-btn--bordered', type: 'button',
        dataset: { tileAction: 'remove' },
        title: 'Remove from collection', 'aria-label': `Remove ${img.title} from this collection`,
        html: icon('x', { size: 15 }),
        onClick: (e) => {
          e.stopPropagation();
          CollectionManager.removeImage(openId, img.id);
          renderDetail();
        },
      })],
    });
  }
  detailGallery.render(images);
}

(async function init() {
  await bootApp({ page: 'collections', title: 'Collections' });
  $('[data-empty-icon]').innerHTML = icon('bookmark', { size: 26 });

  document.querySelectorAll('[data-new-collection]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = await promptDialog({
        title: 'New collection',
        description: 'Give it a name you will recognise — Travel 2026, Architecture, Inspiration…',
        label: 'Collection name', placeholder: 'Travel 2026', confirmLabel: 'Create',
      });
      if (name === null) return;
      const created = CollectionManager.create(name);
      if (created) openDetail(created.id);
    });
  });

  $('[data-detail-close]').addEventListener('click', closeDetail);
  $('[data-detail-add]').addEventListener('click', () => openId && addImages(openId));

  renderList();
  bus.on('collections:changed', () => { renderList(); if (openId) renderDetail(); });
  bus.on('repo:changed', () => { renderList(); if (openId) renderDetail(); });
})();
