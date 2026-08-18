/**
 * MIREVA — presentation page controller
 */

import { bootApp } from '../app.js';
import { icon } from '../icons.js';
import { el } from '../utils.js';
import { PresentationController, SPEEDS } from '../presentation.js';

const $ = (s) => document.querySelector(s);

(async function init() {
  await bootApp({ page: 'presentation', title: 'Presentation' });
  $('[data-empty-icon]').innerHTML = icon('play', { size: 26 });

  const sourceSelect = $('#pres-source');
  PresentationController.sourceOptions().forEach((o) =>
    sourceSelect.append(el('option', { value: o.value, text: o.label })));

  const speedSelect = $('#pres-speed');
  SPEEDS.forEach((s) => speedSelect.append(el('option', { value: String(s.value), text: s.label, selected: s.value === 5000 })));

  new PresentationController({
    stage: $('[data-stage]'),
    sourceSelect,
    speedSelect,
    controls: $('[data-controls]'),
    counter: $('[data-counter]'),
    empty: $('[data-empty]'),
  });
})();
