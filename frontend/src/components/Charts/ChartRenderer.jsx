import React from 'react';

/**
 * Pure SVG responsive chart renderer.
 * Supports line, bar, area, gauge, and comparison chart types without heavy external dependencies.
 */
export default function ChartRenderer({ chart }) {
  if (!chart || !chart.series || chart.series.length === 0) return null;

  const { chart_type = 'line', title = 'Telemetry Chart', x_axis = {}, y_axis = {}, series = [] } = chart;
  const xValues = x_axis.values || [];
  const yUnit = y_axis.unit || '';

  // Determine min/max across all series values
  const allValues = series.flatMap(s => s.data || []);
  if (allValues.length === 0) return null;

  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 10);
  const valRange = maxVal - minVal || 1;

  const width = 360;
  const height = 160;
  const padding = { top: 20, right: 15, bottom: 25, left: 35 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getX = (index) => {
    if (xValues.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (xValues.length - 1)) * plotWidth;
  };

  const getY = (val) => {
    return padding.top + plotHeight - ((val - minVal) / valRange) * plotHeight;
  };

  return (
    <div className="marine-chart-card">
      <div className="marine-chart-header">
        <span className="marine-chart-title">{title}</span>
        {chart.source && <span className="marine-chart-source">{chart.source}</span>}
      </div>

      <div className="marine-chart-body">
        <svg viewBox={`0 0 ${width} ${height}`} className="marine-svg-chart">
          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + plotWidth}
            y2={padding.top}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + plotHeight / 2}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight / 2}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight}
            stroke="rgba(255,255,255,0.15)"
          />

          {/* Y Axis Labels */}
          <text x={padding.left - 6} y={padding.top + 4} fill="#8da4b8" fontSize="9" textAnchor="end">
            {maxVal.toFixed(1)}
          </text>
          <text x={padding.left - 6} y={padding.top + plotHeight} fill="#8da4b8" fontSize="9" textAnchor="end">
            {minVal.toFixed(1)}
          </text>

          {/* Render series lines or bars */}
          {series.map((s, sIdx) => {
            const color = s.color || (sIdx === 0 ? '#00e5ff' : '#00e676');
            const data = s.data || [];

            if (chart_type === 'bar') {
              const barWidth = Math.max(4, plotWidth / (data.length * 1.8));
              return (
                <g key={sIdx}>
                  {data.map((val, idx) => {
                    const bx = getX(idx) - barWidth / 2;
                    const by = getY(val);
                    const bh = Math.max(2, padding.top + plotHeight - by);
                    return (
                      <rect
                        key={idx}
                        x={bx}
                        y={by}
                        width={barWidth}
                        height={bh}
                        fill={color}
                        opacity="0.85"
                        rx="2"
                      />
                    );
                  })}
                </g>
              );
            }

            // Line & Area chart path
            const points = data.map((val, idx) => `${getX(idx)},${getY(val)}`).join(' ');
            const areaPoints = `${padding.left},${padding.top + plotHeight} ${points} ${getX(data.length - 1)},${padding.top + plotHeight}`;

            return (
              <g key={sIdx}>
                {chart_type === 'area' && (
                  <polygon
                    points={areaPoints}
                    fill={color}
                    opacity="0.15"
                  />
                )}
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
                {/* Data point dots */}
                {data.map((val, idx) => (
                  <circle
                    key={idx}
                    cx={getX(idx)}
                    cy={getY(val)}
                    r="3"
                    fill="#0f172a"
                    stroke={color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {/* X Axis labels (sample up to 4 labels) */}
          {xValues.length > 0 && (
            <g fill="#8da4b8" fontSize="8.5" textAnchor="middle">
              <text x={getX(0)} y={height - 6}>{xValues[0]}</text>
              {xValues.length > 2 && (
                <text x={getX(Math.floor(xValues.length / 2))} y={height - 6}>
                  {xValues[Math.floor(xValues.length / 2)]}
                </text>
              )}
              {xValues.length > 1 && (
                <text x={getX(xValues.length - 1)} y={height - 6}>{xValues[xValues.length - 1]}</text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="marine-chart-legend">
        {series.map((s, idx) => (
          <div key={idx} className="marine-legend-item">
            <span
              className="marine-legend-color"
              style={{ backgroundColor: s.color || (idx === 0 ? '#00e5ff' : '#00e676') }}
            />
            <span className="marine-legend-label">{s.name} {yUnit ? `(${yUnit})` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
