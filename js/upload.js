/**
 * MIREVA — UploadController
 * File picker + drag & drop, validation, previews, and persistence of the
 * accepted images into IndexedDB. Also powers the "manage your uploads" list.
 */

import { icon } from './icons.js';
import { el, formatBytes, loadImage, uid, formatDate } from './utils.js';
import { ImageRepository, AppState, CATEGORIES } from './state.js';
import { Toast } from './notifications.js';
import { announce } from './accessibility.js';
import { confirmDialog, promptDialog } from './dialogs.js';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const MAX_FILE_BYTES = 12 * 1024 * 1024;   // 12 MB per file
export const MAX_BATCH = 24;

export class UploadController {
  /**
   * @param {{dropzone:HTMLElement, input:HTMLInputElement, previewHost:HTMLElement,
   *          actions:HTMLElement, onSaved?:Function}} opts
   */
  constructor({ dropzone, input, previewHost, actions, onSaved }) {
    this.dropzone = dropzone;
    this.input = input;
    this.previewHost = previewHost;
    this.actions = actions;
    this.onSaved = onSaved;
    this.queue = [];
    this.#bind();
  }

  #bind() {
    this.input.addEventListener('change', () => {
      this.addFiles(this.input.files);
      this.input.value = '';
    });

    this.dropzone.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      this.input.click();
    });
    this.dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.input.click(); }
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      this.dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        this.dropzone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      this.dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        if (evt === 'dragleave' && this.dropzone.contains(e.relatedTarget)) return;
        this.dropzone.classList.remove('is-dragging');
      });
    });
    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.addFiles(e.dataTransfer?.files);
    });

    // Never let a stray drop navigate the page away
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());
  }

  /** Validate a single File. Returns an error string, or null when valid. */
  validate(file) {
    if (!file.type.startsWith('image/')) return 'Not an image file';
    if (!ACCEPTED_TYPES.includes(file.type)) return `${file.type.replace('image/', '').toUpperCase()} is not supported`;
    if (file.size > MAX_FILE_BYTES) return `Too large — ${formatBytes(file.size)} (max ${formatBytes(MAX_FILE_BYTES)})`;
    if (file.size === 0) return 'That file appears to be empty';
    return null;
  }

  async addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (this.queue.length + files.length > MAX_BATCH) {
      Toast.warn(`You can prepare up to ${MAX_BATCH} images at a time.`);
    }

    const room = MAX_BATCH - this.queue.length;
    let accepted = 0, rejected = 0;

    for (const file of files.slice(0, Math.max(0, room))) {
      const error = this.validate(file);
      const entry = {
        key: uid('q'), file, error,
        previewUrl: error ? null : URL.createObjectURL(file),
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Untitled Image',
        category: 'Photography',
        width: null, height: null,
      };
      if (!error) {
        try {
          const img = await loadImage(entry.previewUrl);
          entry.width = img.naturalWidth;
          entry.height = img.naturalHeight;
          accepted += 1;
        } catch {
          entry.error = 'This file could not be read as an image';
          rejected += 1;
        }
      } else {
        rejected += 1;
      }
      this.queue.push(entry);
    }

    this.renderQueue();
    if (accepted) announce(`${accepted} image${accepted > 1 ? 's' : ''} ready to add`);
    if (rejected) Toast.warn(`${rejected} file${rejected > 1 ? 's were' : ' was'} skipped — check the messages below.`);
  }

  remove(key) {
    const entry = this.queue.find((q) => q.key === key);
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    this.queue = this.queue.filter((q) => q.key !== key);
    this.renderQueue();
  }

  clear() {
    this.queue.forEach((q) => q.previewUrl && URL.revokeObjectURL(q.previewUrl));
    this.queue = [];
    this.renderQueue();
  }

  renderQueue() {
    this.previewHost.innerHTML = '';
    const valid = this.queue.filter((q) => !q.error);

    if (!this.queue.length) {
      this.actions.classList.add('hide');
      return;
    }
    this.actions.classList.remove('hide');

    this.queue.forEach((entry) => {
      const item = el('article', { class: `upload-item${entry.error ? ' is-invalid' : ''}` });

      const preview = el('div', { class: 'upload-item__preview' });
      if (entry.previewUrl) {
        preview.append(el('img', { src: entry.previewUrl, alt: '', decoding: 'async' }));
      } else {
        preview.append(el('div', {
          class: 'empty-state', style: 'padding:var(--sp-4);border:none;background:none',
          html: icon('alert', { size: 24 }),
        }));
      }
      preview.append(el('button', {
        class: 'upload-item__remove', type: 'button',
        'aria-label': `Remove ${entry.file.name}`,
        html: icon('x', { size: 15 }),
        onClick: () => this.remove(entry.key),
      }));

      const body = el('div', { class: 'upload-item__body' });
      if (entry.error) {
        body.append(
          el('span', { class: 'upload-item__name', title: entry.file.name, text: entry.file.name }),
          el('span', { class: 'upload-item__error', text: entry.error }),
        );
      } else {
        const titleInput = el('input', {
          class: 'input', value: entry.title, 'aria-label': `Title for ${entry.file.name}`,
          maxlength: '60',
        });
        titleInput.addEventListener('input', () => { entry.title = titleInput.value; });

        const select = el('select', { class: 'select', 'aria-label': `Category for ${entry.file.name}` });
        CATEGORIES.filter((c) => c !== 'All').forEach((c) => {
          select.append(el('option', { value: c, text: c, selected: c === entry.category }));
        });
        select.addEventListener('change', () => { entry.category = select.value; });

        body.append(titleInput, select, el('span', {
          class: 'upload-item__size',
          text: `${formatBytes(entry.file.size)} · ${entry.width}×${entry.height}`,
        }));
      }

      item.append(preview, body);
      this.previewHost.append(item);
    });

    const saveBtn = this.actions.querySelector('[data-upload-save]');
    if (saveBtn) {
      saveBtn.disabled = valid.length === 0;
      saveBtn.querySelector('span').textContent =
        valid.length ? `Add ${valid.length} image${valid.length > 1 ? 's' : ''} to library` : 'Nothing to add';
    }
  }

  async save() {
    const valid = this.queue.filter((q) => !q.error);
    if (!valid.length) { Toast.warn('There are no valid images to add.'); return; }

    let added = 0;
    for (const entry of valid) {
      try {
        await ImageRepository.addUpload({
          blob: entry.file,
          fileName: entry.file.name,
          title: entry.title || 'Untitled Image',
          category: entry.category,
          tags: ['upload'],
          description: '',
          width: entry.width,
          height: entry.height,
          type: entry.file.type,
        });
        added += 1;
      } catch (err) {
        console.warn('[MIREVA] upload failed', err);
      }
    }

    this.clear();
    if (added) {
      Toast.success(`${added} image${added > 1 ? 's' : ''} uploaded to your library`);
      announce(`${added} images uploaded`);
      this.onSaved?.(added);
    } else {
      Toast.error('None of those images could be saved. Your browser storage may be full.');
    }
  }
}

