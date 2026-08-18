/**
 * MIREVA — dashboard page controller
 * Builds the editorial hero, real (never invented) statistics, quick actions,
 * a featured strip driven by the user's chosen interests, and recent history.
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { el, greeting, relativeTime, pluralise } from '../utils.js';
import { AppState, ImageRepository, bus } from '../state.js';
import { LightboxController } from '../lightbox.js';
import { FavoritesManager } from '../favorites.js';
import { CollectionManager } from '../collections.js';

const $ = (sel) => document.querySelector(sel);

const QUICK_ACTIONS = [
  { icon: 'images', title: 'Explore Gallery', desc: 'Masonry, grid and focus layouts', href: 'pages/gallery.html', keys: 'G G' },
  { icon: 'upload', title: 'Upload Image', desc: 'Drag & drop your own photographs', href: 'pages/upload.html', keys: 'G U' },
  { icon: 'heart', title: 'Favourites', desc: 'Everything you have hearted', href: 'pages/favorites.html', keys: 'G F' },
  { icon: 'bookmark', title: 'Collections', desc: 'Build your own image sets', href: 'pages/collections.html', keys: 'G C' },
  { icon: 'clock', title: 'Recently Viewed', desc: 'Pick up where you left off', href: 'pages/recently-viewed.html', keys: 'G R' },
  { icon: 'play', title: 'Presentation Mode', desc: 'Full-screen cinematic slideshow', href: 'pages/presentation.html', keys: 'G P' },
];

const COLLAGE_LABELS = ["Editor's pick", 'New collection', 'Your favourites', 'Recently viewed'];

function renderGreeting() {
  const node = document.querySelector('[data-greeting]');
  if (node) node.textContent = greeting();
}

function renderHeroMeta() {
  const host = document.querySelector('[data-hero-meta]');
  if (!host) return;
  const stats = AppState.stats();
  host.innerHTML = '';
  [
    ['Images', stats.total],
    ['Categories', 8],
    ['Favourites', stats.favorites],
  ].forEach(([dt, dd]) => {
    host.append(el('div', {}, [el('dt', { text: dt }), el('dd', { text: String(dd) })]));
  });
}

function renderCollage() {
  const host = document.querySelector('[data-collage]');
  if (!host) return;
  const all = ImageRepository.all();
  const favourites = FavoritesManager.list();
  const recent = ImageRepository.byIds(AppState.recent.map((r) => r.id));

  // Pick four visually distinct images — different categories wherever possible.
  const picks = [];
  const usedCategories = new Set();
  const push = (img, unique = true) => {
    if (!img) return;
    if (picks.some((p) => p.id === img.id)) return;
    if (unique && usedCategories.has(img.category)) return;
    picks.push(img);
    usedCategories.add(img.category);
  };
  const interests = AppState.preferences.interests || [];
  const preferred = ['Abstract', 'Architecture', 'Travel', 'Art', 'Fashion', 'Photography', 'Nature', 'Technology'];
  const order = [...interests, ...preferred];

  push(all.find((i) => i.orientation === 'portrait' && order.includes(i.category)) || all.find((i) => i.orientation === 'portrait'));
  order.forEach((cat) => { if (picks.length < 4) push(all.find((i) => i.category === cat)); });
  push(favourites[0], false);
  push(recent[0], false);
  all.forEach((i) => push(i, false));

  const classes = ['a', 'b', 'c', 'd'];
  host.innerHTML = '';
  picks.slice(0, 4).forEach((img, i) => {
    const item = el('figure', {
      class: `collage__item collage__item--${classes[i]}`,
      tabindex: '0', role: 'button',
      'aria-label': `Open ${img.title || 'Untitled Image'}`,
    }, [
      el('img', { src: img.thumb || img.src, alt: '', loading: i < 2 ? 'eager' : 'lazy', decoding: 'async' }),
      el('figcaption', { class: 'collage__label' }, [
        el('span', { class: 'eyebrow', text: COLLAGE_LABELS[i] }),
        el('strong', { text: img.title || 'Untitled Image' }),
      ]),
    ]);
    const open = () => { AppState.pushRecent(img.id); LightboxController.open(img.id, picks.slice(0, 4)); };
    item.addEventListener('click', open);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    host.append(item);
  });

  const chipA = el('div', { class: 'collage__chip collage__chip--tl float-slow', html: `${icon('sparkles', { size: 15 })}<span>${pluralise(ImageRepository.all().length, 'image')}</span>` });
  const chipB = el('div', { class: 'collage__chip collage__chip--br float-slow-alt', html: `${icon('palette', { size: 15 })}<span>8 categories</span>` });
  host.append(chipA, chipB);
}

function renderStats() {
  const host = document.querySelector('[data-stats]');
  if (!host) return;
  const s = AppState.stats();
  const cards = [
    { icon: 'images', label: 'Total images', value: s.total, hint: s.uploads ? `${s.uploads} uploaded by you` : 'From the MIREVA library' },
    { icon: 'heart', label: 'Favourites', value: s.favorites, hint: s.favorites ? 'Saved on this device' : 'Tap a heart to begin' },
    { icon: 'bookmark', label: 'Collections', value: s.collections, hint: s.collections ? 'Your own image sets' : 'Create your first set' },
    { icon: 'clock', label: 'Recently viewed', value: s.recent, hint: s.recent ? 'Private, local history' : 'Nothing opened yet' },
  ];
  host.innerHTML = '';
  cards.forEach((c) => {
    host.append(el('article', { class: 'stat' }, [
      el('span', { class: 'stat__icon', html: icon(c.icon, { size: 17 }) }),
      el('span', { class: 'stat__value', text: String(c.value) }),
      el('span', { class: 'stat__label', text: c.label }),
      el('span', { class: 'stat__hint', text: c.hint }),
    ]));
  });
}

function renderQuickActions() {
  const host = document.querySelector('[data-quick-actions]');
  if (!host) return;
  host.innerHTML = '';
  QUICK_ACTIONS.forEach((a) => {
    host.append(el('a', { class: 'action-card', href: a.href }, [
      el('span', { class: 'action-card__icon', html: icon(a.icon, { size: 20 }) }),
      el('span', { class: 'action-card__body' }, [
        el('strong', { text: a.title }),
        el('span', { text: a.desc }),
      ]),
      el('span', { class: 'kbd', text: a.keys }),
    ]));
  });
}

function renderFeatured() {
  const host = document.querySelector('[data-featured]');
  const eyebrow = document.querySelector('[data-featured-eyebrow]');
  if (!host) return;

  const interests = AppState.preferences.interests || [];
  const favourites = FavoritesManager.list();
  const all = ImageRepository.all();

  let source = [];
  let label = 'Featured collection';
  if (interests.length) {
    source = all.filter((i) => interests.includes(i.category));
    label = `Because you like ${interests.slice(0, 2).join(' & ')}`;
  }
  if (source.length < 6) source = [...source, ...favourites, ...all];
  if (!interests.length && favourites.length) label = 'From your favourites';

  const seen = new Set();
  const picks = source.filter((i) => (seen.has(i.id) ? false : seen.add(i.id))).slice(0, 10);
  if (eyebrow) eyebrow.textContent = label;

  host.innerHTML = '';
  if (!picks.length) {
    host.append(el('p', { class: 'muted', text: 'Your library is empty — upload an image to get started.' }));
    return;
  }
  picks.forEach((img) => {
    const card = el('figure', {
      class: 'strip__card', role: 'listitem', tabindex: '0',
      'aria-label': `Open ${img.title || 'Untitled Image'}`,
    }, [
      el('img', { src: img.thumb || img.src, alt: '', loading: 'lazy', decoding: 'async' }),
      el('figcaption', {}, [
        el('strong', { text: img.title || 'Untitled Image' }),
        el('span', { text: img.category }),
      ]),
    ]);
    const open = () => { AppState.pushRecent(img.id); LightboxController.open(img.id, picks); };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    host.append(card);
  });
}

function renderRecent() {
  const host = document.querySelector('[data-recent]');
  if (!host) return;
  const entries = AppState.recent.slice(0, 5);
  const images = ImageRepository.byIds(entries.map((e) => e.id));
  host.innerHTML = '';

  if (!images.length) {
    host.append(el('div', { class: 'empty-state' }, [
      el('span', { class: 'empty-state__icon', html: icon('clock', { size: 26 }) }),
      el('h3', { text: 'Images you open will appear here.' }),
      el('p', { text: 'MIREVA keeps a private history on this device so you can find things again.' }),
      el('a', { class: 'btn btn--primary', href: 'pages/gallery.html', text: 'Explore Gallery' }),
    ]));
    return;
  }

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
      class: 'icon-btn', type: 'button', 'aria-label': `Open ${img.title}`, title: 'Open',
      html: icon('expand', { size: 17 }),
      onClick: () => { AppState.pushRecent(img.id); LightboxController.open(img.id, images); },
    }));
    const favOn = FavoritesManager.has(img.id);
    actions.append(el('button', {
      class: `icon-btn${favOn ? ' is-active' : ''}`, type: 'button',
      'aria-label': favOn ? 'Remove from favourites' : 'Add to favourites', title: 'Favourite',
      html: icon('heart', { size: 17, fill: favOn }),
      onClick: (e) => {
        const on = FavoritesManager.toggle(img.id);
        e.currentTarget.classList.toggle('is-active', on);
        e.currentTarget.innerHTML = icon('heart', { size: 17, fill: on });
      },
    }));
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': `Remove ${img.title} from history`, title: 'Remove from history',
      html: icon('x', { size: 17 }),
      onClick: () => AppState.removeRecent(img.id),
    }));
    row.append(actions);
    host.append(row);
  });
}

function renderAll() {
  renderGreeting();
  renderHeroMeta();
  renderCollage();
  renderStats();
  renderFeatured();
  renderRecent();
}

(async function init() {
  await bootApp({ page: 'home', title: 'Dashboard' });
  renderQuickActions();
  renderAll();
  ['favorites:changed', 'recent:changed', 'collections:changed', 'repo:changed', 'prefs:changed']
    .forEach((evt) => bus.on(evt, renderAll));
  document.addEventListener('mireva:onboarding-complete', renderAll);
})();
