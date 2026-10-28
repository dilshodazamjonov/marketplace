import { listCategories } from '../api/categories.js';
import { listProducts } from '../api/products.js';
import { createCollection, matches } from '../ui/collection.js';
import { emptyState, productCard, skeletonGrid } from '../ui/components.js';
import { el } from '../ui/dom.js';
import { startPage } from '../ui/shell.js';

// created_at values are ISO timestamps in UTC, so comparing them as strings orders them by time.
const SORTS = {
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  'price-asc': (a, b) => Number(a.price) - Number(b.price),
  'price-desc': (a, b) => Number(b.price) - Number(a.price),
};

startPage('/buyer/', () => {
  const search = document.getElementById('catalog-search');
  const category = document.getElementById('catalog-category');
  const sort = document.getElementById('catalog-sort');
  const names = new Map();

  createCollection({
    container: document.getElementById('catalog'),
    count: document.getElementById('catalog-count'),
    controls: [search, category, sort],
    noun: ['product', 'products'],
    skeleton: () => skeletonGrid(),
    load: async () => {
      const [products, categories] = await Promise.all([
        listProducts(),
        listCategories().catch(() => null), // the category filter is a nice-to-have
      ]);
      if (products === null) return null;
      fillCategoryFilter(category, categories, names);
      return { items: products };
    },
    filter: (items) =>
      items
        .filter(matches(search.value, (product) => [product.title, product.description, names.get(product.category_id)]))
        .filter((product) => !category.value || product.category_id === category.value)
        .sort(SORTS[sort.value]),
    render: (items) =>
      el('div', { class: 'product-grid' }, ...items.map((product) => productCard(product, names.get(product.category_id)))),
    empty: () => emptyState({ icon: 'box', title: 'No products yet', text: 'New listings from sellers will appear here.' }),
    unavailable: () =>
      emptyState({
        icon: 'box',
        title: "The catalog isn't available yet",
        text: 'Products appear here once the API has GET /product/list (see backendtodo.md).',
      }),
  }).reload();
});

function fillCategoryFilter(select, categories, names) {
  select.hidden = !categories?.length;
  if (select.hidden) return;
  for (const category of categories) names.set(category.id, category.name);
  select.replaceChildren(
    el('option', { value: '' }, 'All categories'),
    ...categories.map((category) => el('option', { value: category.id }, category.name)),
  );
}
