# ORCA Cinematic Scrolltelling: Implementation Report

## Executive Summary

The ORCA opening experience has been transformed from a basic spinning 3D globe into an immersive, photorealistic 120-frame cinematic marine intelligence scroll sequence. This experience introduces visitors to ORCA's core purpose: transforming an unpredictable and hazardous ocean into an interpretable, geographically mapped marine intelligence command centre.

---

## Architecture & Visual Progression

The cinematic sequence advances through four distinct visual phases across exactly 120 frames:

1. **Phase 1: Deep Hazard (Frames 001–030)**
   - *Visuals:* Immense, stormy ocean, dark navy-blue waters (`#030B10`), turbulent wave physics, spray and foam.
   - *Theme:* Unmitigated maritime risk, environmental unpredictability, lack of spatial orientation.
2. **Phase 2: Data Calibration (Frames 031–060)**
   - *Visuals:* Cyan sensor lines (`#00d4ff`) project across the water; perspective grid anchors to the sea; 360° radar sweep illuminates swells.
   - *Theme:* Geospatial calibration, coordinate datum anchoring, synthesis of numerical ocean models.
3. **Phase 3: Safe Zone Identification (Frames 061–090)**
   - *Visuals:* Dynamic vector polygons emerge; crisp separation between crimson hazard zones (`#ff3344`) and emerald safe transit corridors (`#00e5a3`).
   - *Theme:* Separation of risk and opportunity, bathymetric barrier isolation, verifiable corridor safety.
4. **Phase 4: Optimized Advisory (Frames 091–120)**
   - *Visuals:* Warm dawn sunlight breaks over calm waters; golden reflections harmonize with glowing emerald corridors; high atmospheric visibility.
   - *Theme:* Operational clarity, actionable advisory, ready to enter the live command centre.

---

## Technical Features Implemented

1. **Scroll-Driven Canvas Pipeline (`CinematicScrollCanvas.jsx`):**
   - Maps normalized scroll progression $p \in [0, 1]$ to frame index $i = \lfloor 119 \cdot p \rceil$.
   - Sticky viewport wrapper (400vh virtual track) enabling natural scroll inertia.
   - Double-buffered canvas painting driven by `requestAnimationFrame`.
2. **Dual-Engine Rendering (Image Stream + Procedural Fallback):**
   - High-priority preloading of frame 001.
   - Windowed frame prefetcher for low latency during scrolling.
   - Full procedural dynamic fallback: If image assets are loading or network is slow, procedural physics simulation draws waves, radar sweeps, coordinate grids, and corridor polygons dynamically based on frame metadata.
3. **Synchronized Telemetry Overlay (`CinematicOverlay.jsx`):**
   - Real-time display of active phase, progress bar, coordinates, wave height, risk status, and narrative guidance.
   - Accessible DOM typography:
     - Headline: **"READ THE OCEAN. NAVIGATE WITH INTELLIGENCE."**
     - Supporting copy: *"From changing sea conditions to clearer marine decisions, ORCA brings ocean intelligence into focus."*
   - Direct CTA: **"ENTER MARINE COMMAND CENTRE"** with instant skip option for immediate access.
4. **Zero Regression Guarantee:**
   - Operational dashboard (`App.jsx`, `OceanGlobe3D.jsx`, `MapView.jsx`, `ChatSidebar.jsx`, telemetry ribbon, port selectors, timeline) remains 100% intact and functional.
   - Cleaned and modernized platform branding across all components and documentation.
