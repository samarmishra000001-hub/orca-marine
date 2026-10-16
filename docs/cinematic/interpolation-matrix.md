# ORCA Cinematic Scrolltelling: Video Interpolation Matrix

This matrix governs the generation and temporal interpolation across the 120 frames using AI video synthesis models (e.g., Runway Gen-3 Alpha, Luma Dream Machine, Kling 1.5, or Stable Video Diffusion).

---

## 1. Interpolation Schedule (12 Intervals)

The sequence is divided into 12 ten-frame intervals ($I_1$ to $I_{12}$), ensuring strict temporal coherence, fluid wave motion, and seamless technical overlay blending.

| Interval | Frames | Phase | Source Keyframe | Target Keyframe | Primary Motion | Camera Altitude (m) | Radar Opacity | Boundary State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **$I_1$** | 001–010 | 1. Deep Hazard | `frame_001` | `frame_010` | Swell turbulence increase | 45.0 $\to$ 47.5 | 0.00 | None |
| **$I_2$** | 011–020 | 1. Deep Hazard | `frame_010` | `frame_020` | Peak wave breaking, spray | 47.5 $\to$ 51.0 | 0.00 | None |
| **$I_3$** | 021–030 | 1. Deep Hazard | `frame_020` | `frame_030` | Wave stabilization, camera settle | 51.0 $\to$ 52.0 | 0.00 | None |
| **$I_4$** | 031–040 | 2. Data Calibration | `frame_030` | `frame_040` | Cyan scan lines emerge | 52.0 $\to$ 56.5 | 0.15 $\to$ 0.35 | None |
| **$I_5$** | 041–050 | 2. Data Calibration | `frame_040` | `frame_050` | Grid perspective locking | 56.5 $\to$ 63.0 | 0.35 $\to$ 0.65 | None |
| **$I_6$** | 051–060 | 2. Data Calibration | `frame_050` | `frame_060` | 360° sweep rotation & datum lock | 63.0 $\to$ 70.0 | 0.65 $\to$ 0.85 | None |
| **$I_7$** | 061–070 | 3. Safe Zone Ident. | `frame_060` | `frame_070` | Boundary vertices appear | 70.0 $\to$ 78.5 | 0.85 $\to$ 0.75 | Vertices |
| **$I_8$** | 071–080 | 3. Safe Zone Ident. | `frame_070` | `frame_080` | Polygons close, color separation | 78.5 $\to$ 87.0 | 0.75 $\to$ 0.65 | Polygons (50%) |
| **$I_9$** | 081–090 | 3. Safe Zone Ident. | `frame_080` | `frame_090` | Corridor clarity reaches 100% | 87.0 $\to$ 95.0 | 0.65 $\to$ 0.60 | Full Corridors |
| **$I_{10}$** | 091–100 | 4. Optimized Advisory | `frame_090` | `frame_100` | Dawn sun breaks through, gold light | 95.0 $\to$ 103.0 | 0.60 $\to$ 0.50 | Corridors + Dawn |
| **$I_{11}$** | 101–110 | 4. Optimized Advisory | `frame_100` | `frame_110` | Water reflections warm, seas calm | 103.0 $\to$ 112.0 | 0.50 $\to$ 0.45 | Golden Emerald |
| **$I_{12}$** | 111–120 | 4. Optimized Advisory | `frame_110` | `frame_120` | Final flight into command view | 112.0 $\to$ 120.0 | 0.45 $\to$ 0.40 | Command Ready |

---

## 2. Motion Vector & Optical Flow Constraints

1. **Horizon Stability:**
   - The horizon line pitch must not exceed $\pm 3.5^\circ$ deviation between any adjacent 5-frame window.
   - Yaw angular velocity must remain bounded below $0.4^\circ/\text{frame}$.

2. **Wave Phase Continuity:**
   - Swell propagation must maintain directional vector $(0.82, -0.57)$ normalized (North-East direction), simulating realistic monsoon swells off the west coast of India.
   - Frequency dispersion must match shallow water wave physics equation $c = \sqrt{g h \tanh(kh)}$.

3. **Overlay Perspective Alignment:**
   - The radar telemetry grid and GeoJSON corridor polygons share a single ground plane homography matrix $H_{t}$.
   - Interpolation models must NOT morph or warp the coordinate grid arbitrarily; grid lines must retain affine perspective convergence towards the virtual vanishing point $(x_v, y_v) = (960, 480)$.

---

## 3. Tool Settings for Video Generative Engines

### Runway Gen-3 Alpha
- **Prompt:** `Aerial ocean shot, smooth forward drone motion, physically accurate ocean waves moving northeast, volumetric mist clearing into morning sunlight, high cinematic realism --motion 3`
- **First Frame:** Upload Interval start keyframe.
- **Last Frame:** Upload Interval end keyframe.
- **Duration:** 5 seconds (yielding 120 frames at 24fps for master sequence extraction).

### Luma Dream Machine
- Set Start Frame and End Frame anchors.
- Camera Motion: `Gentle Crane Up + Slight Tilt Down`.
- Prompt: `Photorealistic ocean surface, continuous fluid motion, calm water transitions`.
