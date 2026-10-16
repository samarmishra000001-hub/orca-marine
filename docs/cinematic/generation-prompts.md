# ORCA Cinematic Scrolltelling: Image Generation Prompts

This document provides the production-grade prompt specifications for generating keyframes using **Google Whisk** (image-to-image / text-and-image conditioning) and **Midjourney v6.1 / v7** for the 120-frame ORCA cinematic marine intelligence sequence.

---

## 1. Global Visual Style & Consistency Parameters

To maintain strict visual coherence across all 120 frames:
- **Aspect Ratio:** `--ar 16:9` (1920×1080 master target)
- **Style Direction:** Photorealistic cinematic ocean cinematography, aerial-oblique 45-degree angle, physical oceanography wave dynamics, realistic water Fresnel reflections, atmospheric aerial haze, volumetric lighting.
- **Negative Prompts (Midjourney `--no`):**
  `--no cartoon, 3d render plastic, low resolution, blurry horizon, cyberpunk neon overkill, fake text, watermarks, signature, unrealistic waves, anime, illustration`
- **Stylize & Quality:** `--style raw --v 6.1 --stylize 250 --quality 2`

---

## 2. Phase 1 — Deep Hazard (Frames 001–030)

### Narrative Focus
An unpredictable, turbulent ocean under heavy storm clouds. Dramatic dark waves, wind-driven whitecaps, low visibility, and deep environmental uncertainty. Midnight blue-black palette with cold steel-blue highlights.

#### Keyframe 001 (Sequence Opening)
> **Midjourney Prompt:**
> `Cinematic aerial oblique wide shot of a vast stormy ocean at twilight, deep midnight navy water (#030B10) with dark steel-blue swell crests, wind speed 30 knots, 4.5-meter turbulent ocean swells, heavy wind-blown spray and desaturated sea foam, dramatic low overcast storm clouds on the horizon, cold atmospheric perspective, ultra-realistic wave physics, 35mm anamorphic cinematography, volumetric atmospheric mist --ar 16:9 --style raw --v 6.1 --stylize 200`
>
> **Google Whisk Conditioning:**
> - *Subject:* Open stormy sea surface, large ocean swell, deep ocean trench.
> - *Lighting:* Low-key storm lighting, diffuse ambient dark teal-blue, no direct sun.
> - *Camera:* 50m altitude, 20° downward tilt, wide focal length.

#### Keyframe 015 (Peak Hazard Turbulence)
> **Midjourney Prompt:**
> `Cinematic high-angle drone view of turbulent storm seas, 5.8-meter towering dark ocean waves breaking with wind-whipped foam streaks, heavy ocean spray, deep sea turbulence, atmospheric storm clouds obscuring distance, cold desaturated color grading, photorealistic water fluid dynamics, cinematic marine documentary photography --ar 16:9 --style raw --v 6.1 --stylize 250`

#### Keyframe 030 (Hazard Stabilization)
> **Midjourney Prompt:**
> `Cinematic wide aerial shot of a calming deep oceanic swell, 3.8-meter rolling waves stabilizing in direction, dark blue water with subtle cyan ambient reflection, storm clouds parting slightly at upper edge, coherent water plane geometry, preparing for telemetry alignment, 8k resolution, photorealistic maritime cinematography --ar 16:9 --style raw --v 6.1`

---

## 3. Phase 2 — Data Calibration (Frames 031–060)

### Narrative Focus
ORCA's spatial intelligence begins mapping the ocean plane. Faint cyan telemetry lines, perspective-aligned grid, and subtle rotating radar sweep illuminating the wave crests.

