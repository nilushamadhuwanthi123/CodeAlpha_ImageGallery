/**
 * MIREVA — application shell
 * Builds the navigation chrome shared by every page, boots the theme,
 * onboarding, command centre, offline detection and the service worker.
 *
 * Every page calls:  await bootApp({ page: 'gallery', title: 'Gallery' })
 */

import { icon } from './icons.js';
import { el, assetUrl, debounce } from './utils.js';
import { AppState, ImageRepository, bus } from './state.js';
import { ThemeManager } from './theme.js';
import { CommandCenter } from './command-center.js';
import { OnboardingFlow } from './onboarding.js';
import { initAccessibility } from './accessibility.js';
import { Toast } from './notifications.js';

export const PRIMARY_NAV = [
  { id: 'home', label: 'Home', href: 'index.html', icon: 'home' },
  { id: 'gallery', label: 'Gallery', href: 'pages/gallery.html', icon: 'images' },
  { id: 'favorites', label: 'Favourites', href: 'pages/favorites.html', icon: 'heart', count: 'favorites' },
  { id: 'collections', label: 'Collections', href: 'pages/collections.html', icon: 'bookmark', count: 'collections' },
  { id: 'recent', label: 'Recently Viewed', href: 'pages/recently-viewed.html', icon: 'clock', count: 'recent' },
];

export const SECONDARY_NAV = [
  { id: 'upload', label: 'Upload', href: 'pages/upload.html', icon: 'upload' },
  { id: 'presentation', label: 'Presentation', href: 'pages/presentation.html', icon: 'play' },
  { id: 'settings', label: 'Settings', href: 'pages/settings.html', icon: 'settings' },
];

const MOBILE_NAV = [
  PRIMARY_NAV[0], PRIMARY_NAV[1], PRIMARY_NAV[2], PRIMARY_NAV[3],
  { id: 'more', label: 'More', href: '#', icon: 'menu', drawer: true },
];

/* ------------------------------ shell ------------------------------ */

function navLink(item, current) {
  const isCurrent = item.id === current;
  const link = el('a', {
    class: 'nav__link',
    href: item.drawer ? '#' : assetUrl(item.href),
    'aria-current': isCurrent ? 'page' : null,
    html: `${icon(item.icon, { size: 18 })}<span>${item.label}</span>`,
  });
  if (item.count) link.append(el('span', { class: 'nav__count', dataset: { count: item.count }, text: '0' }));
  return link;
}

function buildSidebar(current) {
  const aside = el('aside', { class: 'sidebar', 'aria-label': 'Primary' });

  aside.append(el('a', { class: 'brand', href: assetUrl('index.html'), 'aria-label': 'MIREVA home' }, [
    el('span', { class: 'brand__mark', text: 'M' }),
    el('span', {}, [
      el('span', { class: 'brand__name', text: 'MIREVA' }),
      el('span', { class: 'brand__tag', text: 'Visual workspace' }),
    ]),
  ]));

  const nav = el('nav', { class: 'nav' });
  const primary = el('div', { class: 'nav__group' }, [el('p', { class: 'nav__label', text: 'Library' })]);
  PRIMARY_NAV.forEach((i) => primary.append(navLink(i, current)));
  const secondary = el('div', { class: 'nav__group' }, [el('p', { class: 'nav__label', text: 'Workspace' })]);
  SECONDARY_NAV.forEach((i) => secondary.append(navLink(i, current)));
  nav.append(primary, secondary);

  aside.append(nav, el('div', { class: 'sidebar__foot' }, [
    el('button', {
      class: 'sidebar__hint', type: 'button', 'data-open-command': '',
      html: `<span>Command centre</span><span class="row" style="gap:3px"><span class="kbd">Ctrl</span><span class="kbd">K</span></span>`,
    }),
  ]));

  return aside;
}

function buildTopbar(current, title) {
  const bar = el('header', { class: 'topbar' });

  bar.append(el('a', { class: 'topbar__brand', href: assetUrl('index.html'), 'aria-label': 'MIREVA home' }, [
    el('span', { class: 'brand__mark', style: 'width:32px;height:32px;font-size:1rem', text: 'M' }),
    el('span', { class: 'topbar__title', text: title || 'MIREVA' }),
  ]));

  bar.append(el('div', { class: 'topbar__spacer' }));

  bar.append(el('button', {
    class: 'cmd-trigger', type: 'button', 'data-open-command': '', 'aria-label': 'Open command centre',
    html: `${icon('search', { size: 15 })}<span>Search commands</span><span class="row" style="gap:3px"><span class="kbd">Ctrl</span><span class="kbd">K</span></span>`,
  }));

  const actions = el('div', { class: 'topbar__actions' });
  actions.append(el('button', {
    class: 'icon-btn', type: 'button', id: 'theme-toggle',
    'aria-label': 'Toggle colour theme', title: 'Toggle theme (light / dark)',
    html: icon(ThemeManager.resolved === 'dark' ? 'sun' : 'moon'),
    onClick: () => {
      const resolved = ThemeManager.toggle();
      Toast.info(resolved === 'dark' ? 'Dark mode on' : 'Light mode on');
    },
  }));
  actions.append(el('a', {
    class: 'icon-btn', href: assetUrl('pages/upload.html'),
    'aria-label': 'Upload images', title: 'Upload images', html: icon('upload'),
  }));
  bar.append(actions);
  return bar;
}

