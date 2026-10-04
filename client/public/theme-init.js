// Apply the preference before React and the stylesheet paint the first screen.
// Keep this storage key in sync with useTheme.ts; it never contains game data.
(() => {
  let saved;
  try {
    saved = localStorage.getItem('fuga-theme');
  } catch {
    // Browsers with storage disabled still support the system theme.
  }
  document.documentElement.dataset.theme =
    saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
})();
