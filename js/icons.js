/**
 * MIREVA — icon set
 * A small, hand-picked 24×24 stroke icon library, inlined so the app has
 * zero runtime icon-CDN dependency and works fully offline.
 * Usage:  el.innerHTML = icon('heart');   or   icon('heart', { fill: true })
 */

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  images: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="m3 13 4.5-4.5 4 4L15 9l6 5.5"/><circle cx="8.5" cy="8" r="1.4"/><path d="M7 21h13"/>',
  heart: '<path d="M12 20.4 4.6 13a4.6 4.6 0 1 1 7.4-5.3A4.6 4.6 0 1 1 19.4 13Z"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  upload: '<path d="M12 16V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  play: '<path d="M7 4.5v15l13-7.5Z"/>',
  pause: '<rect x="7" y="4.5" width="4" height="15" rx="1"/><rect x="13" y="4.5" width="4" height="15" rx="1"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M20 13.2v-2.4l-2.1-.5a6 6 0 0 0-.7-1.7l1.1-1.8-1.7-1.7-1.8 1.1a6 6 0 0 0-1.7-.7L12.6 3.4h-2.4l-.5 2.1a6 6 0 0 0-1.7.7L6.2 5.1 4.5 6.8l1.1 1.8a6 6 0 0 0-.7 1.7l-2.1.5v2.4l2.1.5a6 6 0 0 0 .7 1.7l-1.1 1.8 1.7 1.7 1.8-1.1a6 6 0 0 0 1.7.7l.5 2.1h2.4l.5-2.1a6 6 0 0 0 1.7-.7l1.8 1.1 1.7-1.7-1.1-1.8a6 6 0 0 0 .7-1.7Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  command: '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>',
  chevronLeft: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  chevronRight: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  chevronDown: '<path d="m6 9.5 6 6 6-6"/>',
  arrowRight: '<path d="M4 12h15"/><path d="m13.5 6.5 6 5.5-6 5.5"/>',
  x: '<path d="M6 6 18 18M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8.2v5.6M8.2 11h5.6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M8.2 11h5.6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  masonry: '<rect x="3.5" y="3.5" width="7" height="10" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="6" rx="1.5"/><rect x="3.5" y="16.5" width="7" height="4" rx="1.5"/><rect x="13.5" y="12.5" width="7" height="8" rx="1.5"/>',
  focus: '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M3 8v8M21 8v8"/>',
  trash: '<path d="M4.5 6.5h15"/><path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V6.5"/><path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5"/><path d="M10.5 10.5v6M13.5 10.5v6"/>',
  pencil: '<path d="M15.5 4.5 19.5 8.5 8.5 19.5 4 20.5 5 16Z"/><path d="m13.5 6.5 4 4"/>',
  rotateCw: '<path d="M20 5v5h-5"/><path d="M19.4 10a8 8 0 1 0-.9 6.2"/>',
  rotateCcw: '<path d="M4 5v5h5"/><path d="M4.6 10a8 8 0 1 1 .9 6.2"/>',
  flipH: '<path d="M12 3v18"/><path d="M9 6.5 4 12l5 5.5Z"/><path d="M15 6.5 20 12l-5 5.5Z"/>',
  flipV: '<path d="M3 12h18"/><path d="M6.5 9 12 4l5.5 5Z"/><path d="M6.5 15 12 20l5.5-5Z"/>',
  download: '<path d="M12 4v12"/><path d="m7.5 11.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.6" cy="9.4" r="1.6"/><path d="m4 17 5-5 3.5 3.5L16 12l4 4"/>',
  sparkles: '<path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.6 10.4 12.2 5 10.6 10.4 9Z"/><path d="M18.5 15.5 19.2 18l2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z"/>',
  palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 2.6-3 2.6h-1.6a2 2 0 0 0-1.4 3.4c.5.6.2 3-2 3Z"/><circle cx="7.6" cy="12.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="9.8" cy="8.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.4" cy="7.8" r="1.1" fill="currentColor" stroke="none"/>',
  wifiOff: '<path d="m2 3 20 18"/><path d="M5 12.5a11 11 0 0 1 3.4-2.2M19 12.5a11 11 0 0 0-6-2.4"/><path d="M8.5 16a6 6 0 0 1 6.4-.8"/><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none"/>',
  alert: '<path d="M12 4 2.8 20h18.4Z"/><path d="M12 10v4"/><circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M20 5v5h-5M4 19v-5h5"/><path d="M19.4 10a8 8 0 0 0-14-3.2L4 10M4.6 14a8 8 0 0 0 14 3.2L20 14"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-3 3.8M6.4 7.9A17 17 0 0 0 2.5 12S6 18.1 12 18.1a9 9 0 0 0 3.6-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  skipBack: '<path d="M18 5v14L8 12Z"/><path d="M6 5v14"/>',
  skipForward: '<path d="M6 5v14l10-7Z"/><path d="M18 5v14"/>',
  expand: '<path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"/>',
  shrink: '<path d="M9 4v5H4M15 20v-5h5M15 4v5h5M9 20v-5H4"/>',
  filter: '<path d="M3.5 5.5h17l-6.6 7.6V19l-3.8 2v-7.9Z"/>',
  sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3"/><path d="M14 6.5h6M14 11.5h5M14 16.5h4"/>',
  folderPlus: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z"/><path d="M12 11.5v5M9.5 14h5"/>',
  star: '<path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.2-5.2 2 2-5.2Z"/>',
  crop: '<path d="M6.5 2.5v15h15"/><path d="M2.5 6.5h15v15"/>',
  save: '<path d="M5 3.5h11L20.5 8v11.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5Z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>',
  bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4Z"/>',
};

/**
 * @param {string} name  key from PATHS
 * @param {{size?:number, fill?:boolean, cls?:string}} [opts]
 * @returns {string} SVG markup
 */
export function icon(name, opts = {}) {
  const d = PATHS[name];
  if (!d) return '';
  const { size = 24, fill = false, cls = '' } = opts;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill ? 'currentColor' : 'none'}" ` +
    `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ` +
    `class="${cls}" aria-hidden="true" focusable="false">${d}</svg>`;
}

export const ICON_NAMES = Object.keys(PATHS);
