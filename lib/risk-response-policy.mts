export interface EvidenceScoreDisplay {
  status: 'insufficient-evidence' | 'estimated';
  score: number | null;
  grade: string;
}

export function formatEvidenceIndexValue(
  score: EvidenceScoreDisplay
): string {
  return score.status === 'estimated' && score.score !== null
    ? `${score.score}/100 (${score.grade})`
    : 'N/A — insufficient evidence';
}
