import React from 'react';

interface AnalysisResultProps {
  content: string;
}

/**
 * Component to render formatted analysis results with markdown-like styling
 */
export function AnalysisResult({ content }: AnalysisResultProps) {
  // Parse the content and apply formatting
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      const key = `line-${index}`;
      
      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key} className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-4 first:mt-0">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-3">
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key} className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2 mt-2">
            {line.substring(4)}
          </h3>
        );
      }
      // Bold text
      else if (line.includes('**')) {
        const parts = line.split('**');
        const formatted = parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part}</strong> : part
        );
        elements.push(
          <p key={key} className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            {formatted}
          </p>
        );
      }
      // List items
      else if (line.startsWith('- ')) {
        elements.push(
          <div key={key} className="flex items-start mb-1">
            <span className="text-blue-500 mr-2 mt-1">•</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
              {formatInlineText(line.substring(2))}
            </span>
          </div>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          elements.push(
            <div key={key} className="flex items-start mb-1">
              <span className="text-blue-500 mr-2 mt-1 font-medium">{match[1]}.</span>
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {formatInlineText(match[2])}
              </span>
            </div>
          );
        }
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(
          <p key={key} className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {formatInlineText(line)}
          </p>
        );
      }
      // Empty lines for spacing
      else {
        elements.push(<div key={key} className="h-2" />);
      }
    });
    
    return elements;
  };

  // Format inline text (bold, risk levels, etc.)
  const formatInlineText = (text: string) => {
    // Handle bold text
    if (text.includes('**')) {
      const parts = text.split('**');
      return parts.map((part, i) => 
        i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part}</strong> : part
      );
    }
    
    // Highlight risk levels
    const riskColors = {
      'critical risk': 'text-red-600 dark:text-red-400 font-medium',
      'high risk': 'text-orange-600 dark:text-orange-400 font-medium',
      'medium risk': 'text-yellow-600 dark:text-yellow-400 font-medium',
      'low risk': 'text-green-600 dark:text-green-400 font-medium',
    };
    
    let formattedText: React.ReactNode = text;
    Object.entries(riskColors).forEach(([risk, className]) => {
      if (typeof formattedText === 'string' && formattedText.toLowerCase().includes(risk)) {
        const regex = new RegExp(`(${risk})`, 'gi');
        const parts = formattedText.split(regex);
        formattedText = parts.map((part, i) => 
          regex.test(part) ? <span key={i} className={className}>{part}</span> : part
        );
      }
    });
    
    return formattedText;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="space-y-1">
        {formatContent(content)}
      </div>
    </div>
  );
}
