import { useState, useCallback } from 'react';
import { AIAnalysisPrompts } from '../../lib/ai-analysis-prompts';
import type { ChatMessage, ChatHookReturn } from './ChatInterface.types';

/**
 * Hook for managing chat state and API integration
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
            'Unable to process your request. Please try asking about tracking patterns, privacy risks, or specific trackers.'
          );
        }
      } catch (err) {
        console.error('Chat message failed:', err);
        setError(
          'Failed to process your request. Please try again or check your API key for AI features.'
        );
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
