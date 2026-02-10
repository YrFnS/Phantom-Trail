import React from 'react';
import {
    FeedIcon,
    NetworkIcon,
    DashboardIcon,
    ChatIcon,
    CoachIcon,
    CommunityIcon,
} from '../icons';

export type ViewType =
    | 'narrative'
    | 'network'
    | 'dashboard'
    | 'chat'
    | 'coach'
    | 'community';

export interface NavItem {
    id: ViewType;
    label: string;
    icon: React.FC<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
    { id: 'narrative', label: 'Feed', icon: FeedIcon },
    { id: 'network', label: 'Map', icon: NetworkIcon },
    { id: 'dashboard', label: 'Stats', icon: DashboardIcon },
    { id: 'chat', label: 'AI', icon: ChatIcon },
    { id: 'coach', label: 'Coach', icon: CoachIcon },
    { id: 'community', label: 'Peers', icon: CommunityIcon },
];

interface NavButtonProps {
    item: NavItem;
    isActive: boolean;
    onClick: () => void;
}

export const NavButton: React.FC<NavButtonProps> = ({
    item,
    isActive,
    onClick,
}) => {
    const Icon = item.icon;

    return (
        <button
            onClick={onClick}
            className={`h-12 flex flex-col items-center justify-center rounded-r-lg transition-all text-[9px] ${isActive
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-l-2 border-[var(--accent-primary)] shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
        >
            <Icon className="w-4 h-4 mb-0.5" />
            <span>{item.label}</span>
        </button>
    );
};
