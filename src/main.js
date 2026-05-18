import { autoload, preventTurboFouce, watchAutoload } from './core/autoload.js';

const themeStylesheetUrl = new URL('./styles/theme.css', import.meta.url);

export { autoload, preventTurboFouce, watchAutoload };
export { themeStylesheetUrl };

export async function defineTblr() {
  await autoload();
  watchAutoload();
}
