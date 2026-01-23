import { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useChat } from './ChatInterface.hooks';
import { AnalysisResult } from './AnalysisResult';
import type {
  ChatInterfaceProps,
  MessageDisplayProps,
} from './ChatInterface.types';
import { LoadingSpinner } from '../ui';

/**
 * Individual message display component
 */
function MessageDisplay({ message }: MessageDisplayProps) {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[90%] ${isUser ? 'max-w-[75%]' : ''}`}>
        {isUser ? (
          <div className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--accent-primary)]/30">
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
            <p className="text-[10px] mt-1 text-[var(--accent-primary)]">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Check if content looks like analysis result (starts with #) */}
            {message.content.startsWith('#') ? (
              <AnalysisResult content={message.content} />
            ) : (
              <div className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] px-2.5 py-1.5 rounded-lg text-xs">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>
            )}
            <p className="text-[10px] text-[var(--text-muted)] px-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Chat Interface component
 */
export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const {
    messages,
    loading,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    clearChat,
  } = useChat();

  const examplePrompts = [
    'Analyze my tracking patterns',
    "What's my privacy risk?",
    'Show me tracking timeline',
    "Audit this website's privacy",
  ];

  const handleExampleClick = (prompt: string) => {
    if (!loading) {
      sendMessage(prompt);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      sendMessage(inputValue);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          Privacy Assistant
        </h2>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-2 space-y-3 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] mt-8">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-xs mb-3 font-medium">Ask about your privacy</p>

            {/* Example prompts */}
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text-muted)] mb-2">
                Try these examples:
              </p>
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className="block w-full text-[10px] text-left px-2 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  disabled={loading}
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageDisplay key={message.id} message={message} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] px-2 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                  <LoadingSpinner size="sm" />
                  <span className="text-[var(--text-tertiary)]">
                    Analyzing...
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-[var(--warning)]/10 border-l-2 border-[var(--warning)] mb-2 rounded text-xs text-[var(--warning)]">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setInputValue(e.target.value)
          }
          onKeyDown={handleKeyPress}
          placeholder="Ask about tracking patterns, privacy risks, or specific trackers..."
          className="flex-1 px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)] hover:shadow-[0_0_10px_rgba(188,19,254,0.4)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium text-[var(--text-primary)] transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
