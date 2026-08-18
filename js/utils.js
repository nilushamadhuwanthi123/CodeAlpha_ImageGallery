/**
 * MIREVA — shared utilities
 * Small, dependency-free helpers used across every module.
 */

/* --------------------------------- DOM --------------------------------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ------------------------------- Timing -------------------------------- */
export function debounce(fn, wait = 180) {
  let t;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function throttle(fn, limit = 120) {
  let waiting = false, lastArgs = null;
  return (...args) => {
    if (waiting) { lastArgs = args; return; }
    fn(...args); waiting = true;
    setTimeout(() => {
      waiting = false;
      if (lastArgs) { fn(...lastArgs); lastArgs = null; }
    }, limit);
  };
}

export const raf = (fn) => requestAnimationFrame(fn);
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/* ------------------------------ Formatting ----------------------------- */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024, i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(input) {
  if (!input) return 'Metadata unavailable';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return 'Metadata unavailable';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(ts);
}

export function fileExtLabel(type = '') {
  const map = {
    'image/jpeg': 'JPEG', 'image/jpg': 'JPEG', 'image/png': 'PNG',
    'image/webp': 'WEBP', 'image/gif': 'GIF', 'image/svg+xml': 'SVG', 'image/avif': 'AVIF',
  };
  return map[type] || (type ? type.replace('image/', '').toUpperCase() : 'Metadata unavailable');
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/* -------------------------------- Maths -------------------------------- */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function aspectLabel(w, h) {
  if (!w || !h) return 'Metadata unavailable';
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const g = gcd(w, h);
  const rw = w / g, rh = h / g;
  if (rw > 30 || rh > 30) return (w / h).toFixed(2) + ' : 1';
  return `${rw} : ${rh}`;
}

export function orientationOf(w, h) {
  if (!w || !h) return 'square';
  const r = w / h;
  if (r > 1.06) return 'landscape';
  if (r < 0.94) return 'portrait';
  return 'square';
}

/* ------------------------------ Preferences ---------------------------- */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function motionDisabled() {
  return document.documentElement.dataset.reduceMotion === 'true' || prefersReducedMotion();
}

/* -------------------------------- Colour -------------------------------- */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/* ------------------------------ Clipboard ------------------------------ */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/* ------------------------------ Misc ------------------------------ */
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

/** Resolve a path that is written relative to the project root, from any page depth. */
export function assetUrl(path = '') {
  const root = document.documentElement.dataset.root || '';
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path;
  return root + path.replace(/^\.?\//, '');
}

/** Simple swipe detection that never blocks vertical page scrolling. */
export function onSwipe(target, { onLeft, onRight, threshold = 52 } = {}) {
  let x0 = null, y0 = null, t0 = 0;
  target.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  target.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Date.now() - t0 > 700) return;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) onLeft?.(); else onRight?.();
  }, { passive: true });
}

/** Load an <img> and resolve with it, rejecting on error. */
export function loadImage(src, { crossOrigin } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    img.src = src;
  });
}
