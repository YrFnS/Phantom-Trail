import { useChat } from './ChatInterface.hooks';
import type { ChatInterfaceProps, MessageDisplayProps } from './ChatInterface.types';

/**
 * Individual message display component
 */
function MessageDisplay({ message }: MessageDisplayProps) {
  const isUser = message.type === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900 border'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !loading) {
      sendMessage(inputValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Privacy Assistant</h2>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Clear chat"
            >
              Clear
            </button>
          )}
        </div>

        <div className="h-64 overflow-y-auto p-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">Ask me about your privacy!</p>
              <p className="text-xs mt-2 text-gray-400">
                Try: "What trackers did I encounter today?" or "Is this website safe?"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(message => (
                <MessageDisplay key={message.id} message={message} />
              ))}
              
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="bg-gray-100 border px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-2 bg-yellow-50 border-t border-yellow-200">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your privacy..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
