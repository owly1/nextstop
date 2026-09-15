// Runs before styles paint; only the display preference is stored.
(() => {
 const media = window.matchMedia('(prefers-color-scheme: dark)');
 let preference = 'system';
 try { const saved = localStorage.getItem('nextstop-theme'); if (['light','dark','system'].includes(saved)) preference = saved; } catch {}
 function apply() {
  const theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#14191c' : '#f7f8f6');
  const control = document.getElementById('theme-select'); if (control) control.value = preference;
  window.dispatchEvent(new CustomEvent('nextstop-theme', {detail:theme}));
 }
 apply();
 media.addEventListener('change', () => { if (preference === 'system') apply(); });
 document.addEventListener('DOMContentLoaded', () => {
  apply();
  document.getElementById('theme-select').addEventListener('change', event => {
   preference = event.target.value;
   try { localStorage.setItem('nextstop-theme',preference); } catch {}
   apply();
  });
 });
})();
