import React, { useState, useEffect } from 'react';
import {
  PrivacyPredictor,
  type PrivacyPrediction,
} from '../../lib/privacy-predictor';

interface PredictionTooltipProps {
  prediction: PrivacyPrediction;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export const PredictionTooltip: React.FC<PredictionTooltipProps> = ({
  prediction,
  isVisible,
  position,
  onClose,
}) => {
  if (!isVisible) return null;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number): string => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };

  return (
    <div
      className="fixed z-50 max-w-sm p-4 bg-white border border-gray-200 rounded-lg shadow-lg"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.max(10, position.y - 100),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={`flex items-center px-2 py-1 rounded-md border ${getScoreColor(prediction.predictedScore)}`}
        >
          <span className="mr-1">
            {getScoreIcon(prediction.predictedScore)}
          </span>
          <span className="font-semibold">
            {prediction.predictedGrade} ({prediction.predictedScore})
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">
          Confidence: {Math.round(prediction.confidence * 100)}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-500 h-1 rounded-full"
            style={{ width: `${prediction.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Expected Trackers */}
      {prediction.expectedTrackers.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">
            Expected Trackers ({prediction.expectedTrackers.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {prediction.expectedTrackers.slice(0, 3).map((tracker, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tracker.type}
              </span>
            ))}
            {prediction.expectedTrackers.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                +{prediction.expectedTrackers.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {prediction.riskFactors.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">
            Top Risks
          </div>
          {prediction.riskFactors.slice(0, 2).map((factor, index) => (
            <div key={index} className="text-xs text-gray-600 mb-1">
              • {factor.description}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {prediction.recommendations.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">
            Recommendations
          </div>
          <div className="text-xs text-blue-600">
            {prediction.recommendations[0]}
          </div>
        </div>
      )}

      {/* Comparison */}
      {prediction.comparisonToAverage !== 0 && (
        <div className="text-xs text-gray-500">
          {prediction.comparisonToAverage > 0 ? '↑' : '↓'}
          {Math.abs(prediction.comparisonToAverage)} points vs average
        </div>
      )}
    </div>
  );
};

interface LinkPredictionIndicatorProps {
  prediction: PrivacyPrediction;
  size?: 'small' | 'medium' | 'large';
}

export const LinkPredictionIndicator: React.FC<
  LinkPredictionIndicatorProps
> = ({ prediction, size = 'small' }) => {
  const getIndicatorClass = (): string => {
    const baseClass =
      'inline-flex items-center justify-center rounded-full font-medium';
    const sizeClass = {
      small: 'w-4 h-4 text-xs',
      medium: 'w-6 h-6 text-sm',
      large: 'w-8 h-8 text-base',
    }[size];

    const colorClass =
      prediction.predictedScore >= 80
        ? 'bg-green-100 text-green-800'
        : prediction.predictedScore >= 60
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800';

    return `${baseClass} ${sizeClass} ${colorClass}`;
  };

  return (
    <span
      className={getIndicatorClass()}
      title={`Predicted privacy score: ${prediction.predictedScore}`}
    >
      {prediction.predictedGrade}
    </span>
  );
};

interface PredictionSummaryProps {
  predictions: PrivacyPrediction[];
  onPredictionClick?: (prediction: PrivacyPrediction) => void;
}

export const PredictionSummary: React.FC<PredictionSummaryProps> = ({
  predictions,
  onPredictionClick,
}) => {
  const [sortBy, setSortBy] = useState<'score' | 'confidence' | 'url'>('score');

  const sortedPredictions = [...predictions].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return a.predictedScore - b.predictedScore; // Lowest risk first
      case 'confidence':
        return b.confidence - a.confidence; // Highest confidence first
      case 'url':
        return a.url.localeCompare(b.url);
      default:
        return 0;
    }
  });

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No predictions available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Privacy Predictions ({predictions.length})
        </h3>
        <select
          value={sortBy}
          onChange={e =>
            setSortBy(e.target.value as 'score' | 'confidence' | 'url')
          }
          className="px-3 py-1 text-sm border border-gray-300 rounded-md"
        >
          <option value="score">Sort by Risk</option>
          <option value="confidence">Sort by Confidence</option>
          <option value="url">Sort by URL</option>
        </select>
      </div>

      {/* Predictions List */}
      <div className="space-y-2">
        {sortedPredictions.map((prediction, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
            onClick={() => onPredictionClick?.(prediction)}
          >
            <div className="flex items-center space-x-3">
              <LinkPredictionIndicator prediction={prediction} size="medium" />
              <div>
                <div className="font-medium text-gray-900 truncate max-w-xs">
                  {new URL(prediction.url).hostname}
                </div>
                <div className="text-sm text-gray-500">
                  {prediction.expectedTrackers.length} trackers expected
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={`font-semibold ${getScoreColor(prediction.predictedScore)}`}
              >
                {prediction.predictedScore}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(prediction.confidence * 100)}% confident
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PredictionDashboardProps {
  className?: string;
}

export const PredictionDashboard: React.FC<PredictionDashboardProps> = ({
  className = '',
}) => {
  const [predictions, setPredictions] = useState<PrivacyPrediction[]>([]);
  const [selectedPrediction, setSelectedPrediction] =
    useState<PrivacyPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadRecentPredictions = async () => {
    setIsLoading(true);
    try {
      // This would typically load from storage or recent predictions
      // For now, we'll create some sample data
      const sampleUrls = [
        'https://example.com',
        'https://news.example.com',
        'https://shop.example.com',
      ];

      const predictionPromises = sampleUrls.map(url =>
        PrivacyPredictor.predictPrivacyImpact(url)
      );

      const results = await Promise.all(predictionPromises);
      setPredictions(results);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecentPredictions();
  }, []);

  const averageScore =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((sum, p) => sum + p.predictedScore, 0) /
            predictions.length
        )
      : 0;

  const highRiskCount = predictions.filter(p => p.predictedScore < 60).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {predictions.length}
          </div>
          <div className="text-sm text-gray-500">Sites Analyzed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{averageScore}</div>
          <div className="text-sm text-gray-500">Avg. Privacy Score</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
          <div className="text-sm text-gray-500">High Risk Sites</div>
        </div>
      </div>

      {/* Predictions List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="mt-2 text-gray-500">Loading predictions...</div>
        </div>
      ) : (
        <PredictionSummary
          predictions={predictions}
          onPredictionClick={setSelectedPrediction}
        />
      )}

      {/* Detailed View Modal */}
      {selectedPrediction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Prediction Details</h3>
              <button
                onClick={() => setSelectedPrediction(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700">URL</div>
                <div className="text-sm text-gray-900 break-all">
                  {selectedPrediction.url}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">
                  Privacy Score
                </div>
                <div className="flex items-center space-x-2">
                  <LinkPredictionIndicator
                    prediction={selectedPrediction}
                    size="large"
                  />
                  <span className="text-lg font-semibold">
                    {selectedPrediction.predictedScore}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">
                  Recommendations
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedPrediction.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
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

export default PredictionDashboard;
