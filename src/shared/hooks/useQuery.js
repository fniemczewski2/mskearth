import { useCallback, useEffect, useRef, useState } from 'react';

import { QUERY_STALE_MS } from '../config/site.js';

const cache = new Map();

/** Usuwa wpisy z pamieci podrecznej; bez argumentu czysci wszystko (np. po zapisie w panelu). */
export function invalidateQueries(prefix) {
  for (const key of [...cache.keys()]) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

function load(key, fetcher) {
  const entry = { promise: null, data: undefined, at: 0 };
  entry.promise = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      entry.data = data;
      entry.at = Date.now();
      return data;
    })
    .catch((err) => {
      if (cache.get(key) === entry) cache.delete(key);
      throw err;
    });
  cache.set(key, entry);
  return entry;
}

/**
 * Stan zapytania do API oddzielony od stanu interfejsu.
 * Wyniki sa wspoldzielone miedzy komponentami po kluczu i odswiezane po QUERY_STALE_MS;
 * rownolegle wywolania z tym samym kluczem daja jedno zapytanie sieciowe.
 * key = null wylacza zapytanie.
 */
export default function useQuery(key, fetcher, { staleMs = QUERY_STALE_MS } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fresh = (k) => {
    const entry = k ? cache.get(k) : null;
    return entry && entry.at && Date.now() - entry.at < staleMs ? entry : null;
  };

  const [state, setState] = useState(() => {
    const entry = fresh(key);
    return { key, data: entry?.data, error: null, loading: Boolean(key) && !entry };
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!key) {
      setState({ key, data: undefined, error: null, loading: false });
      return undefined;
    }
    let active = true;
    const cached = fresh(key);
    if (cached) {
      setState({ key, data: cached.data, error: null, loading: false });
      return undefined;
    }
    const pending = cache.get(key);
    const entry = pending && !pending.at ? pending : load(key, () => fetcherRef.current());
    setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: null, loading: true }));
    entry.promise
      .then((data) => {
        if (active) setState({ key, data, error: null, loading: false });
      })
      .catch((error) => {
        if (active) setState({ key, data: undefined, error, loading: false });
      });
    return () => {
      active = false;
    };
    // staleMs i fresh nie zmieniaja sie miedzy renderami w sposob istotny dla zapytania.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => {
    if (key) cache.delete(key);
    setVersion((v) => v + 1);
  }, [key]);

  const current = state.key === key ? state : { data: undefined, error: null, loading: Boolean(key) };
  return { data: current.data, error: current.error, loading: current.loading, reload };
}
