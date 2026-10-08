import React from 'react';

/**
 * SourceBadge displays data provenance, freshness, and attribution
 * to ensure scientific honesty and transparency (Spec §15).
 */
export default function SourceBadge({ citations = [] }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="marine-citations-container">
      <div className="marine-citations-header">
        <span className="material-symbols-outlined">dataset</span>
        <span>Verified Sources & Sensor Freshness</span>
      </div>
      <div className="marine-citations-list">
        {citations.map((cite, idx) => (
          <div key={idx} className="marine-citation-pill">
            <span className="marine-citation-dot" />
            <span className="marine-citation-source">{cite.source}</span>
            {cite.freshness && (
              <span className={`marine-freshness-tag tag-${cite.freshness.toLowerCase()}`}>
                {cite.freshness}
              </span>
            )}
            {cite.timestamp && (
              <span className="marine-citation-time">
                {new Date(cite.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
