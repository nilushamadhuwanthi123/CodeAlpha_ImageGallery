/**
 * MIREVA — theme manager
 * Light · Dark · System, persisted in localStorage and applied before paint
 * (see the inline bootstrap in every page <head>) to avoid a flash.
 */

import { StorageService, KEYS } from './storage.js';
import { bus, AppState } from './state.js';

const VALID = ['light', 'dark', 'system'];

class Theme {
  #media = window.matchMedia('(prefers-color-scheme: dark)');

  init() {
    this.apply(this.mode, { silent: true });
    this.#media.addEventListener('change', () => {
      if (this.mode === 'system') this.apply('system', { silent: true });
    });
    this.applyMotionPreferences();
    bus.on('prefs:changed', () => this.applyMotionPreferences());
  }

  get mode() {
    const stored = StorageService.get(KEYS.theme, 'system');
    return VALID.includes(stored) ? stored : 'system';
  }

  /** The theme actually rendered right now ('light' | 'dark'). */
  get resolved() {
    const m = this.mode;
    return m === 'system' ? (this.#media.matches ? 'dark' : 'light') : m;
  }

  apply(mode, { silent = false } = {}) {
    const next = VALID.includes(mode) ? mode : 'system';
    StorageService.set(KEYS.theme, next);
    const resolved = next === 'system' ? (this.#media.matches ? 'dark' : 'light') : next;

    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themeMode = next;
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#171216' : '#FFF9F3');

    if (!silent) {
      document.body.classList.add('theme-fading');
      setTimeout(() => document.body.classList.remove('theme-fading'), 420);
    }
    bus.emit('theme:changed', { mode: next, resolved });
    return resolved;
  }

  toggle() {
    return this.apply(this.resolved === 'dark' ? 'light' : 'dark');
  }

  /** Mirror the user's motion / animation settings onto <html>. */
  applyMotionPreferences() {
    const { reduceMotion, animations } = AppState.preferences;
    document.documentElement.dataset.reduceMotion = String(Boolean(reduceMotion));
    document.documentElement.dataset.animations = animations === false ? 'off' : 'on';
  }
}

export const ThemeManager = new Theme();
