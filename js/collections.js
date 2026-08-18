/**
 * MIREVA — custom collections
 * Create · rename · delete · add image · remove image, persisted locally.
 */

import { AppState, ImageRepository, bus } from './state.js';
import { Toast } from './notifications.js';
import { uid } from './utils.js';

const MAX_NAME = 48;

class Collections {
  all() { return AppState.collections; }
  get(id) { return this.all().find((c) => c.id === id) || null; }
  count() { return this.all().length; }

  /** Collections that contain a given image. */
  containing(imageId) { return this.all().filter((c) => c.images.includes(imageId)); }

  /** Resolve a collection's images to full image objects (skipping deleted ones). */
  imagesOf(id) {
    const c = this.get(id);
    return c ? ImageRepository.byIds(c.images) : [];
  }

  create(name, { silent = false } = {}) {
    const clean = String(name || '').trim().slice(0, MAX_NAME);
    if (!clean) { Toast.error('Give your collection a name first.'); return null; }
    if (this.all().some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      Toast.warn(`“${clean}” already exists.`);
      return null;
    }
    const collection = { id: uid('col'), name: clean, images: [], createdAt: Date.now() };
    AppState.collections = [collection, ...this.all()];
    if (!silent) Toast.success(`Collection “${clean}” created`);
    return collection;
  }

  rename(id, name) {
    const clean = String(name || '').trim().slice(0, MAX_NAME);
    if (!clean) { Toast.error('A collection needs a name.'); return false; }
    const exists = this.all().some((c) => c.id !== id && c.name.toLowerCase() === clean.toLowerCase());
    if (exists) { Toast.warn(`“${clean}” already exists.`); return false; }
    AppState.collections = this.all().map((c) => (c.id === id ? { ...c, name: clean } : c));
    Toast.success('Collection renamed');
    return true;
  }

  remove(id) {
    const c = this.get(id);
    if (!c) { Toast.error('That collection no longer exists.'); return false; }
    AppState.collections = this.all().filter((x) => x.id !== id);
    Toast.info(`“${c.name}” deleted`);
    return true;
  }

  addImage(collectionId, imageId, { silent = false } = {}) {
    const c = this.get(collectionId);
    if (!c) { Toast.error('That collection no longer exists.'); return false; }
    if (c.images.includes(imageId)) { if (!silent) Toast.info(`Already in “${c.name}”`); return false; }
    AppState.collections = this.all().map((x) =>
      (x.id === collectionId ? { ...x, images: [imageId, ...x.images] } : x));
    if (!silent) Toast.success(`Added to “${c.name}”`);
    return true;
  }

  removeImage(collectionId, imageId, { silent = false } = {}) {
    const c = this.get(collectionId);
    if (!c) return false;
    AppState.collections = this.all().map((x) =>
      (x.id === collectionId ? { ...x, images: x.images.filter((i) => i !== imageId) } : x));
    if (!silent) Toast.info(`Removed from “${c.name}”`);
    return true;
  }

  toggleImage(collectionId, imageId) {
    const c = this.get(collectionId);
    if (!c) return false;
    return c.images.includes(imageId)
      ? (this.removeImage(collectionId, imageId, { silent: true }), false)
      : (this.addImage(collectionId, imageId, { silent: true }), true);
  }

  onChange(fn) { return bus.on('collections:changed', fn); }
}

export const CollectionManager = new Collections();
