# Performance Optimization Implementation Plan

## Overview
Optimize extension performance to minimize CPU usage, memory consumption, and impact on browsing experience while maintaining full functionality.

## Technical Requirements

### Implementation Files
- `lib/performance-monitor.ts` - Performance tracking and optimization
- `lib/virtual-scrolling.ts` - Efficient list rendering for large datasets
- `lib/event-pagination.ts` - Paginated event loading and management
- `lib/cache-optimizer.ts` - Intelligent caching and memory management

## Core Implementation

### 1. Performance Monitor (`lib/performance-monitor.ts`)
```typescript
export class PerformanceMonitor {
  static async measureCPUUsage(): Promise<CPUMetrics>
  static async measureMemoryUsage(): Promise<MemoryMetrics>
  static async trackRenderPerformance(): Promise<RenderMetrics>
  static async optimizeForDevice(): Promise<OptimizationSettings>
  static async generatePerformanceReport(): Promise<PerformanceReport>
}
```

### 2. Performance Metrics
```typescript
interface PerformanceMetrics {
  cpu: {
    averageUsage: number; // percentage
    peakUsage: number;
    backgroundUsage: number;
    contentScriptUsage: number;
  };
  memory: {
    totalUsage: number; // MB
    heapUsage: number;
    cacheUsage: number;
    eventStorageUsage: number;
  };
  rendering: {
    frameRate: number; // FPS
    renderTime: number; // ms
    layoutShifts: number;
    paintTime: number;
  };
}
```

### 3. Optimization Settings
```typescript
interface OptimizationSettings {
  enableVirtualScrolling: boolean;
  eventBatchSize: number;
  cacheMaxSize: number;
  renderThrottleMs: number;
  backgroundTaskInterval: number;
  enableLazyLoading: boolean;
}
```

## Implementation Steps

### Phase 1: Virtual Scrolling & Pagination (1 hour)
1. Implement virtual scrolling for Live Narrative event lists
2. Add pagination system for large event datasets
3. Create lazy loading for off-screen components
4. Optimize event rendering with React.memo and useMemo

### Phase 2: Memory Management (45 minutes)
1. Implement LRU cache with automatic eviction
2. Add memory usage monitoring and alerts
3. Create automatic cleanup of old events and cache data
4. Optimize storage operations with batching

### Phase 3: CPU Optimization (30 minutes)
1. Add request throttling and debouncing
2. Implement background task scheduling
3. Optimize AI analysis with intelligent batching
4. Add performance-aware feature toggling

## User Experience

### Performance Settings
- **Performance Mode**: Auto, Balanced, High Performance, Battery Saver
- **Data Limits**: Max events to store (100/500/1000/unlimited)
- **Update Frequency**: Real-time, Every 5s, Every 30s, Manual
- **Visual Effects**: Full, Reduced, Minimal, None

### Performance Indicators
- **CPU Usage**: "Extension using 2.1% CPU"
- **Memory Usage**: "Using 45MB of memory"
- **Performance Score**: "Excellent performance (A+)"
- **Optimization Suggestions**: "Enable battery saver mode to reduce usage"

## Technical Implementation

### 1. Virtual Scrolling System
```typescript
interface VirtualScrollProps {
  items: TrackingEvent[];
  itemHeight: number;
  containerHeight: number;
  overscan: number;
}

function VirtualScrollList({ items, itemHeight, containerHeight, overscan }: VirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;
  
  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <EventItem key={visibleStart + index} event={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 2. Event Pagination System
```typescript
class EventPagination {
  private pageSize: number = 50;
  private currentPage: number = 0;
  private totalEvents: TrackingEvent[] = [];
  
  async loadPage(page: number): Promise<TrackingEvent[]> {
    const start = page * this.pageSize;
    const end = start + this.pageSize;
    
    // Load from storage only if not in memory
    if (!this.isPageLoaded(page)) {
      const pageEvents = await StorageManager.getEventsByRange(start, end);
      this.cachePageEvents(page, pageEvents);
    }
    
    return this.getCachedPage(page);
  }
  
  async loadMore(): Promise<TrackingEvent[]> {
    this.currentPage++;
    return this.loadPage(this.currentPage);
  }
  
  private isPageLoaded(page: number): boolean {
    return this.pageCache.has(page);
  }
}
```

### 3. Memory Management System
```typescript
class MemoryManager {
  private maxMemoryUsage: number = 100 * 1024 * 1024; // 100MB
  private caches: Map<string, LRUCache> = new Map();
  
  async monitorMemoryUsage(): Promise<void> {
    const usage = await this.getCurrentMemoryUsage();
    
    if (usage.total > this.maxMemoryUsage) {
      await this.performCleanup();
    }
  }
  
  private async performCleanup(): Promise<void> {
    // Clear oldest cache entries
    this.caches.forEach(cache => cache.prune());
    
    // Remove old events beyond retention limit
    await StorageManager.cleanupOldEvents();
    
    // Clear unused AI analysis cache
    await AICache.cleanup();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }
}
```

### 4. CPU Usage Optimization
```typescript
class CPUOptimizer {
  private taskQueue: Task[] = [];
  private isProcessing: boolean = false;
  
  async scheduleTask(task: Task, priority: 'high' | 'medium' | 'low'): Promise<void> {
    task.priority = priority;
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      
      // Use requestIdleCallback for non-critical tasks
      if (task.priority === 'low') {
        await this.runWhenIdle(task);
      } else {
        await task.execute();
      }
      
      // Yield control periodically
      if (this.taskQueue.length % 10 === 0) {
        await this.yieldControl();
      }
    }
    
