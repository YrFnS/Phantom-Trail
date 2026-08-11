/** Component-specific interfaces for the Evidence Explorer. */

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
  generateAggregateSummary: () => Promise<void>;
  clearChat: () => void;
}

export interface MessageDisplayProps {
  message: ChatMessage;
}
