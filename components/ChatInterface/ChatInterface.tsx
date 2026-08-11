import { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useChat } from './ChatInterface.hooks';
import { AnalysisResult } from './AnalysisResult';
import type {
  ChatInterfaceProps,
  MessageDisplayProps,
} from './ChatInterface.types';
import { LoadingSpinner } from '../ui';

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

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const {
    messages,
    loading,
    error,
    inputValue,
    setInputValue,
    sendMessage,
    generateAggregateSummary,
    clearChat,
  } = useChat();

  const examplePrompts = [
    'Analyze signal patterns this week',
    'Show the evidence index',
    'Show the signal timeline',
    'Show signals for example.com',
    'Show the domain profile for google-analytics.com',
  ];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() && !loading) void sendMessage(inputValue);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          Local Evidence Explorer
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

      <div className="mb-2 p-2 rounded border-l-2 border-[var(--success)] bg-[var(--success)]/5 text-[10px] leading-relaxed text-[var(--text-secondary)]">
        Supported queries run locally against retained detector evidence.
        Unsupported text never triggers OpenRouter and receives a list of valid
        query forms instead.
      </div>

      <div className="mb-2 rounded border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-2">
        <button
          type="button"
          onClick={() => void generateAggregateSummary()}
          disabled={loading}
          className="w-full rounded border border-[var(--warning)]/40 bg-[var(--bg-secondary)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--warning)] disabled:opacity-50"
        >
          Generate optional OpenRouter aggregate summary
        </button>
        <p className="mt-1 text-[9px] leading-relaxed text-[var(--text-secondary)]">
          Separate explicit network action. It works only when enabled with a
          credential and sends the aggregate field set disclosed in Settings.
          It does not answer a free-form question.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto mb-2 space-y-3 min-h-[255px]">
        {messages.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] mt-5">
            <p className="text-xs mb-3 font-medium">
              Explore stored evidence locally
            </p>
            <div className="space-y-1.5">
              {examplePrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => !loading && void sendMessage(prompt)}
                  className="block w-full text-[10px] text-left px-2 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  disabled={loading}
                >
                  “{prompt}”
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
                    Processing…
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="p-2 bg-[var(--warning)]/10 border-l-2 border-[var(--warning)] mb-2 rounded text-xs text-[var(--warning)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setInputValue(event.target.value)
          }
          onKeyDown={handleKeyPress}
          placeholder="Enter a supported local query…"
          className="flex-1 px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium text-[var(--text-primary)] transition-all"
        >
          Run
        </button>
      </form>
    </div>
  );
}
