import React, { useState, useEffect } from 'react';
import { PrivacyCoach, type PrivacyGoal, type ProgressReport, type WeeklyCoachingReport } from '../../lib/ai-coaching';
import { PrivacyInsights, type PersonalizedInsights } from '../../lib/privacy-insights';

interface PrivacyCoachDashboardProps {
  className?: string;
}

export const PrivacyCoachDashboard: React.FC<PrivacyCoachDashboardProps> = ({ className = '' }) => {
  const [insights, setInsights] = useState<PersonalizedInsights | null>(null);
  const [goals, setGoals] = useState<PrivacyGoal[]>([]);
  const [progress, setProgress] = useState<ProgressReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyCoachingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'achievements' | 'report'>('overview');

  useEffect(() => {
    loadCoachingData();
  }, []);

  const loadCoachingData = async () => {
    try {
      const [insightsData, goalsData, weeklyReportData] = await Promise.all([
        PrivacyInsights.generatePersonalizedInsights(),
        PrivacyCoach.getPrivacyGoals(),
        PrivacyCoach.generateWeeklyReport()
      ]);

      setInsights(insightsData);
      setGoals(goalsData);
      setWeeklyReport(weeklyReportData);

      if (goalsData.length > 0) {
        const progressData = await PrivacyCoach.trackProgress(goalsData);
        setProgress(progressData);
      }
    } catch (error) {
      console.error('Failed to load coaching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoals = async () => {
    try {
      const userPreferences = await PrivacyCoach.getUserPreferences();
      const newGoals = await PrivacyCoach.createPrivacyGoals(userPreferences);
      setGoals(newGoals);
      
      const progressData = await PrivacyCoach.trackProgress(newGoals);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to create goals:', error);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your Privacy Coach</h2>
        {progress && (
          <p className="text-sm text-gray-600">{progress.motivationalMessage}</p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'goals', label: 'Goals' },
          { id: 'achievements', label: 'Achievements' },
          { id: 'report', label: 'Weekly Report' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'goals' | 'achievements' | 'report')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && insights && (
        <div className="space-y-4">
          {/* Privacy Score Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Privacy Score</h3>
                <p className="text-sm text-gray-600">Your current privacy level</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(insights.browsingPattern.averagePrivacyScore)}
                </div>
                <div className={`text-sm ${
                  insights.privacyTrends.trendDirection === 'improving' ? 'text-green-600' :
                  insights.privacyTrends.trendDirection === 'declining' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {insights.privacyTrends.trendDirection === 'improving' ? '↗️ Improving' :
                   insights.privacyTrends.trendDirection === 'declining' ? '↘️ Declining' :
                   '→ Stable'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{insights.browsingPattern.totalEvents}</div>
              <div className="text-sm text-gray-600">Trackers This Week</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{insights.achievements.length}</div>
              <div className="text-sm text-gray-600">Achievements</div>
            </div>
          </div>

          {/* Top Recommendations */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Top Recommendations</h4>
            <div className="space-y-2">
              {insights.recommendations.slice(0, 3).map((rec, index) => (
                <div key={rec.id} className="flex items-start space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-600' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{rec.title}</div>
                    <div className="text-sm text-gray-600">{rec.description}</div>
                    <div className="text-xs text-blue-600 mt-1">{rec.estimatedImpact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">No privacy goals set yet</div>
              <button
                onClick={handleCreateGoals}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Privacy Goals
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Privacy Goals</h3>
                <button
                  onClick={handleCreateGoals}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Update Goals
                </button>
              </div>
              
              {progress && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-900 mb-2">Overall Progress</div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.overallProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-blue-700 mt-1">{Math.round(progress.overallProgress)}% complete</div>
                </div>
              )}

              <div className="space-y-3">
                {progress?.goalsProgress.map(({ goal, progressPercentage, onTrack, daysRemaining }) => (
                  <div key={goal.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{goal.description}</div>
                      <div className={`text-sm px-2 py-1 rounded-full ${
                        onTrack ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {onTrack ? 'On Track' : 'Behind'}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          onTrack ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{Math.round(progressPercentage)}% complete</span>
                      <span>{daysRemaining} days remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && insights && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Achievements</h3>
          {insights.achievements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No achievements yet. Keep improving your privacy to unlock achievements!
            </div>
          ) : (
            <div className="grid gap-3">
              {insights.achievements.map(achievement => (
                <div key={achievement.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-4">
                  <div className="text-3xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{achievement.title}</div>
                    <div className="text-sm text-gray-600">{achievement.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Report Tab */}
      {activeTab === 'report' && weeklyReport && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Privacy Report</h3>
          
          {/* Summary */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">This Week&apos;s Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{weeklyReport.summary.averageScore}</div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  weeklyReport.summary.scoreChange > 0 ? 'text-green-600' : 
                  weeklyReport.summary.scoreChange < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {weeklyReport.summary.scoreChange > 0 ? '+' : ''}{weeklyReport.summary.scoreChange}
                </div>
                <div className="text-sm text-gray-600">Score Change</div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Key Insights</h4>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Patterns</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {weeklyReport.insights.patterns.map((pattern, index) => (
                    <li key={index}>• {pattern}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Improvements</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {weeklyReport.insights.improvements.map((improvement, index) => (
                    <li key={index}>• {improvement}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Next Week Focus */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Next Week&apos;s Focus</h4>
            <div className="text-sm text-blue-800 mb-2">Primary Goal: {weeklyReport.nextWeekFocus.primaryGoal}</div>
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-blue-700">Action Items:</div>
                <ul className="text-sm text-blue-600 ml-4">
                  {weeklyReport.nextWeekFocus.actionItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
