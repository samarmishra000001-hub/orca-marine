import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { formatFrameNumber } from './CinematicScrollCanvas';
import CinematicOverlay from './CinematicOverlay';
import fs from 'fs';
import path from 'path';

describe('Cinematic Sequence Manifest Structure', () => {
  it('contains exactly 120 frames in public sequence-manifest.json', () => {
    // Resolve manifest path from repo root
    const manifestPath = path.resolve(__dirname, '../../../public/cinematic/sequence-manifest.json');
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    expect(manifest.totalFrames).toBe(120);
    expect(manifest.frames).toHaveLength(120);

    // Verify 4 distinct phases, 30 frames each
    const phase1 = manifest.frames.filter(f => f.phase.number === 1);
    const phase2 = manifest.frames.filter(f => f.phase.number === 2);
    const phase3 = manifest.frames.filter(f => f.phase.number === 3);
    const phase4 = manifest.frames.filter(f => f.phase.number === 4);

    expect(phase1).toHaveLength(30);
    expect(phase2).toHaveLength(30);
    expect(phase3).toHaveLength(30);
    expect(phase4).toHaveLength(30);

    // Verify first and last frames
    expect(manifest.frames[0].frameIndex).toBe(1);
    expect(manifest.frames[0].fileName).toBe('frame_001.png');
    expect(manifest.frames[119].frameIndex).toBe(120);
    expect(manifest.frames[119].fileName).toBe('frame_120.png');
  });

  it('correctly formats frame numbers with 3-digit padding', () => {
    expect(formatFrameNumber(1)).toBe('001');
    expect(formatFrameNumber(15)).toBe('015');
    expect(formatFrameNumber(99)).toBe('099');
    expect(formatFrameNumber(120)).toBe('120');
    // Clamp out-of-bounds
    expect(formatFrameNumber(0)).toBe('001');
    expect(formatFrameNumber(150)).toBe('120');
  });
});

describe('CinematicOverlay Component', () => {
  it('renders required headline, telemetry, and primary CTA', () => {
    const onEnterMock = vi.fn();
    const onSkipMock = vi.fn();

    render(
      <CinematicOverlay
        frameIndex={1}
        totalFrames={120}
        onEnter={onEnterMock}
        onSkip={onSkipMock}
      />
    );

    // Required Headline
    expect(screen.getByText(/READ THE OCEAN\. NAVIGATE WITH INTELLIGENCE\./i)).toBeInTheDocument();

    // Required Supporting Copy
    expect(
      screen.getByText(/From changing sea conditions to clearer marine decisions, ORCA brings ocean intelligence into focus\./i)
    ).toBeInTheDocument();

    // Primary CTA Button
    const enterBtn = screen.getByRole('button', { name: /ENTER MARINE COMMAND CENTRE/i });
    expect(enterBtn).toBeInTheDocument();
    fireEvent.click(enterBtn);
    expect(onEnterMock).toHaveBeenCalledTimes(1);

    // Secondary Skip Button
    const skipBtn = screen.getByRole('button', { name: /Skip to Dashboard/i });
    expect(skipBtn).toBeInTheDocument();
    fireEvent.click(skipBtn);
    expect(onSkipMock).toHaveBeenCalledTimes(1);
  });

  it('updates narrative state for Phase 2, 3, and 4', () => {
    const { rerender } = render(
      <CinematicOverlay frameIndex={45} totalFrames={120} />
    );
    expect(screen.getByText(/CALIBRATING SPATIAL INTELLIGENCE\./i)).toBeInTheDocument();

    rerender(<CinematicOverlay frameIndex={75} totalFrames={120} />);
    expect(screen.getByText(/DEMARCATING VERIFIED CORRIDORS\./i)).toBeInTheDocument();

    rerender(<CinematicOverlay frameIndex={115} totalFrames={120} />);
    expect(screen.getByText(/READ THE OCEAN\. NAVIGATE WITH INTELLIGENCE\./i)).toBeInTheDocument();
  });
});
