# ORCA Cinematic Scrolltelling: Asset Pipeline Specification

This document details the asset preparation, conversion, compression, and delivery pipeline for the 120-frame sequence (`frame_001.png` through `frame_120.png`).

---

## 1. Directory Structure

Assets are distributed across the repository as follows:

```
orca-marine/
├── frontend/
│   ├── public/
│   │   └── cinematic/
│   │       ├── sequence-manifest.json      # Master metadata (120 frames, phases, physics)
│   │       ├── frames/                     # Standard master frames (frame_001.png .. frame_120.png)
│   │       └── frames-mobile/              # Scaled mobile frames (720p WebP/PNG for high performance)
├── docs/
│   └── cinematic/
│       ├── frame-manifest.csv
│       ├── generation-prompts.md
│       ├── interpolation-matrix.md
│       ├── asset-pipeline.md
│       ├── deployment-guide.md
│       └── implementation-report.md
└── scripts/
    └── cinematic/
        ├── generate_manifests.py
        ├── extract_frames.py
        └── validate_frames.py
```

---

## 2. Master Image Specifications

- **Format:** Modern progressive PNG or high-efficiency WebP (`.webp` fallback to `.png`).
- **Master Resolution (Desktop):** $1920 \times 1080$ pixels (16:9).
- **Mobile Resolution (Tiers $\le 768\text{px}$):** $1280 \times 720$ pixels.
- **Color Profile:** sRGB IEC61966-2.1.
- **Target File Size:** $\le 80\text{ KB}$ per frame in WebP, $\le 180\text{ KB}$ in optimized PNG. Total 120-frame payload budget: $\le 12\text{ MB}$ total, with dynamic windowed streaming.

---

## 3. Extraction & Validation CLI Tools

Two specialized automation scripts are provided in `scripts/cinematic/`:

1. **`extract_frames.py`**:
   - Takes a master 5-second 24fps render or MP4 file (`master_sequence.mp4`).
   - Uses `ffmpeg` or `imageio` to extract precisely 120 frames sampled uniformly.
   - Rescales and standardizes resolution to 1080p and 720p.
   - Names output strictly as `frame_001.png` through `frame_120.png`.

2. **`validate_frames.py`**:
   - Asserts exact frame count = 120.
   - Verifies sequence continuity (no missing index between 001 and 120).
   - Validates image dimensions, color space, and readability.
   - Emits a validation report.

---

## 4. In-Browser Progressive Streaming Strategy

The runtime `CinematicScrollCanvas` React component handles dynamic bandwidth conditions:
1. **Priority Zero:** `frame_001.png` loads synchronously with high fetch priority (`fetchpriority="high"`).
2. **Windowed Buffer:** A rolling sliding window of $\pm 10$ frames around the user's current scroll position is prefetched.
3. **Procedural Fallback Engine:** If any frame is not yet cached or if network latency occurs, the integrated canvas procedural shader instantly renders photorealistic waves, radar sweep, or vector boundaries corresponding to that exact frame's metadata in `sequence-manifest.json`.
4. **Memory Management:** Images older than 30 frames from the current viewport are pruned from GPU memory to prevent mobile memory leaks.
