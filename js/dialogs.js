/**
 * MIREVA — accessible dialogs
 * Promise-based confirm / prompt / picker built on <dialog>, replacing the
 * browser's blocking alert(), confirm() and prompt().
 */

import { el } from './utils.js';
import { icon } from './icons.js';
import { trapFocus } from './accessibility.js';

function baseDialog({ title, description }) {
  const dialog = el('dialog', { class: 'modal', 'aria-labelledby': 'modal-title' });
  const box = el('div', { class: 'modal__box' });
  box.append(el('div', { class: 'modal__head' }, [
    el('h3', { id: 'modal-title', text: title }),
    description ? el('p', { class: 'secondary-text', style: 'font-size:var(--fs-sm)', text: description }) : null,
  ]));
  dialog.append(box);
  document.body.append(dialog);
  return { dialog, box };
}

function present(dialog, resolve, value) {
  const release = trapFocus(dialog);
  const close = (result) => {
    release();
    dialog.close();
    dialog.remove();
    resolve(result);
  };
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(value); });
  dialog.showModal();
  return close;
}

/** @returns {Promise<boolean>} */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const { dialog, box } = baseDialog({ title, description: message });
    const cancel = el('button', { class: 'btn btn--ghost', type: 'button', text: cancelLabel });
    const confirm = el('button', {
      class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'button', text: confirmLabel,
    });
    box.append(el('div', { class: 'modal__actions' }, [cancel, confirm]));
    const close = present(dialog, resolve, false);
    cancel.addEventListener('click', () => close(false));
    confirm.addEventListener('click', () => close(true));
  });
}

/** @returns {Promise<string|null>} the entered text, or null when cancelled */
export function promptDialog({ title, description, label = 'Name', value = '', placeholder = '', confirmLabel = 'Save', maxlength = 60 }) {
  return new Promise((resolve) => {
    const { dialog, box } = baseDialog({ title, description });
    const input = el('input', { class: 'input', value, placeholder, maxlength: String(maxlength), id: 'modal-input' });
    box.append(el('div', { class: 'field' }, [el('label', { for: 'modal-input', text: label }), input]));
    const cancel = el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel' });
    const save = el('button', { class: 'btn btn--primary', type: 'button', text: confirmLabel });
    box.append(el('div', { class: 'modal__actions' }, [cancel, save]));

    const close = present(dialog, resolve, null);
    requestAnimationFrame(() => { input.focus(); input.select(); });
    cancel.addEventListener('click', () => close(null));
    save.addEventListener('click', () => close(input.value));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); close(input.value); } });
  });
}

/**
 * Multi-select image picker.
 * @returns {Promise<string[]|null>} selected image ids
 */
export function imagePickerDialog({ title = 'Add images', images = [], selected = [], confirmLabel = 'Done' }) {
  return new Promise((resolve) => {
    const { dialog, box } = baseDialog({ title, description: `${images.length} image${images.length === 1 ? '' : 's'} available` });
    const chosen = new Set(selected);

    const grid = el('div', { class: 'picker-grid' });
    if (!images.length) {
      grid.append(el('p', { class: 'muted', text: 'There are no images in your library yet.' }));
    }
    images.forEach((img) => {
      const tile = el('button', {
        class: 'picker-tile', type: 'button',
        'aria-pressed': String(chosen.has(img.id)),
        'aria-label': img.title || 'Untitled Image',
        title: img.title || 'Untitled Image',
      }, [
        el('img', { src: img.thumb || img.src, alt: '', loading: 'lazy', decoding: 'async' }),
        el('span', { class: 'picker-tile__check', html: icon('check', { size: 12 }) }),
      ]);
      tile.addEventListener('click', () => {
        chosen.has(img.id) ? chosen.delete(img.id) : chosen.add(img.id);
        tile.setAttribute('aria-pressed', String(chosen.has(img.id)));
      });
      grid.append(tile);
    });
    box.append(grid);

    const cancel = el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel' });
    const done = el('button', { class: 'btn btn--primary', type: 'button', text: confirmLabel });
    box.append(el('div', { class: 'modal__actions' }, [cancel, done]));

    const close = present(dialog, resolve, null);
    cancel.addEventListener('click', () => close(null));
    done.addEventListener('click', () => close([...chosen]));
  });
}

/** Choose one option from a list. @returns {Promise<string|null>} */
export function chooseDialog({ title, description, options = [], confirmLabel = 'Continue' }) {
  return new Promise((resolve) => {
    const { dialog, box } = baseDialog({ title, description });
    const select = el('select', { class: 'select', 'aria-label': title });
    options.forEach((o) => select.append(el('option', { value: o.value, text: o.label })));
    box.append(select);
    const cancel = el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel' });
    const ok = el('button', { class: 'btn btn--primary', type: 'button', text: confirmLabel });
    box.append(el('div', { class: 'modal__actions' }, [cancel, ok]));
    const close = present(dialog, resolve, null);
    cancel.addEventListener('click', () => close(null));
    ok.addEventListener('click', () => close(select.value));
  });
}
