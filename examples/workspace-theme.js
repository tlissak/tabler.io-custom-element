import './workspace-demo.js';
import { defineTblr } from '../src/main.js';
await defineTblr();
document.querySelector('#theme-toggle').addEventListener('click', event => {
  const enabled = document.documentElement.dataset.tblrTheme === 'admin';
  if (enabled) delete document.documentElement.dataset.tblrTheme;
  else document.documentElement.dataset.tblrTheme = 'admin';
  event.currentTarget.textContent = enabled ? 'Activate admin theme' : 'Compare standard theme';
});
