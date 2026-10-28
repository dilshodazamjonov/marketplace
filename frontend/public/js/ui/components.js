import { ROLES } from '../core/routes.js';
import { el, hueFor, icon } from './dom.js';
import { formatDate, formatPrice } from './format.js';
import { toast } from './toast.js';

const NOTICE_ICONS = { error: 'alert', success: 'check', info: 'info' };

export function notice(tone, message) {
  return el('div', { class: `notice notice--${tone}` }, icon(NOTICE_ICONS[tone]), el('p', {}, message));
}

export function roleBadge(role) {
  const { label, icon: name } = ROLES[role];
  return el('span', { class: `badge badge--${role}` }, icon(name), label);
}

/** Initials on a colour that's always the same for the same name. */
export function avatar(name, size = 'md') {
  const node = el('span', { class: size === 'lg' ? 'avatar avatar--lg' : 'avatar', 'aria-hidden': 'true' }, initials(name));
  node.style.setProperty('--hue', hueFor(name));
  return node;
}

export function emptyState({ icon: name, title, text, action }) {
  return el(
    'div',
    { class: 'empty' },
    el('span', { class: 'empty__icon' }, icon(name)),
    el('p', { class: 'empty__title' }, title),
    text && el('p', { class: 'empty__text' }, text),
    action && el('div', { class: 'empty__action' }, action),
  );
}

/** The API has no product images yet: a tile with the first letter, coloured by category. */
export function productTile(product, className) {
  const node = el('span', { class: `tile ${className}`, 'aria-hidden': 'true' }, firstLetter(product.title));
  node.style.setProperty('--hue', hueFor(product.category_id ?? product.id));
  return node;
}

/** A ProductResponse as a catalog card. */
export function productCard(product, categoryName) {
  return el(
    'article',
    { class: 'product' },
    productTile(product, 'product__media'),
    el(
      'div',
      { class: 'product__body' },
      el(
        'div',
        { class: 'product__meta' },
        categoryName && el('span', { class: 'chip chip--accent' }, categoryName),
        el('span', { class: 'chip' }, product.condition),
      ),
      el('h3', { class: 'product__title' }, product.title),
      el('p', { class: 'product__description' }, product.description),
      el(
        'div',
        { class: 'product__footer' },
        el('span', { class: 'product__price' }, formatPrice(product.price)),
        el('span', { class: 'product__date' }, formatDate(product.created_at)),
      ),
    ),
  );
}

/** A table. `columns` are labels, or { label, numeric } for right-aligned numbers. */
export function dataTable(columns, rows) {
  const specs = columns.map((column) => (typeof column === 'string' ? { label: column } : column));
  const cellClass = (index) => (specs[index].numeric ? 'num' : null);
  return el(
    'div',
    { class: 'table-wrap' },
    el(
      'table',
      { class: 'table' },
      el('thead', {}, el('tr', {}, ...specs.map((spec, index) => el('th', { scope: 'col', class: cellClass(index) }, spec.label)))),
      el('tbody', {}, ...rows.map((cells) => el('tr', {}, ...cells.map((cell, index) => el('td', { class: cellClass(index) }, cell))))),
    ),
  );
}

export function skeletonTable(columns, rows = 5) {
  return dataTable(columns, Array.from({ length: rows }, () => columns.map(() => el('span', { class: 'skeleton' }))));
}

export function skeletonGrid(count = 6) {
  const card = () =>
    el(
      'div',
      { class: 'product' },
      el('span', { class: 'skeleton skeleton--media' }),
      el('div', { class: 'product__body' }, el('span', { class: 'skeleton' }), el('span', { class: 'skeleton skeleton--short' })),
    );
  return el('div', { class: 'product-grid', 'aria-hidden': 'true' }, ...Array.from({ length: count }, card));
}

/** A small button that copies `value` and confirms with a toast. */
export function copyButton(value, what) {
  return el(
    'button',
    {
      type: 'button',
      class: 'icon-button icon-button--sm',
      title: `Copy ${what}`,
      'aria-label': `Copy ${what}`,
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast(`Copied ${what}`);
        } catch {
          toast('Copying needs a secure page (https or localhost).', 'error');
        }
      },
    },
    icon('copy'),
  );
}

function initials(name) {
  const words = String(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const letters = words.length > 1 ? [...words[0]][0] + [...words[1]][0] : [...(words[0] ?? '?')].slice(0, 2).join('');
  return letters.toUpperCase();
}

function firstLetter(text) {
  return ([...String(text).trim()][0] ?? '?').toUpperCase();
}
