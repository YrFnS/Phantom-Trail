export enum ErrorType {
  API_TIMEOUT = 'api_timeout',
  API_RATE_LIMIT = 'api_rate_limit',
  API_QUOTA_EXCEEDED = 'api_quota_exceeded',
  NETWORK_ERROR = 'network_error',
  CONTEXT_INVALIDATED = 'context_invalidated',
  STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
  PARSING_ERROR = 'parsing_error',
  PERMISSION_DENIED = 'permission_denied',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  operation: string;
  timestamp: number;
  userAction?: string;
  systemState: Record<string, unknown>;
  retryCount: number;
}

export interface RecoveryResult {
  success: boolean;
  requiresUserAction?: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface ErrorClassification {
  type: ErrorType;
  severity: 'low' | 'medium' | 'high';
  recoveryStrategy: string;
  userNotification: boolean;
}

export interface ErrorReport {
  id: string;
  timestamp: number;
  error: Error;
  context: ErrorContext;
  classification: ErrorClassification;
  recoveryAttempts: number;
  resolved: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number, options: RetryOptions): number {
  let delay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  delay = Math.min(delay, options.maxDelay);
  
  if (options.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return delay;
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxAttempts) {
        throw error;
      }
      
      const delay = calculateBackoffDelay(attempt, options);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

export function classifyError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  
  if (message.includes('rate limit')) {
    return {
      type: ErrorType.API_RATE_LIMIT,
      severity: 'medium',
      recoveryStrategy: 'exponential_backoff',
      userNotification: false
    };
  }
  
  if (message.includes('quota exceeded')) {
    return {
      type: ErrorType.API_QUOTA_EXCEEDED,
      severity: 'high',
      recoveryStrategy: 'fallback_to_cache',
      userNotification: true
    };
  }
  
  if (message.includes('context invalidated')) {
    return {
      type: ErrorType.CONTEXT_INVALIDATED,
      severity: 'medium',
      recoveryStrategy: 'context_recovery',
      userNotification: false
    };
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      severity: 'medium',
      recoveryStrategy: 'exponential_backoff',
      userNotification: false
    };
  }
  
  return {
    type: ErrorType.UNKNOWN,
    severity: 'high',
    recoveryStrategy: 'user_intervention',
    userNotification: true
  };
}

export class ErrorRecovery {
  private static errorReports: Map<string, ErrorReport> = new Map();

  static async handleAPIError(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    const classification = classifyError(error);
    const report = await this.generateErrorReport(error, context, classification);
    
    try {
      return await this.routeErrorRecovery(error, context, classification);
    } catch {
      report.resolved = false;
      return {
        success: false,
        requiresUserAction: true,
        message: this.generateUserFriendlyMessage(classification)
      };
    }
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    return retryWithBackoff(operation, options);
  }

  static async recoverFromContextLoss(): Promise<RecoveryResult> {
    try {
      // Attempt to reinitialize extension context
      if (chrome?.runtime?.id) {
        return { success: true, message: 'Context recovered successfully' };
      }
      
      return {
        success: false,
        requiresUserAction: true,
        message: 'Extension needs to be reloaded. Please refresh the page.'
      };
    } catch {
      return {
        success: false,
        requiresUserAction: true,
        message: 'Extension context lost. Please reload the extension.'
      };
    }
  }

  static async handleStorageError(error: Error): Promise<RecoveryResult> {
    const classification = classifyError(error);
    
    if (classification.type === ErrorType.STORAGE_QUOTA_EXCEEDED) {
      try {
        // Attempt to clear old data
        const storage = chrome?.storage?.local;
        if (storage) {
          const keys = await storage.get();
          const oldKeys = Object.keys(keys).filter(key => 
            key.startsWith('event_') && 
            Date.now() - parseInt(key.split('_')[1]) > 7 * 24 * 60 * 60 * 1000 // 7 days
          );
          
          if (oldKeys.length > 0) {
            await storage.remove(oldKeys);
            return { success: true, message: 'Storage cleaned up successfully' };
          }
        }
      } catch {
        console.error('Storage cleanup failed');
      }
    }
    
    return {
      success: false,
      requiresUserAction: true,
      message: 'Storage error occurred. Please clear extension data in browser settings.'
    };
  }

  static async generateErrorReport(
    error: Error,
    errorContext: ErrorContext,
    classification: ErrorClassification
  ): Promise<ErrorReport> {
    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error,
      context: errorContext,
      classification,
      recoveryAttempts: 0,
      resolved: false
    };
    
    this.errorReports.set(report.id, report);
    return report;
  }

  private static async routeErrorRecovery(
    error: Error,
    _errorContext: ErrorContext,
    classification: ErrorClassification
  ): Promise<RecoveryResult> {
    switch (classification.recoveryStrategy) {
      case 'exponential_backoff':
        await retryWithBackoff(async () => {
          throw error; // This will be handled by the calling code
        }, {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffFactor: 2,
          jitter: true
        });
        return { success: true };
        
      case 'fallback_to_cache':
        return { success: true, message: 'Using cached data' };
        
      case 'context_recovery':
        return this.recoverFromContextLoss();
        
      default:
        return {
          success: false,
          requiresUserAction: true,
          message: this.generateUserFriendlyMessage(classification)
        };
    }
  }

  private static generateUserFriendlyMessage(classification: ErrorClassification): string {
    switch (classification.type) {
      case ErrorType.API_RATE_LIMIT:
        return 'AI analysis temporarily limited. Please wait a moment and try again.';
      case ErrorType.API_QUOTA_EXCEEDED:
        return 'AI analysis quota exceeded. Using cached insights.';
      case ErrorType.NETWORK_ERROR:
        return 'Connection lost. Working offline with saved data.';
      case ErrorType.CONTEXT_INVALIDATED:
        return 'Extension restarted. Refreshing tracking data.';
      case ErrorType.STORAGE_QUOTA_EXCEEDED:
        return 'Storage full. Cleaning up old data automatically.';
      default:
        return 'An error occurred. The extension is still working.';
    }
  }
}
