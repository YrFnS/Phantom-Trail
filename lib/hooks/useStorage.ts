import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Chrome storage hook with real-time updates
 * Based on Chrome storage onChanged listener pattern with polling fallback
 */
export function useStorage<T>(
  key: string,
  defaultValue: T,
  pollInterval = 2000
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
  const lastDataRef = useRef<string>('');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await chrome.storage.local.get(key);
        const newData = result[key] ?? defaultValue;
        const dataHash = JSON.stringify(newData);
        
        if (dataHash !== lastDataRef.current) {
          setData(newData);
          lastDataRef.current = dataHash;
        }
      } catch (error) {
        console.error(`Failed to load storage key ${key}:`, error);
        setData(defaultValue);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, defaultValue]);

  // Set up real-time listener with polling fallback
  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key]) {
        const newData = changes[key].newValue ?? defaultValue;
        const dataHash = JSON.stringify(newData);
        
        if (dataHash !== lastDataRef.current) {
          setData(newData);
          lastDataRef.current = dataHash;
        }
      }
    };

    listenerRef.current = listener;
    chrome.storage.onChanged.addListener(listener);

    // Polling fallback for reliability
    const pollInterval_id = setInterval(async () => {
      try {
        const result = await chrome.storage.local.get(key);
        const newData = result[key] ?? defaultValue;
        const dataHash = JSON.stringify(newData);
        
        if (dataHash !== lastDataRef.current) {
          setData(newData);
          lastDataRef.current = dataHash;
        }
      } catch (error) {
        console.error(`Polling failed for key ${key}:`, error);
      }
    }, pollInterval);

    // Cleanup listener and polling on unmount
    return () => {
      if (listenerRef.current) {
        chrome.storage.onChanged.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      clearInterval(pollInterval_id);
    };
  }, [key, defaultValue, pollInterval]);

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
