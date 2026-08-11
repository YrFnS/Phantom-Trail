import type { PrivacyScore as PrivacyScoreType } from '../../lib/privacy-score';

export interface PrivacyScoreProps {
  score: PrivacyScoreType;
  trend?:
    | 'improving'
    | 'declining'
    | 'stable'
    | 'insufficient-evidence';
  showBreakdown?: boolean;
  className?: string;
}

export interface PrivacyScoreBadgeProps {
  score: number | null;
  grade: PrivacyScoreType['grade'];
  color: PrivacyScoreType['color'];
  confidence?: PrivacyScoreType['confidence'];
  size?: 'sm' | 'md' | 'lg';
}
