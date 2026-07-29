/**
 * dataCache – app-wide GET cache with SWR semantics.
 *
 *   cachedGet(key, url, { ttl, params, onFresh })
 *
 * Behaviour:
 *   1. If cached value is FRESH (< ttl), resolve with it immediately.
 *   2. If cached value is STALE, resolve with the stale value RIGHT AWAY and
 *      kick off a background revalidation. When the revalidation completes,
 *      the new value is stored AND `onFresh(newData)` is invoked so the
 *      caller can setState with the fresh copy — this is SWR (stale-while-
 *      revalidate) and gives the "instant navigation" feel.
 *   3. Concurrent requests for the same key share a single in-flight promise
 *      (request deduplication).
 *   4. On explicit `bust(prefix)` any keys starting with the prefix are
 *      invalidated so the next call is authoritative.
 */
import api from "./api";

const store = new Map();     // key -> { data, at, ttl }
const inflight = new Map();  // key -> Promise<data>

const DEFAULT_TTL = 30_000;  // 30 s

const isFresh = (e) => e && Date.now() - e.at < e.ttl;

async function fetchAndStore(cacheKey, url, params, ttl) {
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);
  const p = api.get(url, { params })
    .then((r) => {
      store.set(cacheKey, { data: r.data, at: Date.now(), ttl });
      inflight.delete(cacheKey);
      return r.data;
    })
    .catch((e) => { inflight.delete(cacheKey); throw e; });
  inflight.set(cacheKey, p);
  return p;
}

export async function cachedGet(key, url, { ttl = DEFAULT_TTL, params, onFresh } = {}) {
  const cacheKey = params ? `${key}?${JSON.stringify(params)}` : key;
  const cached = store.get(cacheKey);

  // Fresh – return cached, no network.
  if (isFresh(cached)) return cached.data;

  // Stale – return cached instantly, revalidate in background.
  if (cached && typeof onFresh === "function") {
    fetchAndStore(cacheKey, url, params, ttl)
      .then((fresh) => { try { onFresh(fresh); } catch { /* noop */ } })
      .catch(() => { /* silent */ });
    return cached.data;
  }

  // No cache – fetch and cache.
  return fetchAndStore(cacheKey, url, params, ttl);
}

export function peek(key, params) {
  const cacheKey = params ? `${key}?${JSON.stringify(params)}` : key;
  const e = store.get(cacheKey);
  return e ? e.data : undefined;
}

export function bust(prefix) {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function clearAll() {
  store.clear();
  inflight.clear();
}
