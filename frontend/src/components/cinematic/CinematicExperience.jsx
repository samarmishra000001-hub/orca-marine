import React, { useState, useEffect, useRef, useCallback } from 'react';
import CinematicScrollCanvas from './CinematicScrollCanvas';
import CinematicOverlay from './CinematicOverlay';

const TOTAL_FRAMES = 120;

export default function CinematicExperience({ onFinish }) {
  const [frameIndex, setFrameIndex] = useState(1);
  const [manifest, setManifest] = useState(null);
  const containerRef = useRef(null);
  const targetFrameRef = useRef(1);
  const animFrameIdRef = useRef(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Load manifest metadata
  useEffect(() => {
    fetch('/cinematic/sequence-manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error('Manifest fetch failed');
        return res.json();
      })
      .then((data) => setManifest(data))
      .catch((err) => {
        console.warn('Cinematic manifest fetch error, using procedural metadata:', err);
      });
  }, []);

  // Smooth scroll-to-frame interpolation
  const updateFrame = useCallback(() => {
    setFrameIndex((current) => {
      const target = targetFrameRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 0.2) {
        return target;
      }
      return current + diff * 0.35; // Responsive spring-like lerp
    });
    animFrameIdRef.current = requestAnimationFrame(updateFrame);
  }, []);

  useEffect(() => {
    animFrameIdRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [updateFrame]);

  // Scroll listener
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrollableDist = el.scrollHeight - window.innerHeight;
      if (scrollableDist <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, scrolled / scrollableDist));
      const targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(progress * (TOTAL_FRAMES - 1)) + 1));
      targetFrameRef.current = targetFrame;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onFinish();
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        targetFrameRef.current = Math.min(TOTAL_FRAMES, targetFrameRef.current + 8);
        window.scrollBy({ top: window.innerHeight * 0.25, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetFrameRef.current = Math.max(1, targetFrameRef.current - 8);
        window.scrollBy({ top: -window.innerHeight * 0.25, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFinish]);

  const currentIntFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(frameIndex)));
  const currentMeta = manifest?.frames?.[currentIntFrame - 1] ?? null;

  return (
    <div
      ref={containerRef}
      className="cinematic-experience-scroll-track"
      style={{
        position: 'relative',
        width: '100%',
        height: prefersReducedMotion ? '100vh' : '400vh',
        background: '#071D29',
      }}
    >
      {/* Sticky Fullscreen Viewport */}
      <div
        className="cinematic-sticky-viewport"
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 9999,
        }}
      >
        {/* Master Scroll Canvas */}
        <CinematicScrollCanvas
          frameIndex={currentIntFrame}
          manifestFrames={manifest?.frames || []}
        />

        {/* Cinematic Technical & Narrative Overlay */}
        <CinematicOverlay
          frameIndex={currentIntFrame}
          totalFrames={TOTAL_FRAMES}
          currentMeta={currentMeta}
          onEnter={onFinish}
          onSkip={onFinish}
        />
      </div>
    </div>
  );
}
