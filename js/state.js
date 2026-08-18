/**
 * MIREVA — application state & image repository
 *
 * A single source of truth shared by every page:
 *   • the built-in curated library (static, shipped with the app)
 *   • user-uploaded images (IndexedDB blobs → object URLs)
 *   • favourites, view counts, recently-viewed and hidden images
 *
 * Modules never touch localStorage for image data directly; they go through
 * this repository so that one change notifies the whole UI.
 */

import { SEED_LIBRARY, CATEGORIES } from './library.js';
import { StorageService, ImageStore, KEYS, DEFAULT_PREFERENCES } from './storage.js';
import { assetUrl, orientationOf, uid } from './utils.js';

const RECENT_LIMIT = 24;

/* ------------------------------ Event bus ------------------------------ */
class EventBus {
  #map = new Map();
  on(type, fn) {
    if (!this.#map.has(type)) this.#map.set(type, new Set());
    this.#map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this.#map.get(type)?.delete(fn); }
  emit(type, detail) {
    this.#map.get(type)?.forEach((fn) => { try { fn(detail); } catch (e) { console.warn('[MIREVA] listener failed', e); } });
    this.#map.get('*')?.forEach((fn) => { try { fn(type, detail); } catch { /* ignore */ } });
  }
}

export const bus = new EventBus();
export { CATEGORIES };

/* ------------------------------ Repository ------------------------------ */
class Repository {
  constructor() {
    this.uploads = [];
    this.objectUrls = new Map();
    this.ready = false;
  }

  /** Normalise the shipped library once — resolving paths for nested pages. */
  get library() {
    return SEED_LIBRARY.map((img) => ({
      ...img,
      src: assetUrl(img.src),
      thumb: assetUrl(img.thumb),
      source: 'library',
      size: null,
    }));
  }

  async init() {
    if (this.ready) return this;
    try {
      const records = await ImageStore.getAll();
      this.uploads = records.map((r) => this.#hydrate(r)).filter(Boolean);
    } catch (err) {
      console.warn('[MIREVA] uploaded images could not be read', err);
      this.uploads = [];
    }
    this.ready = true;
    bus.emit('repo:ready');
    return this;
  }

  #hydrate(record) {
    try {
      let url = this.objectUrls.get(record.id);
      if (!url) {
        url = record.blob ? URL.createObjectURL(record.blob) : record.dataUrl;
        if (!url) return null;
        this.objectUrls.set(record.id, url);
      }
      return {
        id: record.id,
        title: record.title || 'Untitled Image',
        category: record.category || 'Photography',
        tags: Array.isArray(record.tags) ? record.tags : [],
        description: record.description || '',
        src: url,
        thumb: url,
        width: record.width || null,
        height: record.height || null,
        orientation: record.orientation || orientationOf(record.width, record.height),
        type: record.type || 'image/*',
        dateAdded: record.dateAdded,
        size: record.size ?? record.blob?.size ?? null,
        fileName: record.fileName || null,
        source: 'upload',
      };
    } catch (err) {
      console.warn('[MIREVA] could not hydrate an uploaded image', err);
      return null;
    }
  }

  /** Every visible image, newest uploads first, hidden entries removed. */
  all() {
    const hidden = new Set(AppState.hidden);
    return [...this.uploads, ...this.library].filter((img) => !hidden.has(img.id));
  }

  allIncludingHidden() { return [...this.uploads, ...this.library]; }

  byId(id) { return this.allIncludingHidden().find((i) => i.id === id) || null; }

  byIds(ids = []) {
    const map = new Map(this.allIncludingHidden().map((i) => [i.id, i]));
    return ids.map((id) => map.get(id)).filter(Boolean);
  }

  /** Persist a new uploaded image. `blob` is required. */
  async addUpload({ blob, fileName, title, category, tags, description, width, height, type }) {
    const record = {
      id: uid('up'),
      blob,
      fileName,
      title: title || fileName?.replace(/\.[^.]+$/, '') || 'Untitled Image',
      category: category || 'Photography',
      tags: tags || [],
      description: description || '',
      width, height,
      orientation: orientationOf(width, height),
      type: type || blob.type || 'image/*',
      size: blob.size,
      dateAdded: new Date().toISOString(),
    };
    await ImageStore.put(record);
    const hydrated = this.#hydrate(record);
    if (hydrated) this.uploads.unshift(hydrated);
    bus.emit('repo:changed', { reason: 'add', id: record.id });
    return hydrated;
  }

  /** Update editable metadata on an uploaded image. */
  async updateUpload(id, patch) {
    const record = await ImageStore.get(id);
    if (!record) throw new Error('That image is no longer in your library.');
    const next = { ...record, ...patch, id };
    if (patch.width || patch.height) next.orientation = orientationOf(next.width, next.height);
    await ImageStore.put(next);
    if (patch.blob) {
      const old = this.objectUrls.get(id);
      if (old) URL.revokeObjectURL(old);
      this.objectUrls.delete(id);
      next.size = patch.blob.size;
    }
    const hydrated = this.#hydrate(next);
    const idx = this.uploads.findIndex((u) => u.id === id);
    if (idx > -1 && hydrated) this.uploads[idx] = hydrated;
    bus.emit('repo:changed', { reason: 'update', id });
    return hydrated;
  }

  async deleteUpload(id) {
    await ImageStore.delete(id);
    const url = this.objectUrls.get(id);
    if (url) { URL.revokeObjectURL(url); this.objectUrls.delete(id); }
    this.uploads = this.uploads.filter((u) => u.id !== id);
    AppState.removeEverywhere(id);
    bus.emit('repo:changed', { reason: 'delete', id });
  }

  /** Library images cannot be deleted, but they can be hidden and restored. */
  hide(id) {
    const set = new Set(AppState.hidden);
    set.add(id);
    AppState.hidden = [...set];
    bus.emit('repo:changed', { reason: 'hide', id });
  }

  restore(id) {
    AppState.hidden = AppState.hidden.filter((x) => x !== id);
    bus.emit('repo:changed', { reason: 'restore', id });
  }

  restoreAll() {
    AppState.hidden = [];
    bus.emit('repo:changed', { reason: 'restore-all' });
  }
}

export const ImageRepository = new Repository();

/* ------------------------------ App state ------------------------------ */
class State {
  /* ---- preferences ---- */
  get preferences() {
    return { ...DEFAULT_PREFERENCES, ...(StorageService.get(KEYS.preferences, {}) || {}) };
  }
  set preferences(value) {
    StorageService.set(KEYS.preferences, { ...this.preferences, ...value });
    bus.emit('prefs:changed', this.preferences);
  }

  /* ---- favourites ---- */
  get favorites() { return StorageService.get(KEYS.favorites, []) || []; }
  set favorites(ids) {
    StorageService.set(KEYS.favorites, ids);
    bus.emit('favorites:changed', ids);
  }
  isFavorite(id) { return this.favorites.includes(id); }
  toggleFavorite(id) {
    const list = this.favorites;
    const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
    this.favorites = next;
    return next.includes(id);
  }

  /* ---- recently viewed ---- */
  get recent() { return StorageService.get(KEYS.recentlyViewed, []) || []; }
  set recent(entries) {
    StorageService.set(KEYS.recentlyViewed, entries);
    bus.emit('recent:changed', entries);
  }
  pushRecent(id) {
    const entries = this.recent.filter((e) => e.id !== id);
    entries.unshift({ id, ts: Date.now() });
    this.recent = entries.slice(0, RECENT_LIMIT);
    this.countView(id);
  }
  removeRecent(id) { this.recent = this.recent.filter((e) => e.id !== id); }
  clearRecent() { this.recent = []; }

  /* ---- view counts (personal, never global) ---- */
  get views() { return StorageService.get(KEYS.views, {}) || {}; }
  countView(id) {
    const v = this.views;
    v[id] = (v[id] || 0) + 1;
    StorageService.set(KEYS.views, v);
    bus.emit('views:changed', v);
  }
  viewsFor(id) { return this.views[id] || 0; }

  /* ---- hidden library images ---- */
  get hidden() { return StorageService.get(KEYS.hidden, []) || []; }
  set hidden(ids) { StorageService.set(KEYS.hidden, ids); }

  /* ---- layout & filters ---- */
  get layout() { return StorageService.get(KEYS.layout, 'masonry'); }
  set layout(v) { StorageService.set(KEYS.layout, v); bus.emit('layout:changed', v); }

  get filters() {
    return {
      category: 'All', orientation: 'any', aspect: 'any',
      favoritesOnly: false, recentOnly: false, query: '', sort: this.preferences.sort,
      ...(StorageService.get(KEYS.filters, {}) || {}),
    };
  }
  set filters(v) { StorageService.set(KEYS.filters, v); bus.emit('filters:changed', v); }

  /* ---- collections ---- */
  get collections() { return StorageService.get(KEYS.collections, []) || []; }
  set collections(v) { StorageService.set(KEYS.collections, v); bus.emit('collections:changed', v); }

  /** Remove an id from favourites, recents, views and every collection. */
  removeEverywhere(id) {
    this.favorites = this.favorites.filter((x) => x !== id);
    this.recent = this.recent.filter((e) => e.id !== id);
    const v = this.views; delete v[id]; StorageService.set(KEYS.views, v);
    this.collections = this.collections.map((c) => ({ ...c, images: c.images.filter((x) => x !== id) }));
  }

  /** Aggregate counters used by the dashboard and navigation. */
  stats() {
    const all = ImageRepository.all();
    return {
      total: all.length,
      uploads: ImageRepository.uploads.length,
      favorites: this.favorites.filter((id) => ImageRepository.byId(id)).length,
      collections: this.collections.length,
      recent: this.recent.filter((e) => ImageRepository.byId(e.id)).length,
    };
  }
}

export const AppState = new State();
