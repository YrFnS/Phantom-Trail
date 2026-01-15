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
  static async sendTrackingEvent(
    event: TrackingEvent
  ): Promise<BackgroundResponse> {
    try {
      const message: ContentMessage = {
        type: 'tracking-event',
        payload: event,
        timestamp: Date.now(),
      };

      const response = await chrome.runtime.sendMessage(message);
      return response as BackgroundResponse;
    } catch (error) {
      console.error('Failed to send tracking event:', error);
      return { success: false, error: String(error) };
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
