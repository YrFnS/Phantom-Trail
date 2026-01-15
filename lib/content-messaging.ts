import type { TrackingEvent } from './types';

export interface ContentMessage {
  type: 'tracking-event' | 'ping';
  payload?: TrackingEvent;
  timestamp: number;
}

export interface BackgroundResponse {
  success: boolean;
  error?: string;
}

export class ContentMessaging {
  private static messageQueue: TrackingEvent[] = [];
  private static isReconnecting = false;
  private static readonly MAX_QUEUE_SIZE = 50;

  /**
   * Check if extension context is still valid
   */
  private static isContextValid(): boolean {
    try {
      return chrome.runtime?.id !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced reconnection with exponential backoff
   */
  private static async attemptReconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    console.log('[Phantom Trail] Attempting reconnection...');

    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts && !this.isContextValid()) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
      
      if (this.isContextValid()) {
        console.log(`[Phantom Trail] Context recovered after ${attempt} attempts`);
        break;
      }
    }

    // Try to flush queue if context is valid
    if (this.isContextValid() && this.messageQueue.length > 0) {
      console.log(
        `[Phantom Trail] Flushing ${this.messageQueue.length} queued events`
      );
      const queue = [...this.messageQueue];
      this.messageQueue = [];

      for (const event of queue) {
        try {
          const message: ContentMessage = {
            type: 'tracking-event',
            payload: event,
            timestamp: Date.now(),
          };
          await chrome.runtime.sendMessage(message);
        } catch (error) {
          console.error('[Phantom Trail] Failed to flush event:', error);
          // Re-queue if still failing
          if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
            this.messageQueue.push(event);
          }
          break; // Stop flushing if still broken
        }
      }
    }

    this.isReconnecting = false;
  }

  static async sendTrackingEvent(
    event: TrackingEvent
  ): Promise<BackgroundResponse> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Check context before each attempt
      if (!this.isContextValid()) {
        console.warn('[Phantom Trail] Context invalid, attempting recovery');
        await this.attemptReconnect();
        
        if (!this.isContextValid()) {
          // Queue event if context still invalid
          if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
            this.messageQueue.push(event);
            console.log(`[Phantom Trail] Event queued (${this.messageQueue.length}/${this.MAX_QUEUE_SIZE})`);
          }
          return { success: false, error: 'Context recovery failed' };
        }
      }

      try {
        const message: ContentMessage = {
          type: 'tracking-event',
          payload: event,
          timestamp: Date.now(),
        };

        // Send with timeout
        const response = await Promise.race([
          chrome.runtime.sendMessage(message),
          new Promise<BackgroundResponse>((_, reject) =>
            setTimeout(() => reject(new Error('Message timeout')), 5000)
          ),
        ]);

        const result = (response as BackgroundResponse) || { success: true };
        
        // Success - flush any queued messages
        if (result.success && this.messageQueue.length > 0) {
          console.log(`[Phantom Trail] Flushing ${this.messageQueue.length} queued events`);
          const queue = [...this.messageQueue];
          this.messageQueue = [];
          
          // Send queued messages in background
          queue.forEach(async (queuedEvent) => {
            try {
              const queuedMessage: ContentMessage = {
                type: 'tracking-event',
                payload: queuedEvent,
                timestamp: Date.now(),
              };
              await chrome.runtime.sendMessage(queuedMessage);
            } catch (error) {
              console.warn('[Phantom Trail] Failed to send queued event:', error);
            }
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = String(error);
        console.warn(`[Phantom Trail] Send attempt ${attempt + 1} failed:`, errorMessage);

        // Handle specific error types
        if (errorMessage.includes('Extension context invalidated') || 
            errorMessage.includes('Could not establish connection')) {
          // Queue event and try recovery
          if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
            this.messageQueue.push(event);
          }
          await this.attemptReconnect();
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    };
  }

  static async ping(): Promise<boolean> {
    try {
      const message: ContentMessage = {
        type: 'ping',
        timestamp: Date.now(),
      };

      const response = await chrome.runtime.sendMessage(message);
      return response?.success === true;
    } catch {
      return false;
    }
  }
}
