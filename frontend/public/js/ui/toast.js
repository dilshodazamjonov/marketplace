import { el, icon } from './dom.js';

const ICONS = { success: 'check', error: 'alert', info: 'info' };

// Created up front: screen readers only announce changes to live regions that already exist.
const region = el('section', { class: 'toaster', 'aria-live': 'polite', 'aria-label': 'Notifications' });
document.body.append(region);

/** A short message in the corner of the screen that goes away by itself. */
export function toast(message, tone = 'success') {
  const item = el(
    'div',
    { class: `toast toast--${tone}` },
    icon(ICONS[tone]),
    el('p', { class: 'toast__message' }, message),
    el(
      'button',
      { type: 'button', class: 'icon-button icon-button--sm', 'aria-label': 'Dismiss', onclick: () => dismiss() },
      icon('x'),
    ),
  );
  region.append(item);

  const timer = setTimeout(dismiss, tone === 'error' ? 8000 : 4000);
  function dismiss() {
    clearTimeout(timer);
    item.classList.add('toast--leaving');
    setTimeout(() => item.remove(), 200);
  }
}
