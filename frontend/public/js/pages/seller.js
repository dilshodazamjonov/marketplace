import { listCategories } from '../api/categories.js';
import { ApiError } from '../api/client.js';
import { createProduct, listProducts } from '../api/products.js';
import { createCollection, matches } from '../ui/collection.js';
import { dataTable, emptyState, productTile, skeletonTable } from '../ui/components.js';
import { el, icon } from '../ui/dom.js';
import { formatDate, formatPrice } from '../ui/format.js';
import { handleForm } from '../ui/forms.js';
import { startPage } from '../ui/shell.js';
import { toast } from '../ui/toast.js';

const COLUMNS = ['Product', 'Category', 'Condition', { label: 'Price', numeric: true }, 'Listed'];

startPage('/seller/', (user) => {
  const form = document.getElementById('listing-form');
  const dialog = document.getElementById('listing-dialog');
  const search = document.getElementById('listing-search');
  const categoryNames = new Map();
  const categoriesReady = setUpCategoryField(form, categoryNames);

  const listings = createCollection({
    container: document.getElementById('listings'),
    count: document.getElementById('listing-count'),
    controls: [search],
    noun: ['listing', 'listings'],
    skeleton: () => skeletonTable(COLUMNS),
    load: async () => {
      // Category names are needed for the rows, so wait for them too.
      const [all] = await Promise.all([listProducts(), categoriesReady]);
      return all
        ? { items: all.filter((product) => product.seller_id === user.id) }
        : { items: [], note: "The server can't list products yet, so only listings you publish now appear here." };
    },
    filter: (items) =>
      items.filter(matches(search.value, (product) => [product.title, product.description, product.condition, categoryNames.get(product.category_id)])),
    render: (items) => dataTable(COLUMNS, items.map((product) => listingRow(product, categoryNames))),
    empty: () =>
      emptyState({
        icon: 'tag',
        title: 'No listings yet',
        text: 'Publish your first product and buyers will find it in the catalog.',
        action: el('button', { type: 'button', class: 'button', 'data-dialog-open': 'listing-dialog' }, icon('plus'), 'New listing'),
      }),
  });
  listings.reload();

  handleForm(form, async (data) => {
    try {
      const product = await createProduct({
        title: data.get('title'),
        description: data.get('description'),
        // Sent as a string so the API's Decimal gets exactly what was typed (2 decimals at most).
        price: Number(data.get('price')).toFixed(2),
        category_id: data.get('category_id'),
        condition: data.get('condition'),
      });
      listings.upsert(product);
      dialog.close();
      toast(`Published “${product.title}”`);
    } catch (error) {
      // POST /product/create only answers 404 when the category doesn't exist (e.g. just deleted).
      if (error instanceof ApiError && error.status === 404) error.fields.category_id = error.message;
      throw error;
    }
  });

  // Without a category to pick there's nothing valid to publish.
  categoriesReady.then((canPublish) => {
    if (!canPublish) form.querySelector('[type="submit"]').disabled = true;
  });
});

function listingRow(product, categoryNames) {
  return [
    el(
      'div',
      { class: 'cell-media' },
      productTile(product, 'tile--sm'),
      el(
        'div',
        { class: 'cell-stack' },
        el('span', { class: 'cell-title' }, product.title),
        el('span', { class: 'cell-sub' }, product.description),
      ),
    ),
    categoryNames.get(product.category_id) ?? '—',
    product.condition,
    formatPrice(product.price),
    formatDate(product.created_at),
  ];
}

/**
 * Fills the category dropdown: people pick a name, the form sends that category's id.
 * Resolves false when there's nothing to pick, and says why under the field.
 */
async function setUpCategoryField(form, names) {
  const select = form.elements.category_id;
  const hint = document.getElementById('category_id-hint');

  let categories;
  let problem = null;
  try {
    categories = await listCategories();
    if (categories === null) problem = "Listings can't be published yet: the server can't list categories.";
    else if (!categories.length) problem = 'An admin has to create a category before you can publish.';
  } catch {
    problem = "Categories couldn't be loaded. Reload the page to try again.";
  }

  if (problem) {
    select.replaceChildren(el('option', { value: '' }, 'No categories available'));
    select.disabled = true;
    hint.textContent = problem;
    return false;
  }

  for (const category of categories) names.set(category.id, category.name);
  select.replaceChildren(
    el('option', { value: '' }, 'Choose a category'),
    ...categories.map((category) => el('option', { value: category.id }, category.name)),
  );
  return true;
}
