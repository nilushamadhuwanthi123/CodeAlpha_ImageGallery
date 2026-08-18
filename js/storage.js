/**
 * MIREVA — persistence layer
 *
 *  StorageService  → lightweight JSON state in localStorage (settings, favourites, …)
 *  ImageStore      → user-uploaded binary image data in IndexedDB
 *
 * Everything degrades gracefully: if storage is unavailable (private mode,
 * quota exceeded, disabled cookies) the app still runs in memory for the
 * current session and reports the problem through the toast system.
 */

export const KEYS = {
  theme: 'mireva_theme',
  onboarding: 'mireva_onboarding_complete',
  preferences: 'mireva_preferences',
  favorites: 'mireva_favorites',
  recentlyViewed: 'mireva_recently_viewed',
  filters: 'mireva_filters',
  layout: 'mireva_layout',
  collections: 'mireva_collections',
  views: 'mireva_view_counts',
  hidden: 'mireva_hidden_images',
  uploadsMeta: 'mireva_uploads_meta',
};

export const DEFAULT_PREFERENCES = {
  interests: [],
  reduceMotion: false,
  animations: true,
  imageQuality: 'standard',
  confirmDestructive: true,
  sort: 'newest',
};

class StorageServiceImpl {
  constructor() {
    this.available = this.#probe();
    this.memory = new Map();
    this.listeners = new Set();
  }

  #probe() {
    try {
      const k = '__mireva_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  /** Read a JSON value, falling back to `fallback` on any problem. */
  get(key, fallback = null) {
    try {
      if (!this.available) return this.memory.has(key) ? this.memory.get(key) : fallback;
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /** Write a JSON value. Returns false when persistence failed. */
  set(key, value) {
    this.memory.set(key, value);
    try {
      if (!this.available) return false;
      window.localStorage.setItem(key, JSON.stringify(value));
      this.#emit(key, value);
      return true;
    } catch (err) {
      this.#emit(key, value);
      document.dispatchEvent(new CustomEvent('mireva:storage-error', {
        detail: { key, message: 'Local storage is full or unavailable.' },
      }));
      return false;
    }
  }

  remove(key) {
    this.memory.delete(key);
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    this.#emit(key, null);
  }

  /** Clear every MIREVA key (used by Settings → reset). */
  clearAll() {
    Object.values(KEYS).forEach((k) => this.remove(k));
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit(key, value) { this.listeners.forEach((fn) => { try { fn(key, value); } catch { /* ignore */ } }); }

  /** Approximate bytes used by MIREVA's localStorage keys. */
  usage() {
    let bytes = 0;
    try {
      Object.values(KEYS).forEach((k) => {
        const raw = window.localStorage.getItem(k);
        if (raw) bytes += raw.length * 2;
      });
    } catch { /* ignore */ }
    return bytes;
  }
}

export const StorageService = new StorageServiceImpl();

/* ============================================================
   IndexedDB — uploaded images
   ============================================================ */

const DB_NAME = 'mireva-db';
const DB_VERSION = 1;
const STORE = 'images';

class ImageStoreImpl {
  #dbPromise = null;

  get supported() { return typeof indexedDB !== 'undefined'; }

  #open() {
    if (this.#dbPromise) return this.#dbPromise;
    this.#dbPromise = new Promise((resolve, reject) => {
      if (!this.supported) { reject(new Error('IndexedDB is not available in this browser.')); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('dateAdded', 'dateAdded');
          store.createIndex('category', 'category');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Could not open the local image database.'));
    });
    return this.#dbPromise;
  }

  async #tx(mode, fn) {
    const db = await this.#open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try { result = fn(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
      tx.onerror = () => reject(tx.error || new Error('Image database transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('Image database transaction aborted.'));
    });
  }

  async getAll() {
    try { return (await this.#tx('readonly', (s) => s.getAll())) || []; }
    catch { return []; }
  }

  async get(id) {
    try { return await this.#tx('readonly', (s) => s.get(id)); }
    catch { return null; }
  }

  async put(record) { return this.#tx('readwrite', (s) => s.put(record)); }

  async putMany(records) {
    return this.#tx('readwrite', (s) => { records.forEach((r) => s.put(r)); return true; });
  }

  async delete(id) { return this.#tx('readwrite', (s) => s.delete(id)); }

  async clear() { return this.#tx('readwrite', (s) => s.clear()); }

  async count() {
    try { return (await this.#tx('readonly', (s) => s.count())) || 0; }
    catch { return 0; }
  }

  /** Total stored bytes (blob sizes) — used by the Settings storage meter. */
  async usage() {
    const all = await this.getAll();
    return all.reduce((sum, r) => sum + (r.blob?.size || r.size || 0), 0);
  }
}

export const ImageStore = new ImageStoreImpl();
