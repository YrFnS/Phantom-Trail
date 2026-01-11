/**
 * Component-specific interfaces for ChatInterface
 */

export interface ChatInterfaceProps {
  className?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  inputValue: string;
}

export interface ChatHookReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
}

export interface MessageDisplayProps {
  message: ChatMessage;
}
