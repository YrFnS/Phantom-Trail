/**
 * AI Models Configuration
 * Add/remove models here - they'll automatically appear in settings UI
 */

export interface AIModel {
  id: string;
  name: string;
  provider: 'openrouter';
  category: 'free' | 'fast' | 'premium';
  description?: string;
}

export const AI_MODELS: AIModel[] = [
  // Free Models
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b:free',
    name: 'Nemotron 30B',
    provider: 'openrouter',
    category: 'free',
    description: 'Free tier with usage limits',
  },
  {
    id: 'meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B',
    provider: 'openrouter',
    category: 'free',
    description: 'Fast and free',
  },

  // Fast Models
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude Haiku',
    provider: 'openrouter',
    category: 'fast',
    description: 'Fast and cost-effective',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openrouter',
    category: 'fast',
    description: "OpenAI's efficient model",
  },

  // Premium Models
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude Sonnet',
    provider: 'openrouter',
    category: 'premium',
    description: 'Best quality analysis',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openrouter',
    category: 'premium',
    description: "OpenAI's flagship model",
  },
];

// Default model (first free model)
export const DEFAULT_MODEL =
  AI_MODELS.find(m => m.category === 'free')?.id || AI_MODELS[0].id;

// Fallback model (first fast model)
export const FALLBACK_MODEL =
  AI_MODELS.find(m => m.category === 'fast')?.id || AI_MODELS[1].id;
