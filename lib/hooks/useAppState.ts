import { useState, useEffect } from 'react';
import { calculatePrivacyScore } from '../../lib/privacy-score';
import type {
  TrackingEvent,
  PrivacyScore as PrivacyScoreType,
} from '../../lib/types';
import { EventsStorage } from '../storage/events-storage';

const EMPTY_PRIVACY_SCORE: PrivacyScoreType = calculatePrivacyScore([]);

export type AppTab =
  | 'narrative'
  | 'network'
  | 'chat'
  | 'dashboard'
  | 'coach'
  | 'community';

export function useAppState() {
  const [activeTab, setActiveTab] = useState<AppTab>('narrative');
  const [showSettings, setShowSettings] = useState(false);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [privacyScore, setPrivacyScore] =
    useState<PrivacyScoreType>(EMPTY_PRIVACY_SCORE);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.url) setCurrentUrl(tabs[0].url);

        const recentEvents = await EventsStorage.getRecentEvents(50);
        setEvents(recentEvents);
        setPrivacyScore(calculatePrivacyScore(recentEvents));
      } catch (error) {
        console.error('Failed to load app data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (!changes.phantom_trail_events) return;

      const newEvents: TrackingEvent[] =
        changes.phantom_trail_events.newValue || [];
      setEvents(newEvents.slice(-50));
      setPrivacyScore(calculatePrivacyScore(newEvents));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return {
    activeTab,
    setActiveTab,
    showSettings,
    setShowSettings,
    events,
    privacyScore,
    currentUrl,
    loading,
  };
}
