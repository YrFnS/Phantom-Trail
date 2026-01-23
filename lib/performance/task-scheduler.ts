export interface Task {
  id: string;
  priority: 'low' | 'medium' | 'high';
  execute: () => Promise<void>;
  timeout?: number;
}

/**
 * Manages background task scheduling and execution
 */
export class TaskScheduler {
  private queue: Task[] = [];
  private isProcessing = false;

  async scheduleTask(task: Task): Promise<void> {
    this.queue.push(task);
    this.sortQueue();

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private sortQueue(): void {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    this.queue.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;

      try {
        // Yield control to prevent blocking
        await this.yieldControl();

        // Execute task with timeout
        const timeoutMs = task.timeout || 5000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
        );

        await Promise.race([task.execute(), timeoutPromise]);
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error);
      }

      // Run when browser is idle
      this.runWhenIdle(async () => {
        // Continue processing next task
      });
    }

    this.isProcessing = false;
  }

  private runWhenIdle(task: () => Promise<void>): void {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(async () => {
        try {
          await task();
        } catch (error) {
          console.error('Idle task failed:', error);
        }
      });
    } else {
      setTimeout(task, 0);
    }
  }

  private yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      tasksByPriority: {
        high: this.queue.filter(t => t.priority === 'high').length,
        medium: this.queue.filter(t => t.priority === 'medium').length,
        low: this.queue.filter(t => t.priority === 'low').length,
      },
    };
  }
}
