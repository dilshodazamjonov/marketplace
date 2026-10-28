// Values of the API's UserType enum (backend/sql/users.py).
export const ROLES = {
  buyer: { label: 'Buyer', icon: 'bag', home: '/buyer/' },
  seller: { label: 'Seller', icon: 'store', home: '/seller/' },
  admin: { label: 'Admin', icon: 'shield', home: '/admin/' },
};

// Signed-in pages, their sidebar group and the roles that may open them, mirroring the API's
// own rules: POST /product/create accepts sellers and admins, the rest of admin is admins only.
// This only decides what the UI shows; the API still checks every request.
export const PAGES = [
  { path: '/admin/', label: 'Categories', icon: 'layers', group: 'Admin', roles: ['admin'] },
  { path: '/admin/users/', label: 'Users', icon: 'users', group: 'Admin', roles: ['admin'] },
  { path: '/seller/', label: 'Listings', icon: 'tag', group: 'Marketplace', roles: ['seller', 'admin'] },
  { path: '/buyer/', label: 'Catalog', icon: 'grid', group: 'Marketplace', roles: ['buyer', 'seller', 'admin'] },
  // No group: reached from the account card at the bottom of the sidebar.
  { path: '/account/', label: 'Account', icon: 'user', group: null, roles: ['buyer', 'seller', 'admin'] },
];

const PUBLIC_PATHS = ['/', '/login/', '/register/'];

export function canOpen(role, path) {
  return PAGES.some((page) => page.path === path && page.roles.includes(role));
}

/** Leaves the page. The returned promise never settles, so awaiting callers simply stop. */
export function redirect(url) {
  location.replace(url);
  return new Promise(() => {});
}

/** Sends the user to sign in, remembering the page to come back to. */
export function goToLogin({ expired = false } = {}) {
  const params = new URLSearchParams();
  if (expired) params.set('reason', 'expired');
  if (!PUBLIC_PATHS.includes(location.pathname)) params.set('next', location.pathname + location.search);
  const query = params.toString();
  return redirect(query ? `/login/?${query}` : '/login/');
}

/** Where to go after signing in: back to ?next= if it's one of our pages this user may open. */
export function destinationFor(user) {
  const next = new URLSearchParams(location.search).get('next');
  if (next) {
    try {
      const url = new URL(next, location.origin);
      // Same origin only, so a crafted ?next= can't send the user to another site.
      if (url.origin === location.origin && canOpen(user.user_type, url.pathname)) {
        return url.pathname + url.search;
      }
    } catch {
      // Malformed ?next=: use the user's home page.
    }
  }
  return ROLES[user.user_type].home;
}
