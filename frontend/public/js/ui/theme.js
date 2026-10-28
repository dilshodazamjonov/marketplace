import { el, icon } from './dom.js';

// Same key as js/theme-init.js, which applies the choice before the page paints.
const STORAGE_KEY = 'marketplace.theme';

const OPTIONS = [
  { value: 'system', label: 'System theme', icon: 'monitor' },
  { value: 'light', label: 'Light theme', icon: 'sun' },
  { value: 'dark', label: 'Dark theme', icon: 'moon' },
];

/** A three-way switch: follow the system, or force light or dark. */
export function themeSwitch() {
  const current = savedTheme();
  const buttons = OPTIONS.map((option) =>
    el(
      'button',
      {
        type: 'button',
        class: 'segmented__button',
        title: option.label,
        'aria-label': option.label,
        'aria-pressed': String(option.value === current),
        'data-theme-value': option.value,
      },
      icon(option.icon),
    ),
  );

  const group = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Theme' }, ...buttons);
  group.addEventListener('click', (event) => {
    const chosen = event.target.closest('[data-theme-value]');
    if (!chosen) return;
    applyTheme(chosen.dataset.themeValue);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === chosen));
  });
  return group;
}

function savedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts until the page is left.
  }
}
