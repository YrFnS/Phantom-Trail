import { useChat } from './ChatInterface.hooks';
import type { ChatInterfaceProps, MessageDisplayProps } from './ChatInterface.types';
import { Card, CardHeader, CardContent, Button, LoadingSpinner } from '../ui';

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
            ? 'bg-phantom-500 text-white'
            : 'bg-gray-100 text-gray-900 border'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-phantom-100' : 'text-gray-500'}`}>
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
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Privacy Assistant</h2>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-gray-700"
                title="Clear chat"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-64 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-3xl mb-3">💬</div>
                <p className="text-sm mb-2">Ask me about your privacy!</p>
                <p className="text-xs text-gray-400">
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
                      <div className="flex items-center space-x-1">
                        <LoadingSpinner size="sm" />
                        <span className="text-gray-600 ml-2">Thinking...</span>
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-phantom-500 focus:border-phantom-500"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || loading}
                size="sm"
              >
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
