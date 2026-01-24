import { useState, useEffect } from 'react';
import { EventsStorage } from '../storage/events-storage';
import { calculatePrivacyScore } from '../privacy-score';
import type { TrackingEvent, PrivacyScore } from '../types';

/**
 * Custom hook for managing app-level data fetching and state
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

        // Get current domain from active tab
        let domain = '';
        let isHttps = false;
        try {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const activeTab = tabs[0];
          if (activeTab?.url) {
            domain = new URL(activeTab.url).hostname;
            isHttps = activeTab.url.startsWith('https:');
          }
        } catch (tabError) {
          console.warn('Failed to get active tab:', tabError);
          // Continue with empty domain - extension still works
        }
        setCurrentDomain(domain);

        // Calculate privacy score for current domain events
        const domainEvents = recentEvents.filter(
          event => event.domain === domain || event.url.includes(domain)
        );
        const currentScore = calculatePrivacyScore(domainEvents, isHttps);
        setCurrentSiteScore(currentScore);

        // Calculate overall privacy score for all recent events
        const allScore = calculatePrivacyScore(recentEvents, true);
        setOverallScore(allScore);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();

    // Refresh data every 5 seconds
    const interval = setInterval(loadData, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    events,
    currentSiteScore,
    overallScore,
    currentDomain,
  };
}
