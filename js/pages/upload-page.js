/**
 * MIREVA — upload page controller
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { UploadController, renderUploadManager } from '../upload.js';
import { bus } from '../state.js';

const $ = (s) => document.querySelector(s);

(async function init() {
  await bootApp({ page: 'upload', title: 'Upload' });
  $('[data-dropzone-icon]').innerHTML = icon('upload', { size: 28 });

  const controller = new UploadController({
    dropzone: $('[data-dropzone]'),
    input: $('#file-input'),
    previewHost: $('[data-previews]'),
    actions: $('[data-upload-actions]'),
    onSaved: () => renderUploadManager($('[data-manage]')),
  });

  $('[data-upload-save]').addEventListener('click', () => controller.save());
  $('[data-upload-clear]').addEventListener('click', () => controller.clear());

  renderUploadManager($('[data-manage]'));
  bus.on('repo:changed', () => renderUploadManager($('[data-manage]')));
})();
