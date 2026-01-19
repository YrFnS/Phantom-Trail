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

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];
  private monitoringInterval?: ReturnType<typeof setInterval>;
  private cpuSamples: number[] = [];
  private renderSamples: number[] = [];

  private constructor() {
    this.metrics = {
      cpu: { averageUsage: 0, peakUsage: 0, backgroundUsage: 0, contentScriptUsage: 0 },
      memory: { totalUsage: 0, heapUsage: 0, cacheUsage: 0, eventStorageUsage: 0 },
      rendering: { frameRate: 60, renderTime: 0, layoutShifts: 0, paintTime: 0 },
      timestamp: Date.now()
    };
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
    const startTime = performance.now();
    
    // Simulate CPU-intensive task to measure overhead
    let iterations = 0;
    const testDuration = 10; // ms
    const endTime = startTime + testDuration;
    
    while (performance.now() < endTime) {
      iterations++;
    }
    
    const actualTime = performance.now() - startTime;
    const efficiency = testDuration / actualTime;
    const usage = Math.max(0, (1 - efficiency) * 100);
    
    this.cpuSamples.push(usage);
    if (this.cpuSamples.length > 60) { // Keep last 60 samples
      this.cpuSamples.shift();
    }
    
    const averageUsage = this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length;
    const peakUsage = Math.max(...this.cpuSamples);
    
    this.metrics.cpu = {
      averageUsage,
      peakUsage,
      backgroundUsage: averageUsage * 0.3, // Estimate
      contentScriptUsage: averageUsage * 0.7 // Estimate
    };
    
    return this.metrics.cpu;
  }

  async measureMemoryUsage(): Promise<MemoryMetrics> {
    let heapUsage = 0;
    
    // Check if we're in a service worker context
    const isServiceWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    
    if (!isServiceWorker && typeof window !== 'undefined') {
      const performance = (window as any).performance;
      if (performance?.memory) {
        heapUsage = performance.memory.usedJSHeapSize;
      }
    }
    
    // Estimate cache usage (would need integration with CacheOptimizer)
    const cacheUsage = 0; // Placeholder
    
    // Get storage usage
    let eventStorageUsage = 0;
    try {
      if (chrome?.storage?.local) {
        eventStorageUsage = await chrome.storage.local.getBytesInUse();
      }
    } catch (error) {
      console.warn('Could not measure storage usage:', error);
    }
    
    this.metrics.memory = {
      totalUsage: heapUsage + cacheUsage + eventStorageUsage,
      heapUsage,
      cacheUsage,
      eventStorageUsage
    };
    
    return this.metrics.memory;
  }

  async trackRenderPerformance(): Promise<RenderMetrics> {
    // Check if we're in a browser context
    const isServiceWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    const isBrowser = typeof window !== 'undefined';
    
    if (!isBrowser || isServiceWorker) {
      // Return default metrics for service worker context
      return this.metrics.rendering;
    }

    return new Promise((resolve) => {
      let frameCount = 0;
      let lastTime = performance.now();
      
      const measureFrame = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime >= 1000) { // Measure over 1 second
          const fps = Math.round((frameCount * 1000) / deltaTime);
          
          this.metrics.rendering.frameRate = fps;
          this.renderSamples.push(fps);
          
          if (this.renderSamples.length > 10) {
            this.renderSamples.shift();
          }
          
          resolve(this.metrics.rendering);
          return;
        }
        
        frameCount++;
        requestAnimationFrame(measureFrame);
      };
      
      requestAnimationFrame(measureFrame);
    });
  }

  async optimizeForDevice(): Promise<OptimizationSettings> {
    const metrics = await this.getCurrentMetrics();
    
    // Determine optimal settings based on current performance
    const settings: OptimizationSettings = {
      enableVirtualScrolling: true,
      eventBatchSize: 50,
      cacheMaxSize: 100,
      renderThrottleMs: 16, // 60fps
      backgroundTaskInterval: 5000,
      enableLazyLoading: true
    };
    
    // Adjust for low-performance devices
    if (metrics.cpu.averageUsage > 10 || metrics.memory.totalUsage > 200 * 1024 * 1024) {
      settings.eventBatchSize = 25;
      settings.cacheMaxSize = 50;
      settings.renderThrottleMs = 33; // 30fps
      settings.backgroundTaskInterval = 10000;
    }
    
    // Adjust for high-performance devices
    if (metrics.cpu.averageUsage < 2 && metrics.memory.totalUsage < 50 * 1024 * 1024) {
      settings.eventBatchSize = 100;
      settings.cacheMaxSize = 200;
      settings.renderThrottleMs = 8; // 120fps
      settings.backgroundTaskInterval = 2000;
    }
    
    return settings;
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = await this.getCurrentMetrics();
    const recommendations: string[] = [];
    let score = 100;
    
    // CPU usage scoring
    if (metrics.cpu.averageUsage > 10) {
      score -= 30;
      recommendations.push('High CPU usage detected. Consider enabling battery saver mode.');
    } else if (metrics.cpu.averageUsage > 5) {
      score -= 15;
      recommendations.push('Moderate CPU usage. Monitor performance during heavy browsing.');
    }
    
    // Memory usage scoring
    const memoryMB = metrics.memory.totalUsage / (1024 * 1024);
    if (memoryMB > 200) {
      score -= 25;
      recommendations.push('High memory usage. Clear cache or reduce event history.');
    } else if (memoryMB > 100) {
      score -= 10;
      recommendations.push('Moderate memory usage. Consider periodic cache cleanup.');
    }
    
    // Rendering performance scoring
    if (metrics.rendering.frameRate < 30) {
      score -= 20;
      recommendations.push('Low frame rate detected. Disable animations or reduce visual effects.');
    } else if (metrics.rendering.frameRate < 50) {
      score -= 10;
      recommendations.push('Frame rate could be improved. Consider performance optimizations.');
    }
    
    // Determine grade
    let grade: PerformanceReport['grade'];
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 65) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent! No optimizations needed.');
    }
    
    return {
      metrics,
      recommendations,
      score: Math.max(0, score),
      grade
    };
  }

  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    await Promise.all([
      this.measureCPUUsage(),
      this.measureMemoryUsage(),
      this.trackRenderPerformance()
    ]);
    
    this.metrics.timestamp = Date.now();
    return { ...this.metrics };
  }

  private setupPerformanceObservers(): void {
    // Check if we're in a browser context (not service worker)
    const isServiceWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    const isBrowser = typeof window !== 'undefined';
    
    if (!isBrowser || isServiceWorker) {
      // Skip performance observers in service worker context
      return;
    }

    // Observe paint timing
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.metrics.rendering.paintTime = entry.startTime;
          }
        }
      });
      
      try {
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (error) {
        console.warn('Paint observer not supported:', error);
      }
      
      // Observe layout shifts
      const layoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.metrics.rendering.layoutShifts++;
          }
        }
      });
      
      try {
        layoutObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported:', error);
      }
    }
  }

  private startCPUMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.measureCPUUsage().catch(console.error);
    }, 5000);
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.measureMemoryUsage().catch(console.error);
    }, 10000);
  }
}

