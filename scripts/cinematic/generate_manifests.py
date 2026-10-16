#!/usr/bin/env python3
"""
Generate sequence-manifest.json and frame-manifest.csv for ORCA 120-frame cinematic sequence.
Adheres strictly to the 4-phase narrative specification:
Phase 1: Deep Hazard (001-030)
Phase 2: Data Calibration (031-060)
Phase 3: Safe Zone Identification (061-090)
Phase 4: Optimized Advisory (091-120)
"""
import os
import json
import csv
import math

TOTAL_FRAMES = 120

def generate_frames():
    frames = []
    base_lat = 18.9220
    base_lon = 72.8180

    for i in range(1, TOTAL_FRAMES + 1):
        idx_str = f"{i:03d}"
        file_name = f"frame_{idx_str}.png"
        
        # Determine Phase
        if 1 <= i <= 30:
            phase_num = 1
            phase_name = "Deep Hazard"
            phase_progress = (i - 1) / 29.0
            
            # Sub-segment narratives
            if i <= 5:
                sub = "Establish vast dark ocean and storm horizon with turbulent swells."
            elif i <= 10:
                sub = "Rougher wave crests, wind-driven spray, and heavy cloud movement."
            elif i <= 15:
                sub = "Maximum turbulence, reduced visibility, and unpredictable ocean hazard."
            elif i <= 20:
                sub = "Threatening sea conditions and deep atmospheric perspective."
            elif i <= 25:
                sub = "Camera stabilization begins while retaining storm intensity."
            else:
                sub = "Ocean composition stabilizes, preparing for radar calibration."
                
            wave_height = round(4.2 + 1.6 * math.sin(phase_progress * math.pi) * 0.9 + 0.3 * math.sin(i * 0.7), 2)
            wave_period = round(11.5 - phase_progress * 1.5, 1)
            foam_coverage = round(0.45 + 0.35 * phase_progress, 2)
            turbulence = round(0.95 - phase_progress * 0.15, 2)
            
            lighting = {
                "theme": "Storm Midnight",
                "ambientColor": "#030B10",
                "keyLightColor": "#123B49",
                "sunElevationDeg": -12.0,
                "colorTempK": 9500,
                "exposure": round(0.35 + phase_progress * 0.05, 2)
            }
            camera = {
                "pitchDeg": round(-18.0 + 3.0 * math.sin(i * 0.2), 1),
                "rollDeg": round(2.5 * math.sin(i * 0.3), 1),
                "yawDeg": round(phase_progress * 5.0, 1),
                "altitudeM": round(45.0 + 10.0 * math.sin(phase_progress * math.pi), 1),
                "fovDeg": 55.0
            }
            radar = {
                "active": False,
                "opacity": 0.0,
                "sweepAngleDeg": 0.0,
                "gridDensity": 0.0
            }
            boundary = {
                "active": False,
                "safeZoneOpacity": 0.0,
                "hazardZoneOpacity": 0.0,
                "corridorClarity": 0.0
            }
            risk_level = "CRITICAL_HAZARD"
            advisory = "Uncharted sea conditions. Environmental hazards unmitigated."

        elif 31 <= i <= 60:
            phase_num = 2
            phase_name = "Data Calibration"
            phase_progress = (i - 31) / 29.0
            
            if i <= 35:
                sub = "First faint cyan sensor scan lines project across ocean swell."
            elif i <= 40:
                sub = "Perspective-aligned spatial telemetry grid anchors to the water plane."
            elif i <= 45:
                sub = "Rotating radar sweep beam illuminates wave crests and bathymetric slopes."
            elif i <= 50:
                sub = "Geographic coordinates and sensor datum markers lock into position."
            elif i <= 55:
                sub = "Telemetry grid achieves full spatial alignment and perspective lock."
            else:
                sub = "Calibration complete: ocean topography mapped and ready for boundaries."
                
            wave_height = round(3.8 - phase_progress * 1.2 + 0.2 * math.sin(i * 0.5), 2)
            wave_period = round(10.0 - phase_progress * 1.0, 1)
            foam_coverage = round(0.55 - phase_progress * 0.25, 2)
            turbulence = round(0.80 - phase_progress * 0.35, 2)
            
            lighting = {
                "theme": "Cyan Sensor Dawn",
                "ambientColor": "#051622",
                "keyLightColor": "#00d4ff",
                "sunElevationDeg": -6.0 + phase_progress * 4.0,
                "colorTempK": 8200,
                "exposure": round(0.42 + phase_progress * 0.12, 2)
            }
            camera = {
                "pitchDeg": round(-19.5 + phase_progress * 2.0, 1),
                "rollDeg": round(1.0 * math.sin(i * 0.2) * (1.0 - phase_progress), 1),
                "yawDeg": round(5.0 + phase_progress * 7.0, 1),
                "altitudeM": round(52.0 + phase_progress * 18.0, 1),
                "fovDeg": round(55.0 + phase_progress * 3.0, 1)
            }
            radar = {
                "active": True,
                "opacity": round(0.15 + phase_progress * 0.70, 2),
                "sweepAngleDeg": round((i * 12.0) % 360, 1),
                "gridDensity": round(phase_progress * 1.0, 2)
            }
            boundary = {
                "active": False,
                "safeZoneOpacity": 0.0,
                "hazardZoneOpacity": 0.0,
                "corridorClarity": 0.0
            }
            risk_level = "CALIBRATING"
            advisory = "Calibrating real-time spatial matrix. Synthesizing oceanographic datum."

        elif 61 <= i <= 90:
            phase_num = 3
            phase_name = "Safe Zone Identification"
            phase_progress = (i - 61) / 29.0
            
            if i <= 65:
                sub = "Spatial boundary vertices materialize over bathymetric ridges."
            elif i <= 70:
                sub = "High-precision vector corridors interconnect active datum points."
            elif i <= 75:
                sub = "Closed polygonal boundary rings isolate restricted shallow shoals."
            elif i <= 80:
                sub = "Distinct color separation: Crimson hazard exclusion vs Emerald safe transit."
            elif i <= 85:
                sub = "Navigation corridor vectors reach full clarity and geo-referencing."
            else:
                sub = "Stable, validated spatial corridors established across the coastal sector."
                
            wave_height = round(2.6 - phase_progress * 1.0 + 0.15 * math.sin(i * 0.4), 2)
            wave_period = round(9.0 - phase_progress * 0.8, 1)
            foam_coverage = round(0.30 - phase_progress * 0.15, 2)
            turbulence = round(0.45 - phase_progress * 0.25, 2)
            
            lighting = {
                "theme": "Vector Demarcation",
                "ambientColor": "#072030",
                "keyLightColor": "#00f0ff",
                "sunElevationDeg": -1.5 + phase_progress * 3.5,
                "colorTempK": 7000,
                "exposure": round(0.55 + phase_progress * 0.15, 2)
            }
            camera = {
                "pitchDeg": round(-17.5 + phase_progress * 2.5, 1),
                "rollDeg": 0.0,
                "yawDeg": round(12.0 + phase_progress * 6.0, 1),
                "altitudeM": round(70.0 + phase_progress * 25.0, 1),
                "fovDeg": round(58.0 + phase_progress * 2.0, 1)
            }
            radar = {
                "active": True,
                "opacity": round(0.85 - phase_progress * 0.25, 2),
                "sweepAngleDeg": round((i * 12.0) % 360, 1),
                "gridDensity": 1.0
            }
            boundary = {
                "active": True,
                "safeZoneOpacity": round(0.20 + phase_progress * 0.80, 2),
                "hazardZoneOpacity": round(0.25 + phase_progress * 0.75, 2),
                "corridorClarity": round(0.30 + phase_progress * 0.70, 2)
            }
            risk_level = "MAPPED_CORRIDORS"
            advisory = "Safe navigation corridors verified. Hazard boundaries marked in red."

        else: # 91 <= i <= 120
            phase_num = 4
            phase_name = "Optimized Advisory"
            phase_progress = (i - 91) / 29.0
            
            if i <= 95:
                sub = "First golden-hour dawn rays crest horizon, illuminating calm emerald swells."
            elif i <= 100:
                sub = "Warm natural gold water reflections blend with rich cyan bathymetry."
            elif i <= 105:
                sub = "Optimized fishing corridors radiate emerald clarity; hazard zones clearly bounded."
            elif i <= 110:
                sub = "Atmospheric clarity reaches maximum; spatial telemetry harmonizes with sea."
            elif i <= 115:
                sub = "Command center interface aligns into live operational status."
            else:
                sub = "Optimal operational advisory state reached. Ready to enter Marine Command Centre."
                
            wave_height = round(1.6 - phase_progress * 0.5 + 0.1 * math.sin(i * 0.3), 2)
            wave_period = round(8.2 - phase_progress * 0.6, 1)
            foam_coverage = round(0.15 - phase_progress * 0.08, 2)
            turbulence = round(0.20 - phase_progress * 0.12, 2)
            
            lighting = {
                "theme": "Golden Hour Advisory",
                "ambientColor": "#0b2b3d",
                "keyLightColor": "#ffb347",
                "sunElevationDeg": round(2.0 + phase_progress * 10.0, 1),
                "colorTempK": round(5800 - phase_progress * 1400),
                "exposure": round(0.72 + phase_progress * 0.23, 2)
            }
            camera = {
                "pitchDeg": round(-15.0 + phase_progress * 3.0, 1),
                "rollDeg": 0.0,
                "yawDeg": round(18.0 + phase_progress * 4.0, 1),
                "altitudeM": round(95.0 + phase_progress * 25.0, 1),
                "fovDeg": 60.0
            }
            radar = {
                "active": True,
                "opacity": round(0.60 - phase_progress * 0.20, 2),
                "sweepAngleDeg": round((i * 12.0) % 360, 1),
                "gridDensity": 0.8
            }
            boundary = {
                "active": True,
                "safeZoneOpacity": round(1.0 - phase_progress * 0.1, 2),
                "hazardZoneOpacity": round(1.0 - phase_progress * 0.1, 2),
                "corridorClarity": 1.0
            }
            risk_level = "OPTIMIZED_ADVISORY"
            advisory = "Operational clarity achieved. Marine advisory active and ready for navigation."

        # Coordinates slightly drift with ocean current
        current_lat = round(base_lat + (i - 1) * 0.0005, 4)
        current_lon = round(base_lon + (i - 1) * 0.0008, 4)

        record = {
            "frameIndex": i,
            "fileName": file_name,
            "phase": {
                "number": phase_num,
                "name": phase_name,
                "progress": round(phase_progress, 3)
            },
            "narrative": sub,
            "wavePhysics": {
                "waveHeightM": wave_height,
                "periodSec": wave_period,
                "foamCoverage": foam_coverage,
                "turbulence": turbulence
            },
            "lighting": lighting,
            "camera": camera,
            "radarOverlay": radar,
            "boundaryOverlay": boundary,
            "telemetry": {
                "latitude": current_lat,
                "longitude": current_lon,
                "riskLevel": risk_level,
                "advisory": advisory
            }
        }
        frames.append(record)

    return frames

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    json_path = os.path.join(root, "frontend", "public", "cinematic", "sequence-manifest.json")
    csv_path = os.path.join(root, "docs", "cinematic", "frame-manifest.csv")
    
    os.makedirs(os.path.dirname(json_path), exist_ok=True)
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    
    frames = generate_frames()
    
    manifest_data = {
        "sequenceTitle": "ORCA Cinematic Scrolltelling - Master Sequence",
        "totalFrames": TOTAL_FRAMES,
        "masterResolution": "1920x1080",
        "aspectRatio": "16:9",
        "fpsStandard": 24,
        "phases": [
            {"phase": 1, "name": "Deep Hazard", "frameRange": [1, 30], "description": "Immense storm ocean, high turbulence, low visibility."},
            {"phase": 2, "name": "Data Calibration", "frameRange": [31, 60], "description": "Cyan radar sweep, spatial telemetry grid calibration."},
            {"phase": 3, "name": "Safe Zone Identification", "frameRange": [61, 90], "description": "Vector boundaries distinguish crimson hazard from emerald safe zones."},
            {"phase": 4, "name": "Optimized Advisory", "frameRange": [91, 120], "description": "Golden-hour sunlight, clear marine advisory, dashboard transition."}
        ],
        "frames": frames
    }
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    print(f"Generated {json_path} with {len(frames)} frames.")
    
    # Write CSV
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "frame_index", "file_name", "phase_number", "phase_name", "phase_progress",
            "narrative", "wave_height_m", "period_sec", "foam_coverage", "turbulence",
            "lighting_theme", "sun_elevation_deg", "color_temp_k", "camera_altitude_m",
            "camera_pitch_deg", "radar_opacity", "boundary_safe_opacity", "boundary_hazard_opacity",
            "risk_level", "latitude", "longitude"
        ])
        for fr in frames:
            writer.writerow([
                fr["frameIndex"],
                fr["fileName"],
                fr["phase"]["number"],
                fr["phase"]["name"],
                fr["phase"]["progress"],
                fr["narrative"],
                fr["wavePhysics"]["waveHeightM"],
                fr["wavePhysics"]["periodSec"],
                fr["wavePhysics"]["foamCoverage"],
                fr["wavePhysics"]["turbulence"],
                fr["lighting"]["theme"],
                fr["lighting"]["sunElevationDeg"],
                fr["lighting"]["colorTempK"],
                fr["camera"]["altitudeM"],
                fr["camera"]["pitchDeg"],
                fr["radarOverlay"]["opacity"],
                fr["boundaryOverlay"]["safeZoneOpacity"],
                fr["boundaryOverlay"]["hazardZoneOpacity"],
                fr["telemetry"]["riskLevel"],
                fr["telemetry"]["latitude"],
                fr["telemetry"]["longitude"]
            ])
    print(f"Generated {csv_path} with {len(frames)} rows.")

if __name__ == "__main__":
    main()