function buildBottomNav(current) {
  const nav = el('nav', { class: 'bottom-nav', 'aria-label': 'Primary' });
  MOBILE_NAV.forEach((item) => {
    const node = item.drawer
      ? el('button', {
          class: 'bottom-nav__item', type: 'button', 'aria-haspopup': 'dialog',
          html: `${icon(item.icon, { size: 21 })}<span>${item.label}</span>`,
          onClick: () => openDrawer(current),
        })
      : el('a', {
          class: 'bottom-nav__item',
          href: assetUrl(item.href),
          'aria-current': item.id === current ? 'page' : null,
          html: `${icon(item.icon, { size: 21 })}<span>${item.label}</span>`,
        });
    nav.append(node);
  });
  return nav;
}

let drawerEl = null;
function openDrawer(current) {
  if (!drawerEl) {
    drawerEl = el('div', { class: 'drawer' });
    const scrim = el('div', { class: 'drawer__scrim' });
    const panel = el('div', { class: 'drawer__panel', role: 'dialog', 'aria-label': 'More' });
    panel.append(el('div', { class: 'drawer__handle' }));

    const group = el('div', { class: 'nav__group' }, [el('p', { class: 'nav__label', text: 'Workspace' })]);
    [...SECONDARY_NAV, PRIMARY_NAV[4]].forEach((i) => group.append(navLink(i, current)));
    panel.append(group);

    panel.append(el('button', {
      class: 'nav__link', type: 'button', style: 'width:100%;text-align:left',
      html: `${icon('command', { size: 18 })}<span>Command centre</span>`,
      onClick: () => { closeDrawer(); CommandCenter.open(); },
    }));
    panel.append(el('button', {
      class: 'btn btn--soft btn--block', type: 'button', style: 'margin-top:var(--sp-4)',
      text: 'Close', onClick: () => closeDrawer(),
    }));

    scrim.addEventListener('click', closeDrawer);
    drawerEl.append(scrim, panel);
    document.body.append(drawerEl);
  }
  requestAnimationFrame(() => drawerEl.classList.add('is-open'));
}
function closeDrawer() { drawerEl?.classList.remove('is-open'); }

/* ------------------------------ counts ------------------------------ */
export function refreshNavCounts() {
  const stats = AppState.stats();
  document.querySelectorAll('[data-count]').forEach((node) => {
    const v = stats[node.dataset.count] ?? 0;
    node.textContent = String(v);
    node.classList.toggle('hide', v === 0);
  });
}

/* ------------------------------ offline ------------------------------ */
function initOffline() {
  const banner = el('div', { class: 'offline-banner', role: 'status' }, []);
  banner.innerHTML = `${icon('wifiOff', { size: 16 })}<span><strong>Offline Mode</strong> — your local gallery preferences remain available.</span>`;
  document.body.append(banner);
  const sync = () => banner.classList.toggle('is-visible', !navigator.onLine);
  window.addEventListener('online', () => { sync(); Toast.success('Back online'); });
  window.addEventListener('offline', sync);
  sync();
}

/* ------------------------------ shortcuts ------------------------------ */
function initShortcuts() {
  let pendingG = false;
  const map = {
    h: 'index.html', g: 'pages/gallery.html', f: 'pages/favorites.html',
    c: 'pages/collections.html', r: 'pages/recently-viewed.html',
    u: 'pages/upload.html', p: 'pages/presentation.html', s: 'pages/settings.html',
  };
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.lightbox.is-open')) return;

    if (pendingG && map[e.key.toLowerCase()]) {
      e.preventDefault();
      pendingG = false;
      window.location.href = assetUrl(map[e.key.toLowerCase()]);
      return;
    }
    pendingG = e.key.toLowerCase() === 'g';
    if (pendingG) setTimeout(() => { pendingG = false; }, 1200);
  });
}

/* ------------------------------ service worker ------------------------------ */
async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return; // SW requires http(s)
  try {
    await navigator.serviceWorker.register(assetUrl('sw.js'), { scope: assetUrl('') || './' });
  } catch (err) {
    console.info('[MIREVA] service worker not registered:', err.message);
  }
}

/* ------------------------------ boot ------------------------------ */
/**
 * @param {{page:string, title?:string, skipOnboarding?:boolean}} options
 */
export async function bootApp({ page, title, skipOnboarding = false } = {}) {
  ThemeManager.init();
  initAccessibility();

  const app = document.querySelector('.app');
  const body = document.querySelector('.app__body');
  if (app && body) {
    app.insertBefore(buildSidebar(page), body);
    body.insertBefore(buildTopbar(page, title), body.firstChild);
    document.body.append(buildBottomNav(page));
  }

  CommandCenter.init();
  initOffline();
  initShortcuts();

  bus.on('theme:changed', ({ resolved }) => {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon');
  });

  await ImageRepository.init();
  refreshNavCounts();
  const refresh = debounce(refreshNavCounts, 60);
  ['favorites:changed', 'collections:changed', 'recent:changed', 'repo:changed'].forEach((evt) => bus.on(evt, refresh));

  if (!skipOnboarding) OnboardingFlow.maybeShow();
  initServiceWorker();

  document.documentElement.dataset.booted = 'true';
  return { page };
}

export { OnboardingFlow, CommandCenter, ThemeManager };