// Task scheduling for CPU optimization
export interface Task {
  id: string;
  execute: () => Promise<void>;
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
}

export class TaskScheduler {
  private taskQueue: Task[] = [];
  private isProcessing: boolean = false;
  private maxConcurrent: number = 3;
  private activeTasks: Set<string> = new Set();

  async scheduleTask(task: Task): Promise<void> {
    this.taskQueue.push(task);
    this.sortQueue();
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private sortQueue(): void {
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.maxConcurrent) {
      const task = this.taskQueue.shift();
      if (!task) break;
      
      this.activeTasks.add(task.id);
      
      // Execute task with timeout
      const executeWithTimeout = async () => {
        try {
          if (task.timeout) {
            await Promise.race([
              task.execute(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Task timeout')), task.timeout)
              )
            ]);
          } else {
            await task.execute();
          }
        } catch (error) {
          console.error(`Task ${task.id} failed:`, error);
        } finally {
          this.activeTasks.delete(task.id);
        }
      };
      
      // Run low priority tasks when idle
      if (task.priority === 'low') {
        this.runWhenIdle(executeWithTimeout);
      } else {
        executeWithTimeout();
      }
      
      // Yield control periodically
      if (this.taskQueue.length % 5 === 0) {
        await this.yieldControl();
      }
    }
    
    this.isProcessing = false;
    
    // Continue processing if more tasks arrived
    if (this.taskQueue.length > 0) {
      setTimeout(() => this.processQueue(), 10);
    }
  }

  private runWhenIdle(task: () => Promise<void>): void {
    const isServiceWorker = typeof window === 'undefined' && typeof self !== 'undefined';
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser && !isServiceWorker && 'requestIdleCallback' in window) {
      requestIdleCallback(async (deadline) => {
        if (deadline.timeRemaining() > 5) {
          await task();
        } else {
          // Reschedule if not enough time
          setTimeout(() => this.runWhenIdle(task), 100);
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback or service workers
      setTimeout(task, 0);
    }
  }

  private yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  getQueueStatus() {
    return {
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      isProcessing: this.isProcessing
    };
  }
}
