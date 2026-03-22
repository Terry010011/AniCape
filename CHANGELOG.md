# Changelog

All notable changes to AniCape are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — Initial Release

### Added
- Layer-based canvas composition (image layers + solid colour layers)
- GIF / APNG import with frame extraction and animated playback
- Per-layer transform controls: position, scale (with aspect-lock), rotation, flip, opacity
- Region masking — colour-matched clipping to cape template regions (front, back, border, elytra)
- Undo / Redo history stack (50 levels)
- Export pipeline:
  - Wynntils: optimised PNG strip (OxiPNG + UPNG 8-bit fallback)
  - MinecraftCapes: optimised GIF with 100ms resampling option
- 3D preview with cape / elytra toggle powered by skinview3d
- Save / Load `.anicape` project files (JSZip)
- PWA manifest + Service Worker for offline use
- Bilingual UI: English and Traditional Chinese (繁體中文)
- Light / Dark theme with system preference detection
- Responsive layout with mobile touch support
- Interactive tutorial powered by driver.js
