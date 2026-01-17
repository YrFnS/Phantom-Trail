import { useState, useCallback } from 'react';
import { AIAnalysisPrompts } from '../../lib/ai-analysis-prompts';
import { AIEngine } from '../../lib/ai-engine';
import type { ChatMessage, ChatHookReturn } from './ChatInterface.types';

/**
 * Hook for managing chat state and API integration with rate limit awareness
 */
export function useChat(): ChatHookReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const sendMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || loading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: messageContent.trim(),
        timestamp: Date.now(),
      };

      // Add user message immediately
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setLoading(true);
      setError(null);

      try {
        // Check rate limit status first
        const rateLimitStatus = await AIEngine.getRateLimitStatus();
        if (!rateLimitStatus.canMakeRequest) {
          const waitTime = rateLimitStatus.retryAfter || (rateLimitStatus.resetTime - Date.now());
          const waitSeconds = Math.ceil(waitTime / 1000);
          
          const rateLimitMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: `I'm currently rate limited. Please wait ${waitSeconds} seconds before asking again. You have ${rateLimitStatus.requestsRemaining} requests remaining.`,
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, rateLimitMessage]);
          setLoading(false);
          return;
        }

        const response = await AIAnalysisPrompts.processQuery(messageContent.trim());

        if (response) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: response,
            timestamp: Date.now(),
          };

          setMessages(prev => [...prev, assistantMessage]);
        } else {
          setError(
            'Unable to process your request. This might be due to rate limiting or API issues. Please try asking about tracking patterns, privacy risks, or specific trackers.'
          );
        }
      } catch (err) {
        console.error('Chat message failed:', err);
        
        // Check if it's a rate limit error
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
          const rateLimitMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: 'I\'m currently rate limited by the AI service. Please wait a moment before asking again.',
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, rateLimitMessage]);
        } else {
          setError(
            'Failed to process your request. Please try again or check your API key for AI features.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setInputValue('');
  }, []);

  return {
    messages,
    loading,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    clearChat,
  };
}