    this.isProcessing = false;
  }
  
  private runWhenIdle(task: Task): Promise<void> {
    return new Promise(resolve => {
      requestIdleCallback(async (deadline) => {
        if (deadline.timeRemaining() > 5) {
          await task.execute();
        } else {
          // Reschedule if not enough time
          this.taskQueue.unshift(task);
        }
        resolve();
      });
    });
  }
}
```

## Performance Optimizations

### React Component Optimization
```typescript
// Memoize expensive components
const EventItem = React.memo(({ event }: { event: TrackingEvent }) => {
  return (
    <div className="event-item">
      <span>{event.domain}</span>
      <span>{event.description}</span>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.event.id === nextProps.event.id;
});

// Use useMemo for expensive calculations
const LiveNarrative = () => {
  const events = useEvents();
  
  const processedEvents = useMemo(() => {
    return events.map(event => ({
      ...event,
      displayText: generateDisplayText(event),
      riskColor: getRiskColor(event.riskLevel)
    }));
  }, [events]);
  
  return <VirtualScrollList items={processedEvents} />;
};
```

### Storage Optimization
```typescript
class OptimizedStorage {
  private writeQueue: StorageOperation[] = [];
  private batchTimeout: number | null = null;
  
  async queueWrite(operation: StorageOperation): Promise<void> {
    this.writeQueue.push(operation);
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.flushWriteQueue();
    }, 100); // Batch writes every 100ms
  }
  
  private async flushWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;
    
    const operations = [...this.writeQueue];
    this.writeQueue = [];
    
    // Batch multiple operations into single storage call
    const batchedData = operations.reduce((acc, op) => {
      acc[op.key] = op.value;
      return acc;
    }, {});
    
    await chrome.storage.local.set(batchedData);
  }
}
```

## Performance Monitoring

### Real-time Metrics
```typescript
class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    cpu: { averageUsage: 0, peakUsage: 0, backgroundUsage: 0, contentScriptUsage: 0 },
    memory: { totalUsage: 0, heapUsage: 0, cacheUsage: 0, eventStorageUsage: 0 },
    rendering: { frameRate: 60, renderTime: 0, layoutShifts: 0, paintTime: 0 }
  };
  
  startMonitoring(): void {
    // Monitor CPU usage
    setInterval(() => {
      this.measureCPUUsage();
    }, 5000);
    
    // Monitor memory usage
    setInterval(() => {
      this.measureMemoryUsage();
    }, 10000);
    
    // Monitor rendering performance
    this.observeRenderingMetrics();
  }
  
  private observeRenderingMetrics(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          this.metrics.rendering.paintTime = entry.startTime;
        } else if (entry.entryType === 'layout-shift') {
          this.metrics.rendering.layoutShifts++;
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint', 'layout-shift'] });
  }
}
```

### Adaptive Performance
```typescript
class AdaptivePerformance {
  private currentMode: 'high' | 'balanced' | 'battery' = 'balanced';
  
  async adjustPerformanceMode(): Promise<void> {
    const metrics = await PerformanceMonitor.getCurrentMetrics();
    
    // Auto-adjust based on system performance
    if (metrics.cpu.averageUsage > 10) {
      this.currentMode = 'battery';
      await this.applyBatteryOptimizations();
    } else if (metrics.memory.totalUsage > 200) {
      this.currentMode = 'balanced';
      await this.applyBalancedOptimizations();
    } else {
      this.currentMode = 'high';
      await this.applyHighPerformanceSettings();
    }
  }
  
  private async applyBatteryOptimizations(): Promise<void> {
    // Reduce update frequency
    await this.setUpdateInterval(30000); // 30 seconds
    
    // Disable animations
    await this.setAnimationsEnabled(false);
    
    // Reduce cache size
    await this.setCacheSize(10 * 1024 * 1024); // 10MB
    
    // Enable aggressive cleanup
    await this.setCleanupInterval(60000); // 1 minute
  }
}
```

## Integration Points

### Settings Integration
- Add performance settings section with mode selection
- Include performance monitoring dashboard
- Provide optimization recommendations
- Add manual cleanup and optimization tools

### Background Script Integration
- Implement performance-aware task scheduling
- Add CPU usage monitoring for background operations
- Optimize tracking detection algorithms
- Implement intelligent batching for AI requests

### UI Component Integration
- Add performance indicators to status bar
- Include performance warnings for resource-intensive operations
- Implement progressive loading for complex visualizations
- Add performance-based feature degradation

## Testing Strategy

### Performance Benchmarking
1. Measure baseline performance metrics
2. Test with various dataset sizes (100, 1000, 10000 events)
3. Benchmark memory usage over extended periods
4. Test CPU usage during intensive operations

### Stress Testing
- Test with maximum event load (10,000+ events)
- Verify performance with multiple tabs open
- Test memory cleanup effectiveness
- Validate performance on low-end devices

### User Experience Testing
- Test perceived performance and responsiveness
- Verify smooth scrolling and animations
- Test loading states and progressive enhancement
- Validate performance settings effectiveness

## Success Metrics
- CPU usage remains below 5% during normal browsing
- Memory usage stays under 100MB with 1000+ events
- UI remains responsive with 60fps rendering
- Extension startup time under 500ms

## Estimated Time: 2.25 hours
- Phase 1: 1 hour (virtual scrolling & pagination)
- Phase 2: 45 minutes (memory management)
- Phase 3: 30 minutes (CPU optimization)

## Future Enhancements
- WebAssembly for computationally intensive operations
- Service worker optimization for background tasks
- Machine learning for predictive performance optimization
- Integration with browser performance APIs
