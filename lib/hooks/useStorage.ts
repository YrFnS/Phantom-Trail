import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Chrome storage hook with real-time updates
 * Based on Chrome storage onChanged listener pattern
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef<
    | ((
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => void)
    | null
  >(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await chrome.storage.local.get(key);
        setData(result[key] ?? defaultValue);
      } catch (error) {
        console.error(`Failed to load storage key ${key}:`, error);
        setData(defaultValue);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, defaultValue]);

  // Set up real-time listener
  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key]) {
        setData(changes[key].newValue ?? defaultValue);
      }
    };

    listenerRef.current = listener;
    chrome.storage.onChanged.addListener(listener);

    // Cleanup listener on unmount
    return () => {
      if (listenerRef.current) {
        chrome.storage.onChanged.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [key, defaultValue]);

  // Update storage function
  const updateStorage = useCallback(
    async (value: T) => {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (error) {
        console.error(`Failed to update storage key ${key}:`, error);
        throw new Error(`Failed to update storage`);
      }
    },
    [key]
  );

  return [data, updateStorage, loading];
}
