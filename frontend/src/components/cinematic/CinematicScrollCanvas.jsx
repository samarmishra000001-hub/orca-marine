import React, { useRef, useEffect, useState, useCallback } from 'react';

const TOTAL_FRAMES = 120;

/**
 * Format frame number to 3 digits (e.g., 1 -> "001")
 */
export function formatFrameNumber(num) {
  return String(Math.min(TOTAL_FRAMES, Math.max(1, Math.round(num)))).padStart(3, '0');
}

/**
 * Procedural fallback renderer: Draws ocean swells, radar sweep, and vector zones
 * directly on canvas if the corresponding image is still loading or network is slow.
 */
function drawProceduralFallback(ctx, width, height, frameIndex, metadata) {
  const meta = metadata || {};
  const phaseNum = meta.phase?.number || (frameIndex <= 30 ? 1 : frameIndex <= 60 ? 2 : frameIndex <= 90 ? 3 : 4);
  const prog = meta.phase?.progress || 0.5;
  const waveH = meta.wavePhysics?.waveHeightM || (phaseNum === 1 ? 4.5 : phaseNum === 2 ? 3.2 : phaseNum === 3 ? 2.0 : 1.2);
  const horizonY = height * 0.42;

  // 1. Sky & Sea Gradients
  let skyTop, skyBot, seaTop, seaBot;
  if (phaseNum === 1) {
    skyTop = '#030b10'; skyBot = '#0a202d'; seaTop = '#05121a'; seaBot = '#02090d';
  } else if (phaseNum === 2) {
    skyTop = '#041018'; skyBot = '#0e2a3a'; seaTop = '#071a26'; seaBot = '#030d14';
  } else if (phaseNum === 3) {
    skyTop = '#061622'; skyBot = '#123446'; seaTop = '#092030'; seaBot = '#041019';
  } else {
    skyTop = '#0f1e30'; skyBot = '#4b301e'; seaTop = '#123041'; seaBot = '#081826';
  }

  // Draw Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // Draw Sea
  const seaGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  seaGrad.addColorStop(0, seaTop);
  seaGrad.addColorStop(1, seaBot);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // 2. Swell waves
  const numWaves = 14;
  for (let w = 0; w < numWaves; w++) {
    const waveRatio = w / numWaves;
    const wy = horizonY + (height - horizonY) * Math.pow(waveRatio, 1.5);
    const amp = (2.0 + waveH * 3.5) * Math.pow(waveRatio, 1.2);

    ctx.beginPath();
    const steps = 30;
    for (let s = 0; s <= steps; s++) {
      const wx = s * (width / steps);
      const offset = Math.sin(s * 0.35 + frameIndex * 0.12 + w) * amp;
      if (s === 0) ctx.moveTo(wx, wy + offset);
      else ctx.lineTo(wx, wy + offset);
    }

    if (phaseNum === 4) {
      const r = Math.min(255, 30 + Math.round(180 * prog));
      const g = Math.min(255, 25 + Math.round(130 * prog));
      const b = Math.min(255, 20 + Math.round(60 * prog));
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + 0.5 * waveRatio})`;
      ctx.lineWidth = Math.max(1, 2 * waveRatio);
    } else {
      ctx.strokeStyle = `rgba(18, 65, 85, ${0.2 + 0.4 * waveRatio})`;
      ctx.lineWidth = 1;
    }
    ctx.stroke();
  }

  // 3. Phase 2+: Radar Grid & Sweep
  if (phaseNum >= 2) {
    const gridOp = phaseNum === 2 ? prog * 0.8 : 0.6;
    ctx.strokeStyle = `rgba(0, 212, 255, ${gridOp * 0.4})`;
    ctx.lineWidth = 1;

    const vanishX = width / 2;
    const vanishY = horizonY;
    for (let gx = -5; gx <= 5; gx++) {
      const bx = vanishX + gx * (width / 5);
      ctx.beginPath();
      ctx.moveTo(vanishX, vanishY);
      ctx.lineTo(bx, height);
      ctx.stroke();
    }

    const centerX = width / 2;
    const centerY = height * 0.72;
    const sweepAngle = ((frameIndex * 12) % 360) * (Math.PI / 180);

    // Radar rings
    [60, 140, 240, 360].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, r * 1.5, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Sweep beam
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + 260 * Math.cos(sweepAngle), centerY + 90 * Math.sin(sweepAngle));
    ctx.strokeStyle = `rgba(0, 240, 255, ${gridOp * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 4. Phase 3+: Geo Boundaries
  if (phaseNum >= 3) {
    const safeOp = phaseNum === 3 ? prog : 0.9;
    const hazOp = phaseNum === 3 ? prog : 0.9;

    // Emerald Safe Corridor
    ctx.beginPath();
    ctx.moveTo(width * 0.42, height * 0.48);
    ctx.lineTo(width * 0.58, height * 0.48);
    ctx.lineTo(width * 0.68, height * 0.92);
    ctx.lineTo(width * 0.32, height * 0.92);
    ctx.closePath();
    ctx.strokeStyle = `rgba(0, 229, 163, ${safeOp})`;
    ctx.lineWidth = 2;
    ctx.fillStyle = `rgba(0, 229, 163, ${safeOp * 0.08})`;
    ctx.fill();
    ctx.stroke();

    // Crimson Hazard Zone
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.58);
    ctx.lineTo(width * 0.28, height * 0.54);
    ctx.lineTo(width * 0.25, height * 0.82);
    ctx.lineTo(width * 0.05, height * 0.80);
    ctx.closePath();
    ctx.strokeStyle = `rgba(255, 51, 68, ${hazOp})`;
    ctx.lineWidth = 2;
    ctx.fillStyle = `rgba(255, 51, 68, ${hazOp * 0.1})`;
    ctx.fill();
    ctx.stroke();
  }
}

export default function CinematicScrollCanvas({
  frameIndex = 1,
  manifestFrames = [],
  onFirstFrameLoaded = () => {},
}) {
  const canvasRef = useRef(null);
  const cacheRef = useRef(new Map());
  const pendingRef = useRef(new Set());
  const renderRafRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Helper to get image path for a frame
  const getFrameSrc = useCallback((idx) => {
    const formatted = formatFrameNumber(idx);
    return `/cinematic/frames/frame_${formatted}.png`;
  }, []);

  // Preload a specific frame into memory
  const preloadFrame = useCallback((idx) => {
    if (idx < 1 || idx > TOTAL_FRAMES) return;
    if (cacheRef.current.has(idx) || pendingRef.current.has(idx)) return;

    pendingRef.current.add(idx);
    const img = new Image();
    img.src = getFrameSrc(idx);
    img.onload = () => {
      cacheRef.current.set(idx, img);
      pendingRef.current.delete(idx);
      if (idx === 1 && !isReady) {
        setIsReady(true);
        onFirstFrameLoaded();
      }
    };
    img.onerror = () => {
      pendingRef.current.delete(idx);
    };
  }, [getFrameSrc, isReady, onFirstFrameLoaded]);

  // Windowed progressive preloading around current frame
  useEffect(() => {
    // Priority: immediate frame and neighbor frames
    preloadFrame(frameIndex);
    const prefetchAhead = 10;
    const prefetchBehind = 4;

    for (let offset = 1; offset <= prefetchAhead; offset++) {
      preloadFrame(frameIndex + offset);
    }
    for (let offset = 1; offset <= prefetchBehind; offset++) {
      preloadFrame(frameIndex - offset);
    }

    // Prune distant frames to maintain low memory profile (< 40 cached frames)
    if (cacheRef.current.size > 50) {
      for (const key of cacheRef.current.keys()) {
        if (Math.abs(key - frameIndex) > 25 && key !== 1 && key !== TOTAL_FRAMES) {
          cacheRef.current.delete(key);
        }
      }
    }
  }, [frameIndex, preloadFrame]);

  // Initial load of frame 1
  useEffect(() => {
    preloadFrame(1);
  }, [preloadFrame]);

  // Render loop using requestAnimationFrame
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const currentIdx = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(frameIndex)));
    const cachedImg = cacheRef.current.get(currentIdx);

    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
      ctx.drawImage(cachedImg, 0, 0, w, h);
    } else {
      // Find nearest cached frame as visual placeholder while loading
      let fallbackImg = null;
      for (let delta = 1; delta <= 5; delta++) {
        const prev = cacheRef.current.get(currentIdx - delta);
        if (prev && prev.complete && prev.naturalWidth > 0) {
          fallbackImg = prev;
          break;
        }
        const next = cacheRef.current.get(currentIdx + delta);
        if (next && next.complete && next.naturalWidth > 0) {
          fallbackImg = next;
          break;
        }
      }

      if (fallbackImg) {
        ctx.drawImage(fallbackImg, 0, 0, w, h);
      } else {
        const meta = manifestFrames[currentIdx - 1];
        drawProceduralFallback(ctx, w, h, currentIdx, meta);
      }
    }
  }, [frameIndex, manifestFrames]);

  useEffect(() => {
    if (renderRafRef.current) {
      cancelAnimationFrame(renderRafRef.current);
    }
    renderRafRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current);
    };
  }, [renderFrame]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current);
      renderRafRef.current = requestAnimationFrame(renderFrame);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="cinematic-scroll-canvas"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        pointerEvents: 'none',
      }}
    />
  );
}
