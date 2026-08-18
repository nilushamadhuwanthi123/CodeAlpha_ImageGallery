/**
 * MIREVA — settings page controller
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { el, formatBytes, pluralise } from '../utils.js';
import { AppState, ImageRepository, bus } from '../state.js';
import { ThemeManager } from '../theme.js';
import { StorageService, ImageStore } from '../storage.js';
import { renderLayoutSwitcher } from '../gallery.js';
import { OnboardingFlow, INTERESTS } from '../onboarding.js';
import { Toast } from '../notifications.js';
import { confirmDialog } from '../dialogs.js';

const $ = (s) => document.querySelector(s);

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function renderThemeChoices() {
  const host = $('[data-theme-choices]');
  host.innerHTML = '';
  THEMES.forEach((t) => {
    const btn = el('button', {
      class: `theme-choice theme-choice--${t.value}`, type: 'button',
      'aria-pressed': String(ThemeManager.mode === t.value),
    }, [
      el('span', { class: 'theme-choice__preview' }, [el('span', { class: 'bar' }), el('span', {})]),
      el('span', { text: t.label }),
    ]);
    btn.addEventListener('click', () => {
      ThemeManager.apply(t.value);
      renderThemeChoices();
      Toast.success(`Theme set to ${t.label.toLowerCase()}`);
    });
    host.append(btn);
  });
}

function renderInterests() {
  const host = $('[data-interests]');
  const selected = new Set(AppState.preferences.interests || []);
  host.innerHTML = '';
  INTERESTS.forEach((name) => {
    const btn = el('button', {
      class: 'taste-chip', type: 'button', 'aria-pressed': String(selected.has(name)),
    }, [el('span', { class: 'taste-chip__dot' }), el('span', { text: name })]);
    btn.addEventListener('click', () => {
      selected.has(name) ? selected.delete(name) : selected.add(name);
      btn.setAttribute('aria-pressed', String(selected.has(name)));
      AppState.preferences = { interests: [...selected] };
    });
    host.append(btn);
  });
}

function bindToggles() {
  document.querySelectorAll('[data-setting]').forEach((input) => {
    const key = input.dataset.setting;
    input.checked = Boolean(AppState.preferences[key]);
    input.addEventListener('change', () => {
      AppState.preferences = { [key]: input.checked };
      ThemeManager.applyMotionPreferences();
      Toast.success('Settings updated');
    });
  });

  const quality = $('#quality-select');
  quality.value = AppState.preferences.imageQuality || 'standard';
  quality.addEventListener('change', () => {
    AppState.preferences = { imageQuality: quality.value };
    Toast.success('Settings updated');
  });
}

async function renderStorage() {
  const localBytes = StorageService.usage();
  const dbBytes = await ImageStore.usage();
  const count = ImageRepository.uploads.length;
  const total = localBytes + dbBytes;
  const softCap = 60 * 1024 * 1024; // display reference only

  $('[data-storage-label]').textContent = formatBytes(total);
  $('[data-storage-bar]').style.width = `${Math.min(100, (total / softCap) * 100).toFixed(1)}%`;
  $('[data-storage-detail]').textContent =
    `${formatBytes(dbBytes)} of uploaded images (${pluralise(count, 'file')}) in IndexedDB · ${formatBytes(localBytes)} of preferences in localStorage.`;

  const hidden = AppState.hidden.length;
  $('[data-hidden-count]').textContent = hidden
    ? `${pluralise(hidden, 'image')} hidden from the gallery.`
    : 'None hidden.';
  $('[data-restore-hidden]').disabled = hidden === 0;
}

(async function init() {
  await bootApp({ page: 'settings', title: 'Settings' });

  renderThemeChoices();
  renderInterests();
  bindToggles();
  renderStorage();

  renderLayoutSwitcher($('[data-layout-switcher]'), AppState.layout, (layout) => {
    AppState.layout = layout;
    Toast.success(`Default layout set to ${layout}`);
  });

  $('[data-restore-hidden]').addEventListener('click', () => {
    ImageRepository.restoreAll();
    Toast.success('Hidden images restored');
    renderStorage();
  });

  $('[data-replay-onboarding]').addEventListener('click', () => OnboardingFlow.show({ replay: true }));

  $('[data-reset-state]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Clear favourites, collections and history?',
      message: 'Your uploaded images are kept. Preferences and theme are kept.',
      confirmLabel: 'Clear data', danger: true,
    });
    if (!ok) return;
    AppState.favorites = [];
    AppState.collections = [];
    AppState.clearRecent();
    AppState.hidden = [];
    Toast.success('Local data cleared');
    renderStorage();
  });

  $('[data-reset-all]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete all MIREVA data?',
      message: 'Every uploaded image, favourite, collection and preference on this device will be removed. This cannot be undone.',
      confirmLabel: 'Delete everything', danger: true,
    });
    if (!ok) return;
    try {
      await ImageStore.clear();
      StorageService.clearAll();
      Toast.success('All local data deleted');
      setTimeout(() => window.location.reload(), 900);
    } catch {
      Toast.error('Some data could not be removed. Try clearing site data from your browser settings.');
    }
  });

  bus.on('repo:changed', renderStorage);
  bus.on('prefs:changed', () => ThemeManager.applyMotionPreferences());
})();
