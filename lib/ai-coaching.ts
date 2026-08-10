import type {
  PersonalizedInsights,
  PrivacyAchievement,
} from './privacy-insights';
import { PrivacyInsights } from './privacy-insights';
import { BaseStorage } from './storage/base-storage';

export interface PrivacyGoal {
  id: string;
  type: 'score_improvement' | 'tracker_reduction' | 'category_avoidance';
  target: number;
  current: number;
  deadline: Date;
  description: string;
  suggestions: string[];
  createdAt: number;
  completed?: boolean;
}

export interface ProgressReport {
  goalsProgress: Array<{
    goal: PrivacyGoal;
    progressPercentage: number;
    onTrack: boolean;
    daysRemaining: number;
  }>;
  overallProgress: number;
  newAchievements: PrivacyAchievement[];
  motivationalMessage: string;
}

export interface WeeklyCoachingReport {
  summary: {
    averageScore: number | null;
    scoreChange: number | null;
    goalsProgress: number;
    newAchievements: string[];
  };
  insights: {
    patterns: string[];
    improvements: string[];
    concerns: string[];
  };
  nextWeekFocus: {
    primaryGoal: string;
    actionItems: string[];
    toolSuggestions: string[];
  };
}

export interface UserPreferences {
  privacyLevel: 'basic' | 'intermediate' | 'advanced';
  focusAreas: string[];
  coachingStyle: 'encouraging' | 'direct' | 'educational';
  notificationFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Compatibility coaching API.
 * P2 prevents this legacy module from turning N/A into a score or claiming
 * measured privacy progress. Automatic goal generation remains deferred to P4.
 */
export class PrivacyCoach {
  private static readonly GOALS_STORAGE_KEY = 'privacyGoals';
  private static readonly PREFERENCES_STORAGE_KEY = 'coachingPreferences';
  private static readonly ACHIEVEMENTS_STORAGE_KEY = 'privacyAchievements';

  static async generatePersonalizedInsights(): Promise<PersonalizedInsights> {
    return await PrivacyInsights.generatePersonalizedInsights();
  }

  static async createPrivacyGoals(
    userPreferences: UserPreferences
  ): Promise<PrivacyGoal[]> {
    void userPreferences;
    const insights = await this.generatePersonalizedInsights();

    // Automatic score-optimization goals are intentionally disabled. An N/A
    // result cannot produce a target, and an estimated index is not a verified
    // measure of privacy improvement.
    const goals: PrivacyGoal[] = [];
    await BaseStorage.set(this.GOALS_STORAGE_KEY, goals);

    if (insights.browsingPattern.scoreStatus === 'insufficient-evidence') {
      console.log(
        '[Phantom Trail] No automatic coaching goals: evidence index is N/A'
      );
    } else {
      console.log(
        '[Phantom Trail] Automatic score goals remain disabled for experimental evidence indices'
      );
    }
    return goals;
  }

  static async getPrivacyGoals(): Promise<PrivacyGoal[]> {
    return (
      (await BaseStorage.get<PrivacyGoal[]>(this.GOALS_STORAGE_KEY)) || []
    );
  }

  static async updateGoalProgress(
    goalId: string,
    newCurrent: number
  ): Promise<void> {
    const goals = await this.getPrivacyGoals();
    const goalIndex = goals.findIndex(goal => goal.id === goalId);
    if (goalIndex === -1) return;

    goals[goalIndex].current = newCurrent;
    if (
      goals[goalIndex].type === 'score_improvement' &&
      newCurrent >= goals[goalIndex].target
    ) {
      goals[goalIndex].completed = true;
    } else if (
      goals[goalIndex].type === 'tracker_reduction' &&
      newCurrent <= goals[goalIndex].target
    ) {
      goals[goalIndex].completed = true;
    }
    await BaseStorage.set(this.GOALS_STORAGE_KEY, goals);
  }

  static async trackProgress(goals: PrivacyGoal[]): Promise<ProgressReport> {
    const insights = await this.generatePersonalizedInsights();
    const now = Date.now();
    const goalsProgress = goals.map(goal => {
      let progressPercentage = 0;

      if (
        goal.type === 'score_improvement' &&
        insights.browsingPattern.averagePrivacyScore !== null
      ) {
        const totalImprovement = goal.target - goal.current;
        const currentImprovement =
          insights.browsingPattern.averagePrivacyScore - goal.current;
        progressPercentage =
          totalImprovement > 0
            ? Math.min((currentImprovement / totalImprovement) * 100, 100)
            : 0;
      } else if (goal.type === 'tracker_reduction') {
        const totalReduction = goal.current - goal.target;
        const currentReduction =
          goal.current - insights.browsingPattern.totalOccurrences;
        progressPercentage =
          totalReduction > 0
            ? Math.min((currentReduction / totalReduction) * 100, 100)
            : 0;
      }

      const daysRemaining = Math.ceil(
        (goal.deadline.getTime() - now) / (24 * 60 * 60 * 1000)
      );
      const boundedProgress = Math.max(0, progressPercentage);
      return {
        goal,
        progressPercentage: boundedProgress,
        onTrack: boundedProgress >= 100 - (Math.max(0, daysRemaining) / 14) * 100,
        daysRemaining: Math.max(0, daysRemaining),
      };
    });
    const overallProgress =
      goalsProgress.length > 0
        ? goalsProgress.reduce(
            (total, entry) => total + entry.progressPercentage,
            0
          ) / goalsProgress.length
        : 0;

    return {
      goalsProgress,
      overallProgress,
      newAchievements: [],
      motivationalMessage: this.generateMotivationalMessage(
        overallProgress,
        insights
      ),
    };
  }

