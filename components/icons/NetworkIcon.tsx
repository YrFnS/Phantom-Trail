import React from 'react';

interface IconProps {
    className?: string;
}

export const NetworkIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
    >
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M13.5 10.5l4-4M10.5 13.5l-4 4M13.5 13.5l4 4" />
    </svg>
);
