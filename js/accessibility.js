/**
 * MIREVA — accessibility helpers
 * Focus trapping for dialogs/overlays, a polite screen-reader announcer,
 * and keyboard-user detection for focus styling.
 */

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusableWithin(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE))
    .filter((n) => n.offsetParent !== null || n === document.activeElement);
}

/**
 * Trap Tab focus inside `container` until the returned function is called.
 * Restores focus to whatever was focused beforehand.
 */
export function trapFocus(container, { initial } = {}) {
  const previous = document.activeElement;
  const onKeydown = (e) => {
    if (e.key !== 'Tab') return;
    const items = focusableWithin(container);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKeydown);
  const target = initial || focusableWithin(container)[0] || container;
  requestAnimationFrame(() => target?.focus?.());
  return () => {
    container.removeEventListener('keydown', onKeydown);
    if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
  };
}

let announcer = null;
/** Announce a message to assistive technology without moving focus. */
export function announce(message, assertive = false) {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.className = 'visually-hidden';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.append(announcer);
  }
  announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = message; }, 40);
}

/** Prevent background scrolling while an overlay is open. */
let lockCount = 0;
export function lockScroll() {
  lockCount += 1;
  document.documentElement.style.overflow = 'hidden';
}
export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.documentElement.style.overflow = '';
}

export function initAccessibility() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.documentElement.dataset.keyboardNav = 'true';
  });
  document.addEventListener('pointerdown', () => {
    document.documentElement.dataset.keyboardNav = 'false';
  });
}