  static async generateWeeklyReport(): Promise<WeeklyCoachingReport> {
    const insights = await this.generatePersonalizedInsights();
    const goals = await this.getPrivacyGoals();
    const progress = await this.trackProgress(goals);

    return {
      summary: {
        averageScore: insights.browsingPattern.averagePrivacyScore,
        scoreChange: insights.privacyTrends.scoreChange,
        goalsProgress: progress.overallProgress,
        newAchievements: [],
      },
      insights: {
        patterns: [
          `Peak recorded-signal hours: ${
            insights.browsingPattern.timePatterns.peakRecordedHours.join(', ') ||
            'none'
          }`,
          `Observed page categories: ${
            insights.browsingPattern.observedPageCategories.join(', ') || 'none'
          }`,
          `Evidence-index trend: ${insights.privacyTrends.trendDirection}`,
        ],
        improvements: insights.browsingPattern.reviewAreas,
        concerns: insights.browsingPattern.signalPatterns,
      },
      nextWeekFocus: {
        primaryGoal:
          goals[0]?.description ||
          'Review evidence coverage and detector contributions',
        actionItems: insights.recommendations.slice(0, 3).map(item => item.title),
        toolSuggestions: [],
      },
    };
  }

  static async getUserPreferences(): Promise<UserPreferences> {
    return (
      (await BaseStorage.get<UserPreferences>(
        this.PREFERENCES_STORAGE_KEY
      )) || {
        privacyLevel: 'intermediate',
        focusAreas: [],
        coachingStyle: 'educational',
        notificationFrequency: 'weekly',
      }
    );
  }

  static async saveUserPreferences(
    preferences: UserPreferences
  ): Promise<void> {
    await BaseStorage.set(this.PREFERENCES_STORAGE_KEY, preferences);
  }

  static createPersonalizedPrompt(
    query: string,
    insights: PersonalizedInsights
  ): string {
    const scoreText =
      insights.browsingPattern.averagePrivacyScore === null
        ? 'N/A (insufficient score-qualified evidence)'
        : `${insights.browsingPattern.averagePrivacyScore}/100, ${insights.browsingPattern.scoreConfidence} evidence-coverage confidence`;

    return `
You are summarizing experimental detector evidence. Do not infer total browsing
behavior, identity, intent, website safety, legal compliance, data collection,
sharing, or sale.

Recorded context:
- Evidence index: ${scoreText}
- Evidence units: ${insights.browsingPattern.evidenceUnits}
- Stored rows: ${insights.browsingPattern.totalEvents}
- Aggregated occurrences: ${insights.browsingPattern.totalOccurrences}
- Observed page-category labels: ${insights.browsingPattern.observedPageCategories.join(', ') || 'none'}
- Evidence-index trend: ${insights.privacyTrends.trendDirection}
- Review areas: ${insights.browsingPattern.reviewAreas.join(', ') || 'none'}
- Evidence notes: ${insights.browsingPattern.evidenceNotes.join(' | ') || 'none'}

User question: ${query}

Answer only from the recorded fields. State uncertainty and explain that N/A is
not favorable and model bands are not privacy or safety ratings.
`;
  }

  private static generateMotivationalMessage(
    progress: number,
    insights: PersonalizedInsights
  ): string {
    if (insights.browsingPattern.scoreStatus === 'insufficient-evidence') {
      return 'The evidence index is N/A. Review coverage and exclusions before setting any numeric goal.';
    }
    if (progress >= 80) {
      return 'Most manually stored goal progress is complete. Verify the underlying evidence rather than optimizing the index alone.';
    }
    if (progress > 0) {
      return 'Recorded goal progress changed. This does not establish a real-world privacy improvement.';
    }
    return 'Focus on understanding evidence routes and uncertainty instead of chasing a model band.';
  }

  static async celebrateAchievement(
    achievement: PrivacyAchievement
  ): Promise<void> {
    const achievements =
      (await BaseStorage.get<PrivacyAchievement[]>(
        this.ACHIEVEMENTS_STORAGE_KEY
      )) || [];
    achievements.push(achievement);
    await BaseStorage.set(this.ACHIEVEMENTS_STORAGE_KEY, achievements);
  }

  static async getAchievements(): Promise<PrivacyAchievement[]> {
    return (
      (await BaseStorage.get<PrivacyAchievement[]>(
        this.ACHIEVEMENTS_STORAGE_KEY
      )) || []
    );
  }
}
