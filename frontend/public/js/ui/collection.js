import { ApiError } from '../api/client.js';
import { emptyState, notice } from './components.js';
import { el } from './dom.js';

/**
 * A list of API items with search/filter controls. Shows a skeleton while loading, an error with
 * a retry button if that fails, and empty states for "nothing yet", "nothing matches" and
 * "the API can't list these yet".
 *
 *   load()         resolves to { items, note? }, or null when the API doesn't have the endpoint yet
 *   filter(items)  the items to show for the current control values, in display order
 *   render(items)  the element that shows them
 */
export function createCollection({
  container,
  count,
  controls = [],
  noun: [one, many],
  skeleton,
  load,
  filter = (items) => items,
  render,
  empty,
  unavailable,
}) {
  let items = [];
  let note = null;
  let ready = false;
  let latest = 0;

  function update() {
    if (!ready) return;
    const visible = filter(items);
    if (count) count.textContent = items.length ? `${visible.length} ${visible.length === 1 ? one : many}` : '';

    let content;
    if (!items.length) content = empty();
    else if (visible.length) content = render(visible);
    else content = emptyState({ icon: 'search', title: `No ${many} match`, text: 'Try a different search or filter.' });
    container.replaceChildren(...[note && notice('info', note), content].filter(Boolean));
  }

  async function reload() {
    const run = ++latest;
    ready = false;
    if (count) count.textContent = '';
    container.setAttribute('aria-busy', 'true');
    container.replaceChildren(skeleton());

    try {
      const result = await load();
      if (run !== latest) return; // a newer reload has taken over
      for (const control of controls) control.disabled = result === null;
      if (result === null) {
        container.replaceChildren(unavailable());
        return;
      }
      ({ items, note = null } = result);
      ready = true;
      update();
    } catch (error) {
      if (run !== latest) return;
      if (!(error instanceof ApiError)) console.error(error);
      container.replaceChildren(
        notice('error', error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'),
        el('button', { type: 'button', class: 'button button--secondary button--sm', onclick: reload }, 'Try again'),
      );
    } finally {
      if (run === latest) container.removeAttribute('aria-busy');
    }
  }

  for (const control of controls) control.addEventListener('input', update);

  return {
    reload,
    /** Adds an item, or replaces the one with the same id, without fetching the list again. */
    upsert(item) {
      const index = items.findIndex((existing) => existing.id === item.id);
      items = index === -1 ? [item, ...items] : items.with(index, item);
      update();
    },
  };
}

/** A filter callback: true when any of `fields(item)` contains the search text, ignoring case. */
export function matches(query, fields) {
  const needle = query.trim().toLocaleLowerCase();
  return (item) => !needle || fields(item).some((value) => String(value ?? '').toLocaleLowerCase().includes(needle));
}
