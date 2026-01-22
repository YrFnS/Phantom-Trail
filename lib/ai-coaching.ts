import type { PersonalizedInsights, PrivacyAchievement } from './privacy-insights';
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
    averageScore: number;
    scoreChange: number;
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

export class PrivacyCoach {
  private static readonly GOALS_STORAGE_KEY = 'privacyGoals';
  private static readonly PREFERENCES_STORAGE_KEY = 'coachingPreferences';
  private static readonly ACHIEVEMENTS_STORAGE_KEY = 'privacyAchievements';

  static async generatePersonalizedInsights(): Promise<PersonalizedInsights> {
    return await PrivacyInsights.generatePersonalizedInsights();
  }

  static async createPrivacyGoals(userPreferences: UserPreferences): Promise<PrivacyGoal[]> {
    const insights = await this.generatePersonalizedInsights();
    const goals: PrivacyGoal[] = [];
    const now = Date.now();
    const twoWeeksFromNow = new Date(now + 14 * 24 * 60 * 60 * 1000);

    // Score improvement goal
    if (insights.browsingPattern.averagePrivacyScore < 85) {
      goals.push({
        id: `score-improvement-${now}`,
        type: 'score_improvement',
        target: Math.min(insights.browsingPattern.averagePrivacyScore + 15, 95),
        current: insights.browsingPattern.averagePrivacyScore,
        deadline: twoWeeksFromNow,
        description: `Improve privacy score to ${Math.min(insights.browsingPattern.averagePrivacyScore + 15, 95)}`,
        suggestions: insights.recommendations.slice(0, 3).map(r => r.title),
        createdAt: now
      });
    }

    // Tracker reduction goal
    if (insights.browsingPattern.totalEvents > 50) {
      const reductionTarget = Math.floor(insights.browsingPattern.totalEvents * 0.7);
      goals.push({
        id: `tracker-reduction-${now}`,
        type: 'tracker_reduction',
        target: reductionTarget,
        current: insights.browsingPattern.totalEvents,
        deadline: twoWeeksFromNow,
        description: `Reduce weekly tracker encounters to ${reductionTarget}`,
        suggestions: [
          'Install an ad blocker',
          'Use privacy-focused browser settings',
          'Avoid high-tracking websites'
        ],
        createdAt: now
      });
    }

    // Category-specific goals based on user preferences
    if (userPreferences.focusAreas.includes('social_media') && 
        insights.browsingPattern.mostVisitedCategories.includes('Social Media')) {
      goals.push({
        id: `social-media-privacy-${now}`,
        type: 'category_avoidance',
        target: 5, // Max 5 social media tracking events per week
        current: insights.browsingPattern.totalEvents, // Simplified for demo
        deadline: twoWeeksFromNow,
        description: 'Improve privacy on social media platforms',
        suggestions: [
          'Use social media containers',
          'Adjust privacy settings',
          'Limit social media browsing time'
        ],
        createdAt: now
      });
    }

    await BaseStorage.set(this.GOALS_STORAGE_KEY, goals);
    return goals;
  }

  static async getPrivacyGoals(): Promise<PrivacyGoal[]> {
    const goals = await BaseStorage.get<PrivacyGoal[]>(this.GOALS_STORAGE_KEY);
    return goals || [];
  }

