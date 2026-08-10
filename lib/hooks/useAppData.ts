import { useState, useEffect } from 'react';
import { EventsStorage } from '../storage/events-storage';
import { calculatePrivacyScore } from '../privacy-score';
import {
  eventMatchesPageDomain,
  getDomainFromUrl,
} from '../event-attribution.mts';
import type { TrackingEvent, PrivacyScore } from '../types';

/**
 * Custom hook for managing app-level data fetching and state.
 */
export function useAppData() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [currentSiteScore, setCurrentSiteScore] = useState<PrivacyScore | null>(
    null
  );
  const [overallScore, setOverallScore] = useState<PrivacyScore | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const recentEvents = await EventsStorage.getRecentEvents(100);
        setEvents(recentEvents);

        let domain = '';
        let isHttps = false;
        try {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const activeTab = tabs[0];
          domain = getDomainFromUrl(activeTab?.url);
          isHttps = activeTab?.url?.startsWith('https://') || false;
        } catch (tabError) {
          console.warn('Failed to get active tab:', tabError);
        }
        setCurrentDomain(domain);

        const pageEvents = domain
          ? recentEvents.filter(event => eventMatchesPageDomain(event, domain))
          : [];
        setCurrentSiteScore(calculatePrivacyScore(pageEvents, isHttps));
        setOverallScore(calculatePrivacyScore(recentEvents, true));
      } catch (error) {
        console.error('Failed to load attributed app data:', error);
      }
    };

    void loadData();
    const interval = setInterval(() => void loadData(), 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    events,
    currentSiteScore,
    overallScore,
    currentDomain,
  };
}
