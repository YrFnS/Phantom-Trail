export interface CPUMetrics {
  averageUsage: number;
  peakUsage: number;
  backgroundUsage: number;
  contentScriptUsage: number;
}

export interface MemoryMetrics {
  totalUsage: number;
  heapUsage: number;
  cacheUsage: number;
  eventStorageUsage: number;
}

export interface RenderMetrics {
  frameRate: number;
  renderTime: number;
  layoutShifts: number;
  paintTime: number;
}

export interface PerformanceMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  rendering: RenderMetrics;
  timestamp: number;
}

export interface OptimizationSettings {
  enableVirtualScrolling: boolean;
  eventBatchSize: number;
  cacheMaxSize: number;
  renderThrottleMs: number;
  backgroundTaskInterval: number;
  enableLazyLoading: boolean;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  recommendations: string[];
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export type PerformanceMode = 'high' | 'balanced' | 'battery';

/**
 * Monitors extension performance metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];
  private monitoringInterval?: number;

  private constructor() {
    this.metrics = this.getDefaultMetrics();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    this.setupPerformanceObservers();
    this.startCPUMonitoring();
    this.startMemoryMonitoring();
  }

  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  async measureCPUUsage(): Promise<CPUMetrics> {
    try {
      if (typeof window === 'undefined' || !window.performance) {
        return {
          averageUsage: 0,
          peakUsage: 0,
          backgroundUsage: 0,
          contentScriptUsage: 0,
        };
      }

      const startTime = window.performance.now();

      // Simulate CPU-intensive task to measure performance
      let iterations = 0;
      const testDuration = 100; // ms
      const endTime = startTime + testDuration;

      while (window.performance.now() < endTime) {
        iterations++;
        void (Math.random() * Math.random());
      }

      const actualDuration = window.performance.now() - startTime;
      const efficiency = iterations / actualDuration;

      // Convert to usage percentage (higher efficiency = lower usage)
      const baselineEfficiency = 10000; // Baseline iterations per ms
      const usage = Math.max(
        0,
        Math.min(100, 100 - (efficiency / baselineEfficiency) * 100)
      );

      return {
        averageUsage: usage,
        peakUsage: usage * 1.2,
        backgroundUsage: usage * 0.3,
        contentScriptUsage: usage * 0.7,
      };
    } catch (error) {
      console.error('Failed to measure CPU usage:', error);
      return {
        averageUsage: 0,
        peakUsage: 0,
        backgroundUsage: 0,
        contentScriptUsage: 0,
      };
    }
  }

  async measureMemoryUsage(): Promise<MemoryMetrics> {
    try {
      let memoryInfo: any = {};

      // Try to get memory info from performance API
      if (typeof window !== 'undefined' && 'performance' in window) {
        const perf = window.performance as any;
        memoryInfo = perf.memory || {};
      }

      const totalUsage = memoryInfo.totalJSHeapSize || 0;
      const heapUsage = memoryInfo.usedJSHeapSize || 0;

      // Estimate cache and storage usage
      const cacheUsage = Math.floor(totalUsage * 0.1);
      const eventStorageUsage = Math.floor(totalUsage * 0.05);

      return {
        totalUsage,
        heapUsage,
        cacheUsage,
        eventStorageUsage,
      };
    } catch (error) {
      console.error('Failed to measure memory usage:', error);
      return {
        totalUsage: 0,
        heapUsage: 0,
        cacheUsage: 0,
        eventStorageUsage: 0,
      };
    }
  }

  async trackRenderPerformance(): Promise<RenderMetrics> {
    try {
      if (typeof window === 'undefined' || !window.performance) {
        return { frameRate: 60, renderTime: 0, layoutShifts: 0, paintTime: 0 };
      }

      const entries = window.performance.getEntriesByType('navigation');
      const paintEntries = window.performance.getEntriesByType('paint');

      let renderTime = 0;
      let paintTime = 0;

      if (entries.length > 0) {
        const navEntry = entries[0] as any;
        renderTime = navEntry.loadEventEnd - navEntry.loadEventStart;
      }

      if (paintEntries.length > 0) {
        paintTime = paintEntries[paintEntries.length - 1].startTime;
      }

      return {
        frameRate: 60, // Assume 60fps for now
        renderTime,
        layoutShifts: 0, // Will be updated by observer
        paintTime,
      };
    } catch (error) {
      console.error('Failed to track render performance:', error);
      return {
        frameRate: 60,
        renderTime: 0,
        layoutShifts: 0,
        paintTime: 0,
      };
    }
  }

  async optimizeForDevice(): Promise<OptimizationSettings> {
    const cpuMetrics = await this.measureCPUUsage();
    const memoryMetrics = await this.measureMemoryUsage();

    // Determine optimization level based on performance
    const isLowEnd =
      cpuMetrics.averageUsage > 70 ||
      memoryMetrics.totalUsage > 100 * 1024 * 1024;
    const isMidRange =
      cpuMetrics.averageUsage > 40 ||
      memoryMetrics.totalUsage > 50 * 1024 * 1024;

    if (isLowEnd) {
      return {
        enableVirtualScrolling: true,
        eventBatchSize: 10,
        cacheMaxSize: 50,
        renderThrottleMs: 100,
        backgroundTaskInterval: 5000,
        enableLazyLoading: true,
      };
    } else if (isMidRange) {
      return {
        enableVirtualScrolling: true,
        eventBatchSize: 25,
        cacheMaxSize: 100,
        renderThrottleMs: 50,
        backgroundTaskInterval: 2000,
        enableLazyLoading: true,
      };
    } else {
      return {
        enableVirtualScrolling: false,
        eventBatchSize: 50,
        cacheMaxSize: 200,
        renderThrottleMs: 16,
        backgroundTaskInterval: 1000,
        enableLazyLoading: false,
      };
    }
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = await this.getCurrentMetrics();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (metrics.cpu.averageUsage > 70) {
      recommendations.push('Consider reducing background processing');
    }
    if (metrics.memory.totalUsage > 100 * 1024 * 1024) {
      recommendations.push('Memory usage is high, consider clearing caches');
    }
    if (metrics.rendering.frameRate < 30) {
      recommendations.push('Enable virtual scrolling to improve rendering');
    }

    // Calculate overall score
    const cpuScore = Math.max(0, 100 - metrics.cpu.averageUsage);
    const memoryScore = Math.max(
      0,
      100 - metrics.memory.totalUsage / (1024 * 1024)
    );
    const renderScore = Math.min(100, (metrics.rendering.frameRate / 60) * 100);

    const score = Math.round((cpuScore + memoryScore + renderScore) / 3);

    let grade: PerformanceReport['grade'];
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 65) grade = 'C';
    else if (score >= 55) grade = 'D';
    else grade = 'F';

    return {
      metrics,
      recommendations,
      score,
      grade,
    };
  }

  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const cpu = await this.measureCPUUsage();
    const memory = await this.measureMemoryUsage();
    const rendering = await this.trackRenderPerformance();

    this.metrics = {
      cpu,
      memory,
      rendering,
      timestamp: Date.now(),
    };

    return this.metrics;
  }

  private setupPerformanceObservers(): void {
    try {
      // Layout shift observer
      if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
        const PerformanceObserver = window.PerformanceObserver;
        const layoutShiftObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === 'layout-shift' &&
              !(entry as any).hadRecentInput
            ) {
              this.metrics.rendering.layoutShifts++;
            }
          }
        });

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      }
    } catch (error) {
      console.error('Failed to setup performance observers:', error);
    }
  }

  private startCPUMonitoring(): void {
    // CPU monitoring is done on-demand via measureCPUUsage()
  }

  private startMemoryMonitoring(): void {
    // Memory monitoring is done on-demand via measureMemoryUsage()
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      cpu: {
        averageUsage: 0,
        peakUsage: 0,
        backgroundUsage: 0,
        contentScriptUsage: 0,
      },
      memory: {
        totalUsage: 0,
        heapUsage: 0,
        cacheUsage: 0,
        eventStorageUsage: 0,
      },
      rendering: {
        frameRate: 60,
        renderTime: 0,
        layoutShifts: 0,
        paintTime: 0,
      },
      timestamp: Date.now(),
    };
  }
}