  static async updateGoalProgress(goalId: string, newCurrent: number): Promise<void> {
    const goals = await this.getPrivacyGoals();
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex !== -1) {
      goals[goalIndex].current = newCurrent;
      
      // Check if goal is completed
      if (goals[goalIndex].type === 'score_improvement' && newCurrent >= goals[goalIndex].target) {
        goals[goalIndex].completed = true;
      } else if (goals[goalIndex].type === 'tracker_reduction' && newCurrent <= goals[goalIndex].target) {
        goals[goalIndex].completed = true;
      }
      
      await BaseStorage.set(this.GOALS_STORAGE_KEY, goals);
    }
  }

  static async trackProgress(goals: PrivacyGoal[]): Promise<ProgressReport> {
    const insights = await this.generatePersonalizedInsights();
    const now = Date.now();
    
    const goalsProgress = goals.map(goal => {
      let progressPercentage = 0;
      let onTrack = true;
      
      if (goal.type === 'score_improvement') {
        const totalImprovement = goal.target - goal.current;
        const currentImprovement = insights.browsingPattern.averagePrivacyScore - goal.current;
        progressPercentage = Math.min((currentImprovement / totalImprovement) * 100, 100);
      } else if (goal.type === 'tracker_reduction') {
        const totalReduction = goal.current - goal.target;
        const currentReduction = goal.current - insights.browsingPattern.totalEvents;
        progressPercentage = Math.min((currentReduction / totalReduction) * 100, 100);
      }
      
      const daysRemaining = Math.ceil((goal.deadline.getTime() - now) / (24 * 60 * 60 * 1000));
      onTrack = progressPercentage >= (100 - (daysRemaining / 14) * 100);
      
      return {
        goal,
        progressPercentage: Math.max(0, progressPercentage),
        onTrack,
        daysRemaining: Math.max(0, daysRemaining)
      };
    });

    const overallProgress = goalsProgress.length > 0 
      ? goalsProgress.reduce((sum, gp) => sum + gp.progressPercentage, 0) / goalsProgress.length
      : 0;

    const motivationalMessage = this.generateMotivationalMessage(overallProgress, insights);

    return {
      goalsProgress,
      overallProgress,
      newAchievements: insights.achievements,
      motivationalMessage
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
        newAchievements: insights.achievements.map(a => a.title)
      },
      insights: {
        patterns: [
          `Most active during ${insights.browsingPattern.timePatterns.peakHours.join(', ')}:00`,
          `Primary categories: ${insights.browsingPattern.mostVisitedCategories.join(', ')}`,
          `Privacy trend: ${insights.privacyTrends.trendDirection}`
        ],
        improvements: insights.browsingPattern.strengths,
        concerns: insights.browsingPattern.riskiestHabits
      },
      nextWeekFocus: {
        primaryGoal: goals.length > 0 ? goals[0].description : 'Set your first privacy goal',
        actionItems: insights.recommendations.slice(0, 3).map(r => r.title),
        toolSuggestions: insights.recommendations
          .filter(r => r.type === 'tool_suggestion')
          .map(r => r.title)
      }
    };
  }

  static async getUserPreferences(): Promise<UserPreferences> {
    const prefs = await BaseStorage.get<UserPreferences>(this.PREFERENCES_STORAGE_KEY);
    return prefs || {
      privacyLevel: 'intermediate',
      focusAreas: [],
      coachingStyle: 'encouraging',
      notificationFrequency: 'weekly'
    };
  }

  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    await BaseStorage.set(this.PREFERENCES_STORAGE_KEY, preferences);
  }

  static createPersonalizedPrompt(query: string, insights: PersonalizedInsights): string {
    const context = `
You are a privacy coach helping a user who:
- Has an average privacy score of ${insights.browsingPattern.averagePrivacyScore}/100
- Primarily visits ${insights.browsingPattern.mostVisitedCategories.join(', ')} sites
- Current privacy trend: ${insights.privacyTrends.trendDirection}
- Main strengths: ${insights.browsingPattern.strengths.join(', ')}
- Areas for improvement: ${insights.browsingPattern.improvementAreas.join(', ')}
- Recent achievements: ${insights.achievements.map(a => a.title).join(', ') || 'None yet'}

User question: ${query}

Provide personalized advice considering their specific patterns and progress.
Be encouraging about their achievements and specific about actionable next steps.
Keep responses concise and focused on privacy improvement.
`;

    return context;
  }

  private static generateMotivationalMessage(progress: number, insights: PersonalizedInsights): string {
    if (progress >= 80) {
      return "🎉 Excellent progress! You're crushing your privacy goals!";
    } else if (progress >= 60) {
      return "💪 Great work! You're making solid progress on your privacy journey.";
    } else if (progress >= 40) {
      return "📈 Good start! Keep building those privacy habits.";
    } else if (insights.privacyTrends.trendDirection === 'improving') {
      return "🌱 Your privacy is improving! Small steps lead to big changes.";
    } else {
      return "🎯 Every privacy step counts! Let's focus on one goal at a time.";
    }
  }

  static async celebrateAchievement(achievement: PrivacyAchievement): Promise<void> {
    // Store achievement for display
    const achievements = await BaseStorage.get<PrivacyAchievement[]>(this.ACHIEVEMENTS_STORAGE_KEY) || [];
    achievements.push(achievement);
    await BaseStorage.set(this.ACHIEVEMENTS_STORAGE_KEY, achievements);
  }

  static async getAchievements(): Promise<PrivacyAchievement[]> {
    return await BaseStorage.get<PrivacyAchievement[]>(this.ACHIEVEMENTS_STORAGE_KEY) || [];
  }
}
