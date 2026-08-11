import { useState, useCallback } from 'react';
import { AIAnalysisPrompts } from '../../lib/ai-analysis-prompts';
import type { ChatMessage, ChatHookReturn } from './ChatInterface.types';

export function useChat(): ChatHookReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const appendAssistant = useCallback((content: string) => {
    setMessages(previous => [
      ...previous,
      {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'assistant',
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (messageContent: string) => {
      const normalized = messageContent.trim();
      if (!normalized || loading) return;

      setMessages(previous => [
        ...previous,
        {
          id: `user-${Date.now()}`,
          type: 'user',
          content: normalized,
          timestamp: Date.now(),
        },
      ]);
      setInputValue('');
      setLoading(true);
      setError(null);

      try {
        appendAssistant(await AIAnalysisPrompts.processQuery(normalized));
      } catch (queryError) {
        console.error('Evidence Explorer query failed:', queryError);
        setError(
          'The local Evidence Explorer could not process this query. No external request was made.'
        );
      } finally {
        setLoading(false);
      }
    },
    [appendAssistant, loading]
  );

  const generateAggregateSummary = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setMessages(previous => [
      ...previous,
      {
        id: `user-summary-${Date.now()}`,
        type: 'user',
        content: 'Generate optional OpenRouter aggregate summary',
        timestamp: Date.now(),
      },
    ]);

    try {
      appendAssistant(
        await AIAnalysisPrompts.generateOptionalAggregateSummary()
      );
    } catch (summaryError) {
      console.error('Optional aggregate summary failed:', summaryError);
      setError(
        'The optional aggregate summary failed. No privacy conclusion was produced.'
      );
    } finally {
      setLoading(false);
    }
  }, [appendAssistant, loading]);

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
    generateAggregateSummary,
    clearChat,
  };
}
