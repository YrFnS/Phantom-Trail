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
   * Attempt to reconnect and flush queued events
   */
  private static async attemptReconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    console.log('[Phantom Trail] Attempting reconnection...');

    // Wait for extension to reload
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to flush queue
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
    // Check context before sending
    if (!this.isContextValid()) {
      console.warn('[Phantom Trail] Extension context invalid, queueing event');
      if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
        this.messageQueue.push(event);
      }
      this.attemptReconnect();
      return { success: false, error: 'Context invalidated' };
    }

    try {
      const message: ContentMessage = {
        type: 'tracking-event',
        payload: event,
        timestamp: Date.now(),
      };

      // Add 5-second timeout to prevent hanging
      const response = await Promise.race([
        chrome.runtime.sendMessage(message),
        new Promise<BackgroundResponse>((_, reject) =>
          setTimeout(() => reject(new Error('Message timeout')), 5000)
        ),
      ]);

      return (response as BackgroundResponse) || { success: true };
    } catch (error) {
      const errorMessage = String(error);
      console.error('Failed to send tracking event:', errorMessage);

      // Handle timeout
      if (errorMessage.includes('Message timeout')) {
        console.warn('[Phantom Trail] Message timeout, queueing event');
        if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
          this.messageQueue.push(event);
        }
        return { success: false, error: 'Timeout' };
      }

      // Handle context invalidation
      if (errorMessage.includes('Extension context invalidated')) {
        if (this.messageQueue.length < this.MAX_QUEUE_SIZE) {
          this.messageQueue.push(event);
        }
        this.attemptReconnect();
        return { success: false, error: 'Context invalidated' };
      }

      return { success: false, error: errorMessage };
    }
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
