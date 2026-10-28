import { ApiError } from '../api/client.js';
import { requireAccess, signOut } from '../core/auth.js';
import { PAGES, ROLES } from '../core/routes.js';
import { avatar, notice } from './components.js';
import { setUpDialogs } from './dialog.js';
import { el, icon } from './dom.js';
import { themeSwitch } from './theme.js';

/**
 * Boots a signed-in page. Only a spinner shows until access is confirmed; then the sidebar is
 * drawn, the app is revealed and `render(user)` fills in the content.
 */
export async function startPage(path, render) {
  const status = document.getElementById('page-status');
  let user;
  try {
    user = await requireAccess(path);
  } catch (error) {
    showFailure(status, error);
    return;
  }

  // Back/forward navigation can restore this page from memory without rerunning any script;
  // reload instead, so a user who has signed out never sees it again.
  addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });

  renderSidebar(user, path);
  setUpDialogs();
  status.hidden = true;
  document.getElementById('app').hidden = false;
  await render(user);
}

function renderSidebar(user, currentPath) {
  const role = ROLES[user.user_type];
  const pages = PAGES.filter((page) => page.group && page.roles.includes(user.user_type));
  const groups = [...Map.groupBy(pages, (page) => page.group)];

  document.getElementById('sidebar').replaceChildren(
    el('a', { class: 'brand', href: role.home }, el('span', { class: 'brand__mark' }, icon('mark')), 'Marketplace'),
    el(
      'nav',
      { class: 'nav', 'aria-label': 'Main' },
      ...groups.map(([group, items], index) =>
        el(
          'div',
          { class: 'nav__group' },
          el('p', { class: 'nav__label', id: `nav-group-${index}` }, group),
          el(
            'ul',
            { class: 'nav__list', role: 'list', 'aria-labelledby': `nav-group-${index}` },
            ...items.map((page) => el('li', {}, navLink(page, currentPath))),
          ),
        ),
      ),
    ),
    el(
      'div',
      { class: 'sidebar__footer' },
      el(
        'a',
        {
          class: 'user-card',
          href: '/account/',
          title: 'Account',
          'aria-current': currentPath === '/account/' ? 'page' : null,
        },
        avatar(user.username),
        el(
          'span',
          { class: 'user-card__text' },
          el('span', { class: 'user-card__name' }, user.username),
          el('span', { class: 'user-card__role' }, role.label),
        ),
      ),
      el(
        'div',
        { class: 'sidebar__controls' },
        themeSwitch(),
        el(
          'button',
          { type: 'button', class: 'icon-button', title: 'Sign out', 'aria-label': 'Sign out', onclick: () => signOut() },
          icon('logout'),
        ),
      ),
    ),
  );
}

function navLink(page, currentPath) {
  return el(
    'a',
    { class: 'nav__link', href: page.path, 'aria-current': page.path === currentPath ? 'page' : null },
    icon(page.icon),
    page.label,
  );
}

function showFailure(status, error) {
  if (!(error instanceof ApiError)) console.error(error);
  status.replaceChildren(
    el(
      'div',
      { class: 'boot__panel' },
      notice('error', error instanceof ApiError ? error.message : "This page couldn't be opened."),
      el(
        'div',
        { class: 'boot__actions' },
        el('button', { type: 'button', class: 'button', onclick: () => location.reload() }, 'Try again'),
        el('button', { type: 'button', class: 'button button--secondary', onclick: () => signOut() }, 'Sign out'),
      ),
    ),
  );
}
