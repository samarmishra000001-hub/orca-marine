# ORCA Cinematic Scrolltelling: CDN & Deployment Guide

This guide details edge caching, asset delivery, HTTP headers, and Vercel configuration for the 120-frame cinematic sequence.

---

## 1. Vercel Edge Headers Configuration

In `vercel.json` (or cloud provider edge configuration), configure immutable caching for the `/cinematic/` asset path. Because each frame file is keyed and deterministic, long-lived caching ensures zero redundant bandwidth consumption.

```json
{
  "headers": [
    {
      "source": "/cinematic/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    },
    {
      "source": "/cinematic/sequence-manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

---

## 2. Bandwidth & Performance Budgets

| Metric | Target Budget | Fallback Strategy |
| :--- | :--- | :--- |
| **Initial LCP (Frame 001)** | $< 1.2\text{s}$ on 4G | Inline SVG/Canvas wave procedural preview |
| **Average Frame Size** | $< 100\text{ KB}$ | WebP auto-negotiation via Cloudflare/Vercel Image Opt. |
| **Rolling Buffer Cache** | 20 frames max in memory | Automatic garbage collection of distant frames |
| **Interaction Latency** | $< 16.6\text{ms}$ (60fps) | `requestAnimationFrame` debounced canvas painting |
| **Mobile Memory Footprint** | $< 45\text{ MB}$ total canvas heap | Downsampled canvas backbuffer on mobile devices |

---

## 3. Fallback & Graceful Degradation Matrix

1. **Slow Network / Offline Mode:**
   If image fetches timeout or fail, the canvas automatically falls back to procedural mathematical rendering without halting the user's scroll or throwing an exception.
2. **`prefers-reduced-motion`:**
   If the user's OS preference indicates reduced motion, the component bypasses the scroll container and presents a static, low-motion welcome state with a single-click "Enter Command Centre" button.
3. **WebGL / Canvas Context Loss:**
   If the browser triggers `webglcontextlost` or standard 2D canvas failure, a resilient DOM fallback renders the phase typography and primary CTA.
