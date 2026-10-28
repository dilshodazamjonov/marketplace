import { isMissingEndpoint } from '../api/client.js';
import { listUsers, updateUserRole } from '../api/users.js';
import { ROLES } from '../core/routes.js';
import { createCollection, matches } from '../ui/collection.js';
import { avatar, dataTable, emptyState, skeletonTable } from '../ui/components.js';
import { el } from '../ui/dom.js';
import { formatDate } from '../ui/format.js';
import { startPage } from '../ui/shell.js';
import { toast } from '../ui/toast.js';

const COLUMNS = ['User', 'Role', 'Joined'];

startPage('/admin/users/', (me) => {
  const search = document.getElementById('user-search');
  const roleFilter = document.getElementById('user-role');

  createCollection({
    container: document.getElementById('users'),
    count: document.getElementById('user-count'),
    controls: [search, roleFilter],
    noun: ['user', 'users'],
    skeleton: () => skeletonTable(COLUMNS),
    load: async () => {
      const users = await listUsers();
      return users && { items: users };
    },
    filter: (items) =>
      items
        .filter(matches(search.value, (user) => [user.username, user.email]))
        .filter((user) => !roleFilter.value || user.user_type === roleFilter.value),
    render: (items) => dataTable(COLUMNS, items.map((user) => userRow(user, me))),
    empty: () => emptyState({ icon: 'users', title: 'No users yet', text: 'People who sign up will appear here.' }),
    unavailable: () =>
      emptyState({
        icon: 'users',
        title: "User management isn't connected yet",
        text: 'Everyone with an account appears here once the API has GET /admin/users (see backendtodo.md).',
      }),
  }).reload();
});

function userRow(user, me) {
  return [
    el(
      'div',
      { class: 'cell-media' },
      avatar(user.username),
      el(
        'div',
        { class: 'cell-stack' },
        el('span', { class: 'cell-title' }, user.username, user.id === me.id && el('span', { class: 'cell-note' }, ' (you)')),
        el('span', { class: 'cell-sub' }, user.email),
      ),
    ),
    roleSelect(user, me),
    formatDate(user.created_at),
  ];
}

function roleSelect(user, me) {
  const isMe = user.id === me.id;
  const select = el(
    'select',
    {
      class: 'select select--sm',
      'aria-label': `Role for ${user.username}`,
      // Changing your own role could lock the last admin out.
      disabled: isMe,
      title: isMe ? "You can't change your own role" : null,
    },
    ...Object.entries(ROLES).map(([value, role]) => el('option', { value, selected: value === user.user_type }, role.label)),
  );

  select.addEventListener('change', async () => {
    const previous = user.user_type;
    select.disabled = true;
    try {
      const updated = await updateUserRole(user.id, select.value);
      user.user_type = updated?.user_type ?? select.value;
      toast(`${user.username} is now ${ROLES[user.user_type].label}`);
    } catch (error) {
      select.value = previous;
      toast(isMissingEndpoint(error) ? "The server can't change roles yet." : error.message, 'error');
    } finally {
      select.disabled = false;
    }
  });
  return select;
}
