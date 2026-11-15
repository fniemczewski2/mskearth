import { lazy } from 'react';

const RELOAD_FLAG = 'msk-chunk-reload';

// sessionStorage bywa niedostepny (tryb prywatny, ramka): wtedy bez automatycznego przeladowania.
function flag(action) {
  try {
    if (action === 'set') sessionStorage.setItem(RELOAD_FLAG, '1');
    if (action === 'clear') sessionStorage.removeItem(RELOAD_FLAG);
    return sessionStorage.getItem(RELOAD_FLAG) !== null;
  } catch {
    return true;
  }
}

/**
 * React.lazy z obsluga nieudanego pobrania modulu. Po wdrozeniu nowej wersji stare pliki
 * znikaja z serwera, wiec przy pierwszym bledzie strona jest przeladowywana jeden raz.
 */
export default function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      const module = await importer();
      flag('clear');
      return module;
    } catch (err) {
      if (!flag('get')) {
        flag('set');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }
  });
}
