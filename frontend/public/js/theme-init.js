// Applies the saved theme before the first paint so the page never flashes the wrong colours.
// A classic, render-blocking script on purpose (keep it tiny); the switch itself is ui/theme.js.
try {
  const theme = localStorage.getItem('marketplace.theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // Storage blocked: follow the system theme.
}
