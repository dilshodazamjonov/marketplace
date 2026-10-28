import { createCategory, listCategories } from '../api/categories.js';
import { ApiError } from '../api/client.js';
import { createCollection, matches } from '../ui/collection.js';
import { dataTable, emptyState, skeletonTable } from '../ui/components.js';
import { el, icon } from '../ui/dom.js';
import { formatDate } from '../ui/format.js';
import { handleForm } from '../ui/forms.js';
import { startPage } from '../ui/shell.js';
import { toast } from '../ui/toast.js';

const COLUMNS = ['Name', 'Created'];

startPage('/admin/', () => {
  const search = document.getElementById('category-search');
  const dialog = document.getElementById('category-dialog');

  const categories = createCollection({
    container: document.getElementById('categories'),
    count: document.getElementById('category-count'),
    controls: [search],
    noun: ['category', 'categories'],
    skeleton: () => skeletonTable(COLUMNS),
    load: async () => {
      const all = await listCategories();
      // Until the API can list categories, show the ones created during this visit.
      return all
        ? { items: all }
        : { items: [], note: "The server can't list categories yet, so only the ones you create now appear here." };
    },
    filter: (items) => items.filter(matches(search.value, (category) => [category.name])),
    render: (items) => dataTable(COLUMNS, items.map(categoryRow)),
    empty: () =>
      emptyState({
        icon: 'layers',
        title: 'No categories yet',
        text: 'Create the first category so sellers can start listing products.',
        action: el('button', { type: 'button', class: 'button', 'data-dialog-open': 'category-dialog' }, icon('plus'), 'New category'),
      }),
  });
  categories.reload();

  handleForm(document.getElementById('category-form'), async (data) => {
    try {
      const category = await createCategory({ name: data.get('name') });
      categories.upsert(category);
      dialog.close();
      toast(`Created “${category.name}”`);
    } catch (error) {
      // POST /category/create only answers 409 when the name is taken.
      if (error instanceof ApiError && error.status === 409) error.fields.name = error.message;
      throw error;
    }
  });
});

function categoryRow(category) {
  return [el('span', { class: 'cell-title' }, category.name), formatDate(category.created_at)];
}
