export interface RiskRecommendationPage {
  domain: string;
  score: {
    score: number | null;
    confidence: string;
  };
  events: number;
}

export function buildRiskRecommendations(
  lowIndexPages: readonly RiskRecommendationPage[],
  insufficientPageCount: number,
  criticalEventCount: number,
  rowCount: number,
  unattributedRows: number
): string[] {
  if (rowCount === 0) {
    return [
      'Collect and inspect evidence before assigning any numeric index or conclusion.',
    ];
  }

  const recommendations: string[] = [];
  const lowestGroup = lowIndexPages[0];

  if (lowestGroup && lowestGroup.score.score !== null) {
    recommendations.push(
      `${lowestGroup.domain} has the largest estimated evidence penalty in this window (${lowestGroup.score.score}/100, ${lowestGroup.score.confidence} coverage confidence). Review its ${lowestGroup.events} occurrences and contribution routes before acting.`
    );
  }

  if (insufficientPageCount > 0) {
    recommendations.push(
      `${insufficientPageCount} attributed page group${
        insufficientPageCount === 1 ? ' is' : 's are'
      } N/A. Do not interpret missing score-qualified evidence as favorable privacy.`
    );
  }

  if (criticalEventCount > 0) {
    recommendations.push(
      `${criticalEventCount} stored rows carry the prototype critical label. Some may be excluded from scoring; inspect detector evidence and attribution rather than treating the label as a verified incident.`
    );
  }

  if (unattributedRows > 0) {
    recommendations.push(
      `${unattributedRows} stored rows lack a visited-page domain and are excluded from page-scoped scoring.`
    );
  }

  recommendations.push(
    'Treat index changes as changes in qualifying recorded evidence, not measured changes in real-world privacy.'
  );
  return recommendations;
}
