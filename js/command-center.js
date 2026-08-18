/**
 * MIREVA — Command Centre (Ctrl/⌘ + K)
 * Keyboard-first navigation and actions, with fuzzy-ish filtering and full
 * arrow-key support.
 */

import { icon } from './icons.js';
import { el, assetUrl } from './utils.js';
import { ThemeManager } from './theme.js';
import { trapFocus, lockScroll, unlockScroll } from './accessibility.js';

class CommandCentre {
  #root = null;
  #release = null;
  #items = [];
  #selected = 0;

  init() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'k') { e.preventDefault(); this.toggle(); return; }
      if (e.key === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); }
    });
    document.querySelectorAll('[data-open-command]').forEach((btn) => {
      btn.addEventListener('click', () => this.open());
    });
  }

  get isOpen() { return Boolean(this.#root?.classList.contains('is-open')); }

  get commands() {
    const go = (path) => () => { window.location.href = assetUrl(path); };
    return [
      { group: 'Navigate', label: 'Open Dashboard', icon: 'home', run: go('index.html'), keys: 'G H' },
      { group: 'Navigate', label: 'Open Gallery', icon: 'images', run: go('pages/gallery.html'), keys: 'G G' },
      { group: 'Navigate', label: 'Open Favourites', icon: 'heart', run: go('pages/favorites.html'), keys: 'G F' },
      { group: 'Navigate', label: 'Open Collections', icon: 'bookmark', run: go('pages/collections.html'), keys: 'G C' },
      { group: 'Navigate', label: 'Open Recently Viewed', icon: 'clock', run: go('pages/recently-viewed.html'), keys: 'G R' },
      { group: 'Actions', label: 'Upload Images', icon: 'upload', run: go('pages/upload.html'), keys: 'G U' },
      { group: 'Actions', label: 'Start Presentation Mode', icon: 'play', run: go('pages/presentation.html'), keys: 'G P' },
      { group: 'Actions', label: 'Open Settings', icon: 'settings', run: go('pages/settings.html'), keys: 'G S' },
      { group: 'Appearance', label: 'Switch to Dark Mode', icon: 'moon', run: () => ThemeManager.apply('dark') },
      { group: 'Appearance', label: 'Switch to Light Mode', icon: 'sun', run: () => ThemeManager.apply('light') },
      { group: 'Appearance', label: 'Match System Theme', icon: 'monitor', run: () => ThemeManager.apply('system') },
    ];
  }

  #mount() {
    if (this.#root) return this.#root;
    const root = el('div', {
      class: 'cmd', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command centre',
    });
    root.innerHTML = `
      <div class="cmd__box">
        <div class="cmd__field">
          ${icon('command', { size: 18 })}
          <input type="text" placeholder="Search commands…" aria-label="Search commands" data-cmd="input" autocomplete="off" spellcheck="false">
          <span class="kbd">Esc</span>
        </div>
        <div class="cmd__list" role="listbox" aria-label="Commands" data-cmd="list"></div>
        <div class="cmd__foot">
          <span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span>
          <span><span class="kbd">↵</span> run</span>
          <span><span class="kbd">Esc</span> close</span>
        </div>
      </div>`;
    document.body.append(root);
    this.#root = root;
    this.input = root.querySelector('[data-cmd="input"]');
    this.list = root.querySelector('[data-cmd="list"]');

    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    this.input.addEventListener('input', () => this.#renderList(this.input.value));
    this.input.addEventListener('keydown', (e) => this.#onKey(e));
    return root;
  }

  open() {
    this.#mount();
    this.#root.classList.add('is-open');
    this.input.value = '';
    this.#renderList('');
    lockScroll();
    this.#release = trapFocus(this.#root, { initial: this.input });
  }

  close() {
    if (!this.#root) return;
    this.#root.classList.remove('is-open');
    unlockScroll();
    this.#release?.();
    this.#release = null;
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  #renderList(query) {
    const q = query.trim().toLowerCase();
    const matches = this.commands.filter((c) =>
      !q || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
    this.#items = matches;
    this.#selected = 0;
    this.list.innerHTML = '';

    if (!matches.length) {
      this.list.append(el('p', { class: 'cmd__empty', text: 'No commands match that search.' }));
      return;
    }

    let lastGroup = null;
    matches.forEach((cmd, i) => {
      if (cmd.group !== lastGroup) {
        lastGroup = cmd.group;
        this.list.append(el('div', { class: 'cmd__group-label', text: cmd.group }));
      }
      const btn = el('button', {
        class: `cmd__item${i === 0 ? ' is-selected' : ''}`,
        type: 'button', role: 'option', 'aria-selected': String(i === 0),
        dataset: { index: String(i) },
        html: `${icon(cmd.icon, { size: 17 })}<span>${cmd.label}</span>${cmd.keys ? `<span class="kbd">${cmd.keys}</span>` : ''}`,
        onClick: () => this.#run(i),
      });
      btn.addEventListener('mousemove', () => this.#select(i));
      this.list.append(btn);
    });
  }

  #select(index) {
    this.#selected = index;
    this.list.querySelectorAll('.cmd__item').forEach((n) => {
      const on = Number(n.dataset.index) === index;
      n.classList.toggle('is-selected', on);
      n.setAttribute('aria-selected', String(on));
      if (on) n.scrollIntoView({ block: 'nearest' });
    });
  }

  #run(index) {
    const cmd = this.#items[index];
    if (!cmd) return;
    this.close();
    setTimeout(() => cmd.run(), 60);
  }

  #onKey(e) {
    if (!this.#items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.#select((this.#selected + 1) % this.#items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.#select((this.#selected - 1 + this.#items.length) % this.#items.length); }
    else if (e.key === 'Enter') { e.preventDefault(); this.#run(this.#selected); }
  }
}

export const CommandCenter = new CommandCentre();
