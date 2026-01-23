import {
  P2PRecommendation,
  CommunityStats,
  P2PSettings,
} from '../../lib/types';

export interface CommunityInsightsProps {
  userScore: number;
  userGrade: string;
  onNetworkStatusChange?: (isConnected: boolean, peerCount: number) => void;
}

export interface NetworkStatusIndicatorProps {
  isConnected: boolean;
  peerCount: number;
  networkStatus: string;
}

export interface PeerRecommendationProps {
  recommendation: P2PRecommendation;
  onApply?: (recommendation: P2PRecommendation) => void;
}

export interface CommunityStatsDisplayProps {
  stats: CommunityStats;
  userScore: number;
  userGrade: string;
}

export interface P2PSettingsProps {
  settings: P2PSettings;
  onSettingsChange: (settings: P2PSettings) => void;
  isLoading?: boolean;
}

export interface NetworkConnectionProps {
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
  isEnabled: boolean;
  isLoading: boolean;
}
