import { autoload, preventTurboFouce, watchAutoload } from './core/autoload.js';

const themeStylesheetUrl = new URL('./styles/theme.css', import.meta.url);
let defineTblrPromise;

export { autoload, preventTurboFouce, watchAutoload };
export { themeStylesheetUrl };

export function defineTblr() {
  if (!defineTblrPromise) {
    defineTblrPromise = (async () => {
      await autoload();
      watchAutoload();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tblr-ready'));
      }
    })();

    if (typeof window !== 'undefined') {
      window.tblrReady = defineTblrPromise;
    }
  }

  return defineTblrPromise;
}

export function whenTblrReady() {
  return defineTblrPromise ?? Promise.resolve();
}
