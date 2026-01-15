import type { PrivacyScore as PrivacyScoreType } from '../../lib/privacy-score';

export interface PrivacyScoreProps {
  score: PrivacyScoreType;
  trend?: 'improving' | 'declining' | 'stable';
  showBreakdown?: boolean;
  className?: string;
}

export interface PrivacyScoreBadgeProps {
  score: number;
  grade: PrivacyScoreType['grade'];
  color: PrivacyScoreType['color'];
  size?: 'sm' | 'md' | 'lg';
}