#### Keyframe 045 (Mid-Calibration Radar Sweep)
> **Midjourney Prompt:**
> `Cinematic aerial perspective of dark blue ocean with an elegant luminous cyan geometric telemetry grid (#00d4ff) conforming to the water plane, a subtle 360-degree radar sweep beam illuminating ocean wave peaks with soft cyan glow, coordinate crosshairs and navigational datum points, technical marine intelligence interface, restrained elegant technical aesthetics, photorealistic ocean water underneath, high-tech maritime monitoring --ar 16:9 --style raw --v 6.1`
>
> **Google Whisk Conditioning:**
> - *Input Image:* Keyframe 030 as structural guide.
> - *Overlay Prompt:* Luminous perspective cyan radar grid, 0.4 opacity, fine technical line-weights.

#### Keyframe 060 (Calibration Complete)
> **Midjourney Prompt:**
> `Cinematic wide view of calibrated ocean sector, sharp cyan spatial grid locked to sea surface perspective, clear geographic coordinate markings in fine technical typography, stable ocean swells at 3 meters, deep navy water with crisp teal sensor reflections, clean horizon, transition to spatial boundary demarcation --ar 16:9 --style raw --v 6.1`

---

## 4. Phase 3 — Safe Zone Identification (Frames 061–090)

### Narrative Focus
Geographic intelligence separates restricted shallow/hazard zones from candidate safe fishing corridors. Emerald-teal vectors for safe corridors; crimson/red-orange for hazard zones.

#### Keyframe 075 (Vector Polygon Formation)
> **Midjourney Prompt:**
> `Cinematic ocean surveillance view showing luminous geographic boundary polygons over the sea surface, glowing emerald green (#00e5a3) safe navigation corridors contrasting with deep crimson (#ff3344) restricted hazard zones, fine vector line segments connecting coordinate vertices, photorealistic 2.2-meter ocean waves beneath transparent glowing overlays, maritime navigation intelligence display --ar 16:9 --style raw --v 6.1`

#### Keyframe 090 (Fully Demarcated Marine Map)
> **Midjourney Prompt:**
> `Cinematic aerial command view of marine coastal sector, clearly defined luminous green safe maritime corridors and red hazard zones mapped across calm ocean waters, high contrast spatial clarity, elegant minimal technical lines, dark sapphire water, clear horizon under soft early morning light, professional GIS marine intelligence overlay --ar 16:9 --style raw --v 6.1`

---

## 5. Phase 4 — Optimized Advisory (Frames 091–120)

### Narrative Focus
Golden-hour dawn sunlight illuminates the calm ocean. Warm gold reflections over rich sapphire water, calm emerald corridor highlights, clear high-visibility hazard indicators, resolving into an operational invitation.

#### Keyframe 105 (Golden Hour Dawn)
> **Midjourney Prompt:**
> `Breathtaking cinematic golden hour sunrise over calm ocean, warm golden sunlight reflecting across gentle 1.2-meter swells, rich deep blue water, delicate glowing emerald navigation corridors illuminated by morning light, faint crimson safety perimeter lines, crystal clear atmospheric perspective, cinematic masterclass cinematography, 8k, ultra-realistic water refraction --ar 16:9 --style raw --v 6.1`

#### Keyframe 120 (Command Centre Transition)
> **Midjourney Prompt:**
> `Stunning aerial command perspective of golden-hour marine observatory sector, calm ocean glowing with morning light and subtle cyan-emerald navigational corridors, ultra-clean maritime horizon, serene coastal atmosphere, high aesthetic fidelity, seamlessly transitioning into an operational marine command center dashboard, masterwork cinematography --ar 16:9 --style raw --v 6.1`

---

## 6. Video Interpolation & Diffusion Pipeline

To create all 120 continuous frames:
1. Generate keyframes at 15-frame increments (001, 015, 030, 045, 060, 075, 090, 105, 120).
2. Feed adjacent keyframes into **Runway Gen-3 Alpha** or **Luma Dream Machine** using keyframe-to-keyframe interpolation.
3. Extract frames using the `scripts/cinematic/extract_frames.py` script at exact 120-frame uniform sampling.
4. Validate naming and resolution consistency with `scripts/cinematic/validate_frames.py`.
