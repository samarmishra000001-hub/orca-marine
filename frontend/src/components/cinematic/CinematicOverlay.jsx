import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES = [
  {
    num: 1,
    title: 'DEEP HAZARD',
    headline: 'READ THE OCEAN. NAVIGATE WITH INTELLIGENCE.',
    copy: 'From changing sea conditions to clearer marine decisions, ORCA brings ocean intelligence into focus.',
    color: '#00d4ff',
    badge: 'PHASE 1/4 · UNMAPPED RISK'
  },
  {
    num: 2,
    title: 'DATA CALIBRATION',
    headline: 'CALIBRATING SPATIAL INTELLIGENCE.',
    copy: 'Perspective radar sweeps and oceanographic numerical models anchor directly to the sea surface.',
    color: '#00d4ff',
    badge: 'PHASE 2/4 · RADAR TELEMETRY'
  },
  {
    num: 3,
    title: 'SAFE ZONE IDENTIFICATION',
    headline: 'DEMARCATING VERIFIED CORRIDORS.',
    copy: 'Geographic vector boundaries separate restricted shallow shoals from high-yield, safe transit zones.',
    color: '#00e5a3',
    badge: 'PHASE 3/4 · VECTOR GIS'
  },
  {
    num: 4,
    title: 'OPTIMIZED ADVISORY',
    headline: 'READ THE OCEAN. NAVIGATE WITH INTELLIGENCE.',
    copy: 'Ocean intelligence synthesized into actionable marine advisories. Welcome to the command centre.',
    color: '#ffb347',
    badge: 'PHASE 4/4 · COMMAND READY'
  }
];

export default function CinematicOverlay({
  frameIndex = 1,
  totalFrames = 120,
  currentMeta = null,
  onEnter = () => {},
  onSkip = () => {},
}) {
  const phaseIndex = frameIndex <= 30 ? 0 : frameIndex <= 60 ? 1 : frameIndex <= 90 ? 2 : 3;
  const currentPhase = PHASES[phaseIndex];
  const progressRatio = Math.min(1, Math.max(0, (frameIndex - 1) / (totalFrames - 1)));
  const progressPct = Math.round(progressRatio * 100);

  const waveH = currentMeta?.wavePhysics?.waveHeightM ?? (phaseIndex === 0 ? 4.5 : phaseIndex === 1 ? 3.2 : phaseIndex === 2 ? 2.0 : 1.2);
  const lat = currentMeta?.telemetry?.latitude ?? (18.92 + (frameIndex - 1) * 0.0005).toFixed(4);
  const lon = currentMeta?.telemetry?.longitude ?? (72.82 + (frameIndex - 1) * 0.0008).toFixed(4);
  const risk = currentMeta?.telemetry?.riskLevel ?? (phaseIndex === 0 ? 'CRITICAL_HAZARD' : phaseIndex === 1 ? 'CALIBRATING' : phaseIndex === 2 ? 'MAPPED' : 'OPTIMAL');

  return (
    <div className="cinematic-overlay-container">
      {/* 1. TOP NAV / TELEMETRY STATUS */}
      <header className="cinematic-top-bar">
        {/* Brand Group */}
        <div className="cinematic-brand-group">
          <div className="cinematic-brand-mark">
            <span className="cinematic-brand-title">ORCA</span>
            <span className="cinematic-brand-sub">MARINE INTELLIGENCE</span>
          </div>
        </div>

        {/* Phase Badges */}
        <div className="cinematic-phase-pills">
          {PHASES.map((p, idx) => {
            const isActive = idx === phaseIndex;
            const isCompleted = idx < phaseIndex;
            return (
              <div
                key={p.num}
                className={`cinematic-phase-chip ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                style={{ '--phase-accent': p.color }}
              >
                <span className="chip-dot" />
                <span className="chip-label">P{p.num}</span>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="cinematic-top-actions">
          <button
            type="button"
            className="cinematic-skip-btn"
            onClick={onSkip}
            title="Skip directly to Operational Marine Dashboard"
          >
            Skip to Dashboard
          </button>
        </div>
      </header>

      {/* 2. REAL-TIME TELEMETRY DATA RIBBON */}
      <div className="cinematic-telemetry-badge">
        <div className="telemetry-item">
          <span className="tel-label">LAT</span>
          <span className="tel-val">{lat}°N</span>
        </div>
        <span className="tel-sep">/</span>
        <div className="telemetry-item">
          <span className="tel-label">LON</span>
          <span className="tel-val">{lon}°E</span>
        </div>
        <span className="tel-sep">/</span>
        <div className="telemetry-item">
          <span className="tel-label">SWELL</span>
          <span className="tel-val">{waveH}m</span>
        </div>
        <span className="tel-sep">/</span>
        <div className="telemetry-item">
          <span className="tel-label">STATUS</span>
          <span className="tel-val status-val" style={{ color: currentPhase.color }}>
            {risk}
          </span>
        </div>
      </div>

      {/* 3. CENTER NARRATIVE TYPOGRAPHY */}
      <main className="cinematic-center-narrative">
        <AnimatePresence>
          <motion.div
            key={currentPhase.num}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="cinematic-narrative-card"
          >
            <div className="cinematic-phase-badge" style={{ color: currentPhase.color, borderColor: `${currentPhase.color}40` }}>
              {currentPhase.badge}
            </div>

            <h1 className="cinematic-headline">
              {currentPhase.headline}
            </h1>

            <div className="cinematic-accent-line" style={{ background: currentPhase.color }} />

            <p className="cinematic-copy">
              {currentPhase.copy}
            </p>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. BOTTOM ACTION & TIMELINE BAR */}
      <footer className="cinematic-bottom-bar">
        {/* Frame Progress Bar */}
        <div className="cinematic-progress-track">
          <div className="progress-info">
            <span className="track-phase-name">{currentPhase.title}</span>
            <span className="track-frame-count">
              FRAME {String(frameIndex).padStart(3, '0')} <span className="dim">/ {totalFrames}</span>
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progressPct}%`,
                background: currentPhase.color,
                boxShadow: `0 0 12px ${currentPhase.color}80`
              }}
            />
          </div>
        </div>

        {/* Primary CTA and Scroll hint */}
        <div className="cinematic-cta-group">
          {frameIndex < 110 ? (
            <div className="cinematic-scroll-prompt">
              <span className="prompt-text">SCROLL TO CALIBRATE</span>
              <span className="material-symbols-outlined prompt-icon">arrow_downward</span>
            </div>
          ) : null}

          <button
            type="button"
            className="cinematic-enter-btn"
            onClick={onEnter}
            style={{
              '--btn-glow': currentPhase.color
            }}
          >
            <span className="material-symbols-outlined btn-icon">explore</span>
            <span>ENTER MARINE COMMAND CENTRE</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