/* ------------------------------ manage uploads ------------------------------ */

export function renderUploadManager(host, { onChange } = {}) {
  const uploads = ImageRepository.uploads;
  host.innerHTML = '';

  if (!uploads.length) {
    host.append(el('div', { class: 'empty-state' }, [
      el('span', { class: 'empty-state__icon', html: icon('upload', { size: 26 }) }),
      el('h3', { text: 'No uploads yet.' }),
      el('p', { text: 'Images you add appear here, where you can rename, re-categorise or delete them.' }),
    ]));
    return;
  }

  uploads.forEach((img) => {
    const row = el('article', { class: 'manage-row' });
    row.append(el('img', { src: img.thumb, alt: '', loading: 'lazy', decoding: 'async' }));
    row.append(el('div', { class: 'manage-row__body' }, [
      el('strong', { text: img.title }),
      el('span', {
        text: `${img.category} · ${img.width || '?'}×${img.height || '?'} · ${formatBytes(img.size || 0)} · ${formatDate(img.dateAdded)}`,
      }),
    ]));

    const actions = el('div', { class: 'row', style: 'gap:2px' });
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Rename', 'aria-label': `Rename ${img.title}`,
      html: icon('pencil', { size: 17 }),
      onClick: async () => {
        const name = await promptDialog({
          title: 'Rename image', label: 'Title', value: img.title, confirmLabel: 'Save',
        });
        if (name === null) return;
        await ImageRepository.updateUpload(img.id, { title: name.trim() || 'Untitled Image' });
        Toast.success('Image renamed');
        renderUploadManager(host, { onChange });
        onChange?.();
      },
    }));
    actions.append(el('button', {
      class: 'icon-btn', type: 'button', title: 'Delete', 'aria-label': `Delete ${img.title}`,
      html: icon('trash', { size: 17 }),
      onClick: async () => {
        if (AppState.preferences.confirmDestructive) {
          const ok = await confirmDialog({
            title: 'Delete this image?',
            message: `“${img.title}” will be removed from your library, favourites and collections. This cannot be undone.`,
            confirmLabel: 'Delete', danger: true,
          });
          if (!ok) return;
        }
        await ImageRepository.deleteUpload(img.id);
        Toast.info('Image deleted');
        renderUploadManager(host, { onChange });
        onChange?.();
      },
    }));
    row.append(actions);
    host.append(row);
  });
}
