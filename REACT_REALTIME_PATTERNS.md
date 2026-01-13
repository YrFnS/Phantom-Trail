# React Patterns for Real-Time Data Updates in Chrome Extensions

## Overview

This document outlines best practices for implementing real-time data updates in React-based Chrome extensions, with specific focus on the Phantom Trail project's requirements for live tracking data, AI analysis, and network visualization.

## Current Architecture Analysis

### Existing Patterns in Phantom Trail

**Background Script Pattern:**

- Service worker processes web requests asynchronously
- Throttles events to prevent UI overwhelming (5-second domain throttle)
- Triggers AI analysis based on significance thresholds
- Uses Chrome storage for persistence

**React State Management:**

- Custom `useStorage` hook for Chrome storage integration
- Real-time updates via `chrome.storage.onChanged` listeners
- Separation of concerns: events, AI analysis, and UI state

**Data Flow:**

```
Web Request → Background Script → Chrome Storage → React Hook → UI Update
```

## Best Practices for Real-Time Updates

### 1. Chrome Storage Integration

**Optimal Pattern:**

```typescript
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const listenerRef = useRef<chrome.storage.StorageChangeListener | null>(null);

  useEffect(() => {
    const listener = (changes, areaName) => {
      if (areaName === 'local' && changes[key]) {
        setData(changes[key].newValue ?? defaultValue);
      }
    };

    listenerRef.current = listener;
    chrome.storage.onChanged.addListener(listener);

    return () => {
      if (listenerRef.current) {
        chrome.storage.onChanged.removeListener(listenerRef.current);
      }
    };
  }, [key, defaultValue]);

  return [data, updateStorage, loading];
}
```

**Key Benefits:**

- Automatic cleanup prevents memory leaks
- Type-safe storage operations
- Real-time synchronization across extension contexts

### 2. Event Streaming Patterns

**Throttled Event Processing:**

```typescript
export function useThrottledEvents<T>(events: T[], throttleMs: number = 1000) {
  const [throttledEvents, setThrottledEvents] = useState<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setThrottledEvents(events);
    }, throttleMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [events, throttleMs]);

  return throttledEvents;
}
```

**Windowed Event Display:**

```typescript
export function useEventWindow<T>(events: T[], windowSize: number = 10) {
  return useMemo(() => {
    return events.slice(-windowSize);
  }, [events, windowSize]);
}
```

### 3. Polling vs Event-Driven Updates

**Event-Driven (Recommended):**

```typescript
// Background script
chrome.webRequest.onBeforeRequest.addListener(async details => {
  const event = processRequest(details);
  await chrome.storage.local.set({
    phantom_trail_events: [...existingEvents, event],
  });
});

// React component
const [events] = useStorage('phantom_trail_events', []);
```

**Polling (For External APIs):**

```typescript
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const poll = async () => {
      setLoading(true);
      try {
        const result = await fetchFn();
        setData(result);
      } catch (error) {
        console.error('Polling failed:', error);
      } finally {
        setLoading(false);
      }
    };

    poll(); // Initial fetch
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, dependencies);

  return { data, loading };
}
```

### 4. State Management Patterns

**Zustand for Complex State:**

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface TrackingStore {
  events: TrackingEvent[];
  analysis: AIAnalysis | null;
  networkData: NetworkNode[];
  addEvent: (event: TrackingEvent) => void;
  updateAnalysis: (analysis: AIAnalysis) => void;
}

export const useTrackingStore = create<TrackingStore>()(
  subscribeWithSelector((set, get) => ({
    events: [],
    analysis: null,
    networkData: [],

    addEvent: event =>
      set(state => ({
        events: [...state.events.slice(-99), event], // Keep last 100
      })),

    updateAnalysis: analysis => set({ analysis }),
  }))
);

// Subscribe to Chrome storage changes
chrome.storage.onChanged.addListener(changes => {
  if (changes.phantom_trail_events) {
    useTrackingStore
      .getState()
      .setEvents(changes.phantom_trail_events.newValue);
  }
});
```

**React Query for Server State:**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useAIAnalysis(events: TrackingEvent[]) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['ai-analysis', events.length],
    queryFn: () => AIEngine.generateNarrative(events),
    enabled: events.length > 0,
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### 5. Performance Optimization

**Virtualization for Large Lists:**

```typescript
import { FixedSizeList as List } from 'react-window';

