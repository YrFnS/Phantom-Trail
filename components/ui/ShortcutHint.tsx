import React from 'react';

interface ShortcutHintProps {
  shortcut: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({ 
  shortcut, 
  className = '',
  size = 'sm'
}) => {
  const keys = shortcut.split('+');
  const sizeClasses = size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-1';

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className={`bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded font-mono ${sizeClasses}`}>
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-[var(--text-tertiary)] text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
