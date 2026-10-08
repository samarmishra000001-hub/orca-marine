import React from 'react';

/**
 * RiskIndicator component showing calculated risk level (LOW/MODERATE/HIGH/SEVERE)
 * with contributing factors, confidence score, and official safety advisory notice.
 */
export default function RiskIndicator({ assessment }) {
  if (!assessment) return null;

  const {
    risk_level = 'LOW',
    score = 0,
    factors = [],
    explanation = '',
    recommendations = [],
    disclaimer = 'Informational only. Follow official maritime warnings.'
  } = assessment;

  const config = {
    LOW: {
      color: '#00e676',
      bg: 'rgba(0, 230, 118, 0.12)',
      border: 'rgba(0, 230, 118, 0.3)',
      icon: 'verified_user',
      label: 'LOW RISK'
    },
    MODERATE: {
      color: '#ffb300',
      bg: 'rgba(255, 179, 0, 0.12)',
      border: 'rgba(255, 179, 0, 0.3)',
      icon: 'warning',
      label: 'MODERATE RISK'
    },
    HIGH: {
      color: '#ff9100',
      bg: 'rgba(255, 145, 0, 0.15)',
      border: 'rgba(255, 145, 0, 0.35)',
      icon: 'gpp_bad',
      label: 'HIGH RISK'
    },
    SEVERE: {
      color: '#ff1744',
      bg: 'rgba(255, 23, 68, 0.18)',
      border: 'rgba(255, 23, 68, 0.45)',
      icon: 'dangerous',
      label: 'SEVERE HAZARD'
    }
  };

  const levelInfo = config[risk_level] || config.LOW;

  return (
    <div
      className="marine-risk-card"
      style={{
        backgroundColor: levelInfo.bg,
        borderColor: levelInfo.border
      }}
    >
      <div className="marine-risk-header">
        <div className="marine-risk-badge" style={{ color: levelInfo.color }}>
          <span className="material-symbols-outlined">{levelInfo.icon}</span>
          <span className="marine-risk-level-title">{levelInfo.label}</span>
        </div>
        <div className="marine-risk-score-meter">
          <span className="marine-risk-score-val">{score.toFixed(0)}</span>
          <span className="marine-risk-score-max">/100</span>
        </div>
      </div>

      {explanation && (
        <p className="marine-risk-explanation">{explanation}</p>
      )}

      {/* Contributing Factors Pills */}
      {factors && factors.length > 0 && (
        <div className="marine-risk-factors-wrap">
          <span className="marine-factors-label">Contributing Factors:</span>
          <div className="marine-factors-pills">
            {factors.map((f, idx) => (
              <span
                key={idx}
                className={`marine-factor-pill severity-${(f.severity || 'low').toLowerCase()}`}
              >
                {f.description || `${f.factor}: ${f.value}${f.unit}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <ul className="marine-risk-recs">
          {recommendations.slice(0, 2).map((rec, idx) => (
            <li key={idx}>
              <span className="material-symbols-outlined rec-bullet">chevron_right</span>
              {rec}
            </li>
          ))}
        </ul>
      )}

      <div className="marine-risk-disclaimer">
        <span className="material-symbols-outlined">info</span>
        <span>{disclaimer}</span>
      </div>
    </div>
  );
}
