import { avatar, copyButton, roleBadge } from '../ui/components.js';
import { el } from '../ui/dom.js';
import { formatDate } from '../ui/format.js';
import { startPage } from '../ui/shell.js';

startPage('/account/', (user) => {
  const rows = [
    ['Date of birth', formatDate(user.date_of_birth)],
    ['Member since', formatDate(user.created_at)],
    ['User ID', el('span', { class: 'cell-id' }, el('code', {}, user.id), copyButton(user.id, 'user ID'))],
  ];

  document.getElementById('profile').replaceChildren(
    el(
      'div',
      { class: 'profile__header' },
      avatar(user.username, 'lg'),
      el(
        'div',
        { class: 'profile__identity' },
        el('p', { class: 'profile__name' }, user.username),
        el('p', { class: 'profile__email' }, user.email),
      ),
      roleBadge(user.user_type),
    ),
    el(
      'dl',
      { class: 'details' },
      ...rows.map(([term, value]) => el('div', { class: 'details__row' }, el('dt', {}, term), el('dd', {}, value))),
    ),
  );
});
