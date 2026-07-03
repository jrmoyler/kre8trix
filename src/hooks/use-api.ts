import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch the current path (used after mutations). */
  refresh: () => void;
  /** Replace cached data locally (e.g. from a mutation response). */
  setData: (data: T) => void;
}

interface QueryState<T> {
  data: T | null;
  error: string | null;
  /** Which (path, nonce) pair this state was resolved for. */
  resolvedKey: string | null;
}

/**
 * GET a path and track loading/error state. Refetches when `path`
 * changes (e.g. query params) unless `enabled` is false.
 */
export function useApi<T>(path: string, enabled = true): UseApiResult<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    error: null,
    resolvedKey: null,
  });

  const key = `${path}#${nonce}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .get<T>(path)
      .then((result) => {
        if (cancelled) return;
        setState({ data: result, error: null, resolvedKey: key });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          data: prev.data,
          error: err instanceof ApiError ? err.message : 'Something went wrong',
          resolvedKey: key,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, enabled, key]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback(
    (data: T) => setState({ data, error: null, resolvedKey: key }),
    [key],
  );

  const loading = enabled && state.resolvedKey !== key;

  return { data: state.data, loading, error: loading ? null : state.error, refresh, setData };
}
