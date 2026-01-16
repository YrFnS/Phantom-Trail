import { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useChat } from './ChatInterface.hooks';
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
        <div className={`max-w-[75%] px-2.5 py-1.5 rounded-lg text-xs ${
          isUser
            ? 'bg-hud text-terminal border border-plasma/30'
            : 'bg-dark-700/50 text-gray-200 border border-dark-600/50'
        }`}>
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${isUser ? 'text-purple-300' : 'text-gray-500'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
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
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Assistant</h2>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[10px] text-gray-500 hover:text-gray-400"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-2 space-y-2 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-16">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-600 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-xs mb-1">Ask about your privacy</p>
            <p className="text-[10px] text-gray-600">
              Try: &ldquo;What trackers did I see?&rdquo;
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageDisplay key={message.id} message={message} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-dark-700/50 border border-dark-600/50 px-2 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                  <LoadingSpinner size="sm" />
                  <span className="text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-yellow-500/10 border-l-2 border-yellow-500 mb-2 rounded text-xs text-yellow-400">
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
          placeholder="Ask about your privacy..."
          className="flex-1 px-2 py-1.5 bg-dark-700/50 border border-dark-600/50 rounded-md text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="px-3 py-1.5 bg-hud border border-plasma/30 hover:border-plasma hover:shadow-[0_0_10px_rgba(188,19,254,0.4)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-medium text-terminal transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