function EventList({ events }: { events: TrackingEvent[] }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <EventItem event={events[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={events.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**Memoization for Expensive Computations:**

```typescript
export function useNetworkGraph(events: TrackingEvent[]) {
  return useMemo(() => {
    const nodes = new Map();
    const edges = [];

    events.forEach(event => {
      if (!nodes.has(event.domain)) {
        nodes.set(event.domain, {
          id: event.domain,
          label: event.domain,
          group: event.trackerType,
          riskLevel: event.riskLevel,
        });
      }

      // Build edges based on referrer relationships
      if (event.referrer && nodes.has(event.referrer)) {
        edges.push({
          from: event.referrer,
          to: event.domain,
          arrows: 'to',
        });
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      edges,
    };
  }, [events]);
}
```

### 6. Error Handling and Resilience

**Retry Logic with Exponential Backoff:**

```typescript
export function useRetryableOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
    retryCount: number;
  }>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const execute = useCallback(
    async (attempt = 0) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await operation();
        setState({
          data: result,
          loading: false,
          error: null,
          retryCount: 0,
        });
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          setTimeout(() => execute(attempt + 1), delay);
          setState(prev => ({
            ...prev,
            retryCount: attempt + 1,
            loading: true,
          }));
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error as Error,
            retryCount: 0,
          }));
        }
      }
    },
    [operation, maxRetries]
  );

  return { ...state, execute };
}
```

**Graceful Degradation:**

```typescript
export function useLiveNarrative() {
  const { events, loading: eventsLoading } = useTrackingEvents();
  const {
    data: analysis,
    loading: analysisLoading,
    error: analysisError,
  } = useAIAnalysis(events);

  // Provide fallback analysis when AI fails
  const fallbackAnalysis = useMemo(() => {
    if (analysisError && events.length > 0) {
      const highRiskEvents = events.filter(
        e => e.riskLevel === 'high' || e.riskLevel === 'critical'
      );

      return {
        narrative: `${events.length} trackers detected${
          highRiskEvents.length > 0
            ? `, ${highRiskEvents.length} high-risk`
            : ''
        }`,
        riskAssessment: highRiskEvents.length > 0 ? 'high' : 'medium',
        recommendations: ['Review privacy settings', 'Consider ad blocker'],
        confidence: 0.7,
      };
    }
    return null;
  }, [events, analysisError]);

  return {
    events,
    analysis: analysis || fallbackAnalysis,
    loading: eventsLoading || analysisLoading,
    error: analysisError,
    hasAI: !analysisError,
  };
}
```

## Recommended Architecture for Phantom Trail

### 1. Enhanced Hook Structure

```typescript
// Core data hooks
export function useTrackingEvents() {
  const [events] = useStorage<TrackingEvent[]>('phantom_trail_events', []);
  return useEventWindow(events, 50); // Last 50 events
}

export function useNetworkData() {
  const events = useTrackingEvents();
  return useNetworkGraph(events);
}

export function useAIAnalysis(events: TrackingEvent[]) {
  const { execute, ...state } = useRetryableOperation(() =>
    AIEngine.generateNarrative(events)
  );

  useEffect(() => {
    if (events.length > 0) {
      execute();
    }
  }, [events.length, execute]);

  return state;
}

// Composite hook
export function useLiveNarrative() {
  const events = useTrackingEvents();
  const throttledEvents = useThrottledEvents(events, 2000);
  const analysis = useAIAnalysis(throttledEvents);

  return {
    events: throttledEvents,
    ...analysis,
  };
}
```

### 2. Background Script Optimization

```typescript
// Enhanced background script with better event management
export default defineBackground({
  main() {
    const eventBuffer = new Map<string, TrackingEvent>();
    const FLUSH_INTERVAL = 2000; // 2 seconds

    // Batch events to reduce storage writes
    setInterval(async () => {
      if (eventBuffer.size > 0) {
        const events = Array.from(eventBuffer.values());
        eventBuffer.clear();

        const existingEvents = await StorageManager.getRecentEvents(999);
        const updatedEvents = [...existingEvents, ...events];

        await chrome.storage.local.set({
          phantom_trail_events: updatedEvents,
        });
      }
    }, FLUSH_INTERVAL);

    chrome.webRequest.onBeforeRequest.addListener(
      details => {
        const event = processRequest(details);
        if (event) {
          eventBuffer.set(event.id, event);
        }
      },
      { urls: ['<all_urls>'] }
    );
  },
});
```

### 3. Component Optimization

```typescript
// Optimized LiveNarrative component
export const LiveNarrative = memo(function LiveNarrative() {
  const { events, analysis, loading, error } = useLiveNarrative();

  const eventComponents = useMemo(() =>
    events.map(event => (
      <EventDisplay key={event.id} event={event} />
    )),
    [events]
  );

  return (
    <div className="space-y-4">
      {analysis && <AnalysisDisplay analysis={analysis} />}
      {error && <ErrorDisplay error={error} />}
      <div className="max-h-64 overflow-y-auto">
        {eventComponents}
      </div>
      {loading && <LoadingIndicator />}
    </div>
  );
});
```

## Performance Considerations

### Memory Management

- Limit stored events (keep last 1000, auto-cleanup older than 7 days)
- Use weak references for event listeners
- Implement proper cleanup in useEffect hooks

### Network Efficiency

- Batch API calls to AI service
- Implement request deduplication
- Use compression for large payloads

### UI Responsiveness

- Virtualize large lists
- Debounce user inputs
- Use React.memo for expensive components
- Implement skeleton loading states

## Testing Strategies

### Unit Tests

```typescript
describe('useStorage hook', () => {
  it('should sync with Chrome storage changes', async () => {
    const { result } = renderHook(() => useStorage('test_key', []));

    // Simulate storage change
    act(() => {
      chrome.storage.onChanged.callListeners(
        {
          test_key: { newValue: [{ id: '1' }] },
        },
        'local'
      );
    });

    expect(result.current[0]).toEqual([{ id: '1' }]);
  });
});
```

### Integration Tests

```typescript
describe('Live narrative flow', () => {
  it('should update UI when new tracking events arrive', async () => {
    render(<LiveNarrative />);

    // Simulate background script adding event
    await chrome.storage.local.set({
      phantom_trail_events: [mockTrackingEvent]
    });

    await waitFor(() => {
      expect(screen.getByText(mockTrackingEvent.domain)).toBeInTheDocument();
    });
  });
});
```

## Conclusion

The current Phantom Trail architecture demonstrates solid patterns for real-time data updates in Chrome extensions. Key recommendations for enhancement:

1. **Implement batching** for storage operations to reduce write frequency
2. **Add virtualization** for large event lists
3. **Enhance error handling** with retry logic and graceful degradation
4. **Consider Zustand** for complex state management needs
5. **Optimize AI analysis** with better caching and request deduplication

These patterns ensure scalable, performant real-time updates while maintaining excellent user experience and system reliability.
