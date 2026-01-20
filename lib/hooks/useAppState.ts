import { useState, useEffect } from 'react';
import { StorageManager } from '../../lib/storage-manager';
import { calculatePrivacyScore } from '../../lib/privacy-score';
import type { TrackingEvent, PrivacyScore as PrivacyScoreType } from '../../lib/types';

const EMPTY_PRIVACY_SCORE: PrivacyScoreType = {
  score: 100,
  grade: 'A',
  color: 'green',
  breakdown: {
    totalTrackers: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    criticalRisk: 0,
    httpsBonus: true,
    excessiveTrackingPenalty: false,
  },
  recommendations: [],
};

export type AppTab = 'narrative' | 'network' | 'chat' | 'dashboard' | 'coach' | 'community';

/**
 * Hook for managing main app state
 */
export function useAppState() {
  const [activeTab, setActiveTab] = useState<AppTab>('narrative');
  const [showSettings, setShowSettings] = useState(false);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [privacyScore, setPrivacyScore] = useState<PrivacyScoreType>(EMPTY_PRIVACY_SCORE);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get current tab URL
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.url) {
          setCurrentUrl(tabs[0].url);
        }

        // Load recent events
        const recentEvents = await StorageManager.getRecentEvents(50);
        setEvents(recentEvents);

        // Calculate privacy score
        if (recentEvents.length > 0) {
          const score = calculatePrivacyScore(recentEvents);
          setPrivacyScore(score);
        }
      } catch (error) {
        console.error('Failed to load app data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Listen for new events
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.phantom_trail_events) {
        const newEvents = changes.phantom_trail_events.newValue || [];
        setEvents(newEvents.slice(-50)); // Keep last 50 events
        
        // Recalculate privacy score
        if (newEvents.length > 0) {
          const score = calculatePrivacyScore(newEvents);
          setPrivacyScore(score);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [currentUrl]);

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
