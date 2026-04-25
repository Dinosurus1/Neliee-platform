/*hook generico para llamadas asyncronas a la api, con manejo de errores y loading state*/
import { useState, useEffect, useCallback } from "react";

/**
 * Hook genérico para llamadas async a la API.
 *
 * Modo automático (immediate: true — por defecto):
 *   const { data, isLoading, error, refetch } = useApi(getCourses);
 *
 * Modo manual (immediate: false):
 *   const { execute, isLoading, error } = useApi(createCourse, { immediate: false });
 *   await execute(payload);
 */
export function useApi(apiFn, { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        setData(result);
        return result;
      } catch (err) {
        const msg = err.response?.data?.detail ?? "Error inesperado.";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFn]
  );

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, error, refetch: execute, execute };
}