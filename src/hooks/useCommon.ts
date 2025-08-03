import { useEffect, useState } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} - M00DITA`;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export function useLoading() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startLoading = () => {
    setLoading(true);
    setError(null);
  };

  const stopLoading = () => {
    setLoading(false);
  };

  const setLoadingError = (errorMessage: string) => {
    setError(errorMessage);
    setLoading(false);
  };

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
  };
}