import { autoload, watchAutoload } from './core/autoload.js';
import { registry } from './core/registry.js';

const themeStylesheetUrl = new URL('./styles/theme.css', import.meta.url);

export { autoload, watchAutoload, registry };
export { themeStylesheetUrl };

export async function defineTblr() {
  await autoload();
  watchAutoload();
}
