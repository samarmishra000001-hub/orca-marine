import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

export const ACRONYM_TOOLTIPS = {
  PFZ: "Potential Fishing Zones: Satellite-derived thermal & chlorophyll fronts indicating high pelagic fish aggregation (Tuna, Mackerel, Sardine).",
  SST: "Sea Surface Temperature: Satellite infrared radiative skin temperature of upper ocean layer (°C). Key indicator for coral bleaching and fish migration.",
  "Chl-a": "Chlorophyll-a Concentration: Plankton biomass density (mg/m³). Higher values indicate active upwelling and rich feeding grounds.",
  IMBL: "International Maritime Boundary Line: Sovereign UNCLOS maritime border (India-Sri Lanka, India-Pakistan, India-Bangladesh). Strict buffer required.",
  MPA: "Marine Protected Area: MoEFCC & Wildlife Protection Act conservation sanctuaries (coral reefs, turtle nesting beds, dugong habitats). Mechanized fishing prohibited."
};

export const PERSONAS = [
  {
    id: 'fisher',
    label: 'Fisher & Mariner',
    icon: 'anchor',
    badge: 'LIVELIHOOD MODE',
    color: '#00d4ff',
    glow: 'rgba(0, 212, 255, 0.25)',
    summary: 'Plain-language catch probability, sea state swell safety, and safe port returns.'
  },
  {
    id: 'coast_guard',
    label: 'Coast Guard & Safety',
    icon: 'security',
    badge: 'TACTICAL PATROL',
    color: '#E6A448',
    glow: 'rgba(230, 164, 72, 0.25)',
    summary: 'IMBL buffer zone geofencing, SAR drift vectors, emergency beacon and cyclone tracking.'
  },
  {
    id: 'researcher',
    label: 'Marine Biologist',
    icon: 'biotech',
    badge: 'SCIENCE & CONSERVATION',
    color: '#2ECC71',
    glow: 'rgba(46, 204, 113, 0.25)',
    summary: 'MPA boundaries, coral bleaching thermal stress, chlorophyll plumes, and biodiversity data.'
  }
];

export default function PersonaSwitcher({ activePersona = 'fisher', onPersonaChange, onOpenSosModal }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const activeIndex = PERSONAS.findIndex(p => p.id === activePersona);
  const activeColor = PERSONAS[activeIndex >= 0 ? activeIndex : 0].color;

  const springIndicator = useSpring({
    to: {
      left: `${(activeIndex >= 0 ? activeIndex : 0) * 33.333}%`,
      borderColor: activeColor
    },
    config: { tension: 320, friction: 26 }
  });

  return (
    <div className="persona-nav-wrapper">
      {/* Central Pill Strip */}
      <div className="persona-glass-capsule ocean-glass-light">
        <div className="persona-tab-strip">
          <animated.div 
            className="persona-spring-slider"
            style={{
              ...springIndicator,
              background: `radial-gradient(ellipse at center, ${activeColor}22 0%, ${activeColor}08 70%)`
            }} 
          />
          {PERSONAS.map((p) => {
            const isActive = activePersona === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`persona-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => onPersonaChange(p.id)}
                title={p.summary}
              >
                <span className="material-symbols-outlined persona-tab-icon" style={{ color: isActive ? p.color : '#9DB4BE' }}>
                  {p.icon}
                </span>
                <span className="persona-tab-text">{p.label}</span>
                {isActive && <span className="persona-live-pulse" style={{ background: p.color }} />}
              </button>
            );
          })}
        </div>

        {/* SOS Emergency Quick Action in Coast Guard Mode */}
        {activePersona === 'coast_guard' && (
          <button
            type="button"
            className="sos-beacon-trigger-btn"
            onClick={onOpenSosModal}
            title="Deploy Emergency SOS Maritime Distress Beacon"
          >
            <span className="material-symbols-outlined text-sm pulse-red">fmd_bad</span>
            <span>SOS BEACON</span>
          </button>
        )}

        {/* Acronym Glossary Pill Row */}
        <div className="acronym-help-row hidden-mobile">
          <span className="acronym-title">GLOSSARY:</span>
          {Object.keys(ACRONYM_TOOLTIPS).map((term) => (
            <div 
              key={term} 
              className="acronym-badge-wrap"
              onMouseEnter={() => setActiveTooltip(term)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <span className="acronym-badge">{term}</span>
              {activeTooltip === term && (
                <div className="acronym-tooltip-box ocean-glass">
                  <strong>{term}</strong>: {ACRONYM_TOOLTIPS[term]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
