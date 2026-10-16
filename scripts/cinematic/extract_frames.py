#!/usr/bin/env python3
"""
ORCA Cinematic Frame Extraction & Generator Tool.
Supports:
1. Extracting exactly 120 frames from a video file using FFmpeg.
2. Generating procedural visual baseline frames (120 frames) using PIL and sequence-manifest.json
   so that the app has immediate, local offline assets out-of-the-box.
"""
import os
import sys
import json
import math
import subprocess
import argparse
from PIL import Image, ImageDraw, ImageFont

TOTAL_FRAMES = 120

def extract_from_video(video_path, output_dir, width=1920, height=1080, ffmpeg_bin="ffmpeg"):
    """Extract precisely 120 uniformly spaced frames from a video using FFmpeg."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Determine video duration via ffprobe
    ffprobe_cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", video_path
    ]
    try:
        duration_str = subprocess.check_output(ffprobe_cmd, stderr=subprocess.STDOUT).decode().strip()
        duration = float(duration_str)
        target_fps = TOTAL_FRAMES / duration
    except Exception as e:
        print(f"Warning: could not read video duration via ffprobe ({e}). Falling back to 24fps.")
        target_fps = 24.0

    output_pattern = os.path.join(output_dir, "frame_%03d.png")
    cmd = [
        ffmpeg_bin, "-y", "-i", video_path,
        "-vf", f"fps={target_fps},scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-vframes", str(TOTAL_FRAMES),
        output_pattern
    ]
    print(f"Running extraction: {' '.join(cmd)}")
    subprocess.check_call(cmd)
    print(f"Successfully extracted {TOTAL_FRAMES} frames into {output_dir}")

def generate_procedural_frames(manifest_path, output_dir, width=1280, height=720):
    """Generate high-fidelity procedural baseline frames matching the 4-phase narrative."""
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    os.makedirs(output_dir, exist_ok=True)
    frames_meta = manifest.get("frames", [])
    
    print(f"Generating {len(frames_meta)} procedural frames in {output_dir} ({width}x{height})...")
    
    for fr in frames_meta:
        idx = fr["frameIndex"]
        file_name = fr["fileName"]
        phase_num = fr["phase"]["number"]
        phase_name = fr["phase"]["name"]
        prog = fr["phase"]["progress"]
        wave_h = fr["wavePhysics"]["waveHeightM"]
        lighting = fr["lighting"]
        radar = fr["radarOverlay"]
        boundary = fr["boundaryOverlay"]
        
        # Base image
        img = Image.new("RGB", (width, height), color=(7, 29, 41))
        draw = ImageDraw.Draw(img)
        
        # 1. Sky & Sea Gradient
        # Horizon at ~42% of height
        horizon_y = int(height * 0.42)
        
        if phase_num == 1:
            sky_top = (3, 11, 16)
            sky_bot = (10, 32, 45)
            sea_top = (5, 18, 26)
            sea_bot = (2, 9, 13)
        elif phase_num == 2:
            sky_top = (4, 16, 24)
            sky_bot = (14, 42, 58)
            sea_top = (7, 26, 38)
            sea_bot = (3, 13, 20)
        elif phase_num == 3:
            sky_top = (6, 22, 34)
            sky_bot = (18, 52, 70)
            sea_top = (9, 32, 48)
            sea_bot = (4, 16, 25)
        else: # Phase 4: Golden hour dawn
            sky_top = (15, 30, 48)
            sky_bot = (75, 48, 30)
            sea_top = (18, 48, 65)
            sea_bot = (8, 24, 38)
            
        # Draw sky gradient
        for y in range(0, horizon_y):
            ratio = y / max(1, horizon_y)
            r = int(sky_top[0] + (sky_bot[0] - sky_top[0]) * ratio)
            g = int(sky_top[1] + (sky_bot[1] - sky_top[1]) * ratio)
            b = int(sky_top[2] + (sky_bot[2] - sky_top[2]) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
            
        # Draw sea gradient
        for y in range(horizon_y, height):
            ratio = (y - horizon_y) / max(1, height - horizon_y)
            r = int(sea_top[0] + (sea_bot[0] - sea_top[0]) * ratio)
            g = int(sea_top[1] + (sea_bot[1] - sea_top[1]) * ratio)
            b = int(sea_top[2] + (sea_bot[2] - sea_top[2]) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # 2. Waves Swell lines with perspective
        num_waves = 18
        for w in range(num_waves):
            wave_ratio = w / num_waves
            wy = int(horizon_y + (height - horizon_y) * (wave_ratio ** 1.6))
            amplitude = int((3.0 + wave_h * 4.0) * (wave_ratio ** 1.3))
            
            wave_points = []
            steps = 40
            for s in range(steps + 1):
                wx = int(s * (width / steps))
                # Swell undulation
                offset = int(math.sin(s * 0.4 + idx * 0.15 + w) * amplitude)
                wave_points.append((wx, wy + offset))
                
            wave_alpha = int(25 + 60 * wave_ratio)
            # Golden hour sun specular reflection on waves
            if phase_num == 4:
                spec_r = int(min(255, 30 + 180 * prog))
                spec_g = int(min(255, 25 + 130 * prog))
                spec_b = int(min(255, 20 + 60 * prog))
                draw.line(wave_points, fill=(spec_r, spec_g, spec_b), width=max(1, int(2 * wave_ratio)))
            else:
                draw.line(wave_points, fill=(18, 65, 85), width=1)

        # 3. Phase 2 & 3 & 4: Radar Grid & Sweep
        if radar["active"] and radar["opacity"] > 0:
            grid_op = radar["opacity"]
            grid_color = (0, int(212 * grid_op), int(255 * grid_op))
            
            # Perspective grid radiating from horizon center
            vanish_x = width // 2
            vanish_y = horizon_y
            
            for gx in range(-6, 7):
                bx = vanish_x + gx * (width // 5)
                draw.line([(vanish_x, vanish_y), (bx, height)], fill=grid_color, width=1)
                
            # Concentric rings
            center_x = width // 2
            center_y = int(height * 0.75)
            sweep_angle = math.radians(radar.get("sweepAngleDeg", 0))
            
            for ring_r in [80, 160, 260, 380]:
                scaled_r_x = int(ring_r * 1.6)
                scaled_r_y = int(ring_r * 0.6)
                bbox = [center_x - scaled_r_x, center_y - scaled_r_y, center_x + scaled_r_x, center_y + scaled_r_y]
                draw.ellipse(bbox, outline=grid_color, width=1)

            # Sweep beam
            beam_x = center_x + int(320 * math.cos(sweep_angle))
            beam_y = center_y + int(120 * math.sin(sweep_angle))
            draw.line([(center_x, center_y), (beam_x, beam_y)], fill=(0, 240, 255), width=2)

        # 4. Phase 3 & 4: Geo Boundaries (Emerald Safe vs Crimson Hazard)
        if boundary["active"]:
            safe_op = boundary["safeZoneOpacity"]
            haz_op = boundary["hazardZoneOpacity"]
            
            # Emerald Safe Corridor (Center navigation channel)
            safe_color = (0, int(229 * safe_op), int(163 * safe_op))
            corridor_poly = [
                (int(width * 0.42), int(height * 0.50)),
                (int(width * 0.58), int(height * 0.50)),
                (int(width * 0.68), int(height * 0.95)),
                (int(width * 0.32), int(height * 0.95))
            ]
            draw.line(corridor_poly + [corridor_poly[0]], fill=safe_color, width=2)
            
            # Crimson Hazard Zone (Shoal / Reef on left)
            haz_color = (int(255 * haz_op), int(51 * haz_op), int(68 * haz_op))
            haz_poly = [
                (int(width * 0.08), int(height * 0.62)),
                (int(width * 0.28), int(height * 0.58)),
                (int(width * 0.25), int(height * 0.85)),
                (int(width * 0.05), int(height * 0.82))
            ]
            draw.line(haz_poly + [haz_poly[0]], fill=haz_color, width=2)

        # 5. Technical Watermark / Frame info
        info_text = f"FRAME {idx:03d}/120 | {phase_name.upper()} | WAVE {wave_h}m"
        draw.text((24, height - 32), info_text, fill=(157, 180, 190))
        
        # Save output
        out_path = os.path.join(output_dir, file_name)
        img.save(out_path, "PNG", optimize=True)
        
    print(f"Successfully generated all {len(frames_meta)} procedural frames in {output_dir}.")

def main():
    parser = argparse.ArgumentParser(description="ORCA Cinematic Frame Extractor & Generator")
    parser.add_argument("--video", help="Path to input video for FFmpeg extraction")
    parser.add_argument("--output", default=None, help="Output directory")
    parser.add_argument("--generate-procedural", action="store_true", default=True, help="Generate procedural baseline frames")
    parser.add_argument("--width", type=int, default=1280, help="Frame width")
    parser.add_argument("--height", type=int, default=720, help="Frame height")
    
    args = parser.parse_args()
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    
    output_dir = args.output or os.path.join(root, "frontend", "public", "cinematic", "frames")
    manifest_path = os.path.join(root, "frontend", "public", "cinematic", "sequence-manifest.json")
    
    if args.video:
        extract_from_video(args.video, output_dir, args.width, args.height)
    else:
        generate_procedural_frames(manifest_path, output_dir, args.width, args.height)

if __name__ == "__main__":
    main()
