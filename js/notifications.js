/**
 * MIREVA — toast notifications
 * A tiny, accessible replacement for alert(): messages are announced through
 * a polite live region and dismissed automatically.
 */

import { icon } from './icons.js';
import { el, motionDisabled } from './utils.js';

const ICONS = { success: 'check', error: 'alert', warn: 'alert', info: 'info' };
const TITLES = { success: 'Done', error: 'Something went wrong', warn: 'Heads up', info: 'MIREVA' };

class ToastCentre {
  #region = null;

  #ensure() {
    if (this.#region && document.body.contains(this.#region)) return this.#region;
    this.#region = document.querySelector('.toast-region');
    if (!this.#region) {
      this.#region = el('div', {
        class: 'toast-region', role: 'status',
        'aria-live': 'polite', 'aria-atomic': 'false',
      });
      document.body.append(this.#region);
    }
    return this.#region;
  }

  /**
   * @param {string} message
   * @param {{type?:'success'|'error'|'warn'|'info', title?:string, duration?:number, action?:{label:string,onClick:Function}}} [opts]
   */
  show(message, opts = {}) {
    const { type = 'info', title = TITLES[type], duration = type === 'error' ? 5200 : 3200, action } = opts;
    const region = this.#ensure();

    const node = el('div', { class: `toast toast--${type}` }, [
      el('span', { class: 'toast__icon', html: icon(ICONS[type] || 'info', { size: 20 }) }),
      el('div', { class: 'toast__body' }, [
        el('div', { class: 'toast__title', text: title }),
        el('div', { class: 'toast__msg', text: message }),
      ]),
    ]);

    if (action?.label) {
      node.append(el('button', {
        class: 'btn btn--sm btn--ghost', type: 'button', text: action.label,
        onClick: () => { action.onClick?.(); dismiss(); },
      }));
    }

    const close = el('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'Dismiss notification',
      html: icon('x', { size: 16 }), onClick: () => dismiss(),
    });
    close.style.width = '30px'; close.style.height = '30px';
    node.append(close);

    region.append(node);

    let timer = setTimeout(dismiss, duration);
    node.addEventListener('mouseenter', () => clearTimeout(timer));
    node.addEventListener('mouseleave', () => { timer = setTimeout(dismiss, 1400); });

    function dismiss() {
      clearTimeout(timer);
      if (!node.isConnected) return;
      if (motionDisabled()) { node.remove(); return; }
      node.classList.add('is-leaving');
      node.addEventListener('animationend', () => node.remove(), { once: true });
      setTimeout(() => node.remove(), 500);
    }

    return { dismiss };
  }

  success(msg, opts) { return this.show(msg, { ...opts, type: 'success' }); }
  error(msg, opts) { return this.show(msg, { ...opts, type: 'error' }); }
  warn(msg, opts) { return this.show(msg, { ...opts, type: 'warn' }); }
  info(msg, opts) { return this.show(msg, { ...opts, type: 'info' }); }
}

export const Toast = new ToastCentre();

/* Surface storage failures without ever showing a raw exception. */
document.addEventListener('mireva:storage-error', (e) => {
  Toast.error(e.detail?.message || 'Your changes could not be saved locally.');
});
