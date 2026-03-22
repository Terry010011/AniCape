# AniCape | Minecraft Animated Cape Maker

English | [繁體中文](README_zh-TW.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](manifest.json)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()

AniCape is a web-based utility for creating animated capes for Minecraft. It is designed to assist players in producing high-quality content for mods such as Wynntils and MinecraftCapes without requiring complex external software.

---

## Key Features

- Layer-based composition: Allows combining multiple images and solid color layers.
- Animation management: Facilitates the processing of GIF files and custom frame sequences.
- Transformation tools: Provides precise controls for scaling, rotating, and flipping layers.
- Region mapping: Allows assigning layers to specific Minecraft cape segments (front, back, sides).
- 3D Preview: Enables visualization of the cape on a 3D model during the export process.
- Undo and Redo: Includes a robust history system for reviewing previous adjustments.
- Mod-specific optimization:
  - Wynntils: Exports as optimized PNG strips.
  - MinecraftCapes: Exports as optimized GIFs with time-based resampling.
- Mobile and PWA support: Accessible on various devices and installable as a web application for offline use.
- Multi-language support: Available in English and Traditional Chinese (繁體中文).

---

## Technology Stack

- Core: Vanilla JavaScript (ES6+), HTML5 Canvas
- Styling: Modern CSS3 with support for light and dark themes
- 3D Engine: [skinview3d](https://github.com/bs-community/skinview3d) for character model rendering
- Libraries:
  - `UPNG.js`: Advanced PNG encoding and optimization
  - `gif.js` & `omggif`: Performance-oriented GIF generation
  - `pako`: Zlib compression for project files
  - `JSZip`: Project archiving and export management
  - `driver.js`: Interactive user onboarding and guidance

---

## Project Structure

```text
src/
├── constants.js           # All magic numbers (history limit, zoom bounds, animation timing…)
│
├── core/
│   ├── EventBus.js        # Cross-module pub/sub — see the event catalogue inside
│   ├── StateManager.js    # Validated writes to the global state object
│   ├── state.js           # Raw application state
│   ├── i18n.js            # Translation system
│   ├── utils.js           # Helpers + config persistence
│   └── locales/           # en.json, zh.json
│
├── layers/
│   └── LayerTransform.js  # getScaleX/Y, getRenderedWidth/Height, applyToContext, containsPoint
│
├── logic/                 # Business logic
│   ├── renderer.js        # Canvas drawing + gizmo UI
│   ├── animation.js       # Frame sequencing + animation loop
│   ├── layers.js          # Layer CRUD
│   ├── history.js         # Undo / Redo
│   ├── ui.js              # Central UI dispatcher
│   ├── export.js          # Export dialog orchestration
│   ├── project.js         # Save / Load .anicape projects
│   └── tutorial.js        # driver.js onboarding
│
├── ui/                    # HTML renderers for UI panels
│   ├── layers.js          # Layer list
│   ├── properties.js      # Layer properties panel
│   └── colors.js          # Region colour picker
│
├── events/                # DOM event wiring
│   ├── bootstrap.js       # App initialisation entry point
│   ├── controls.js        # Button / input listeners
│   ├── drag.js            # Canvas drag (pan, move, resize, rotate)
│   ├── drop.js            # File drag-and-drop
│   ├── keyboard.js        # Keyboard shortcuts
│   ├── touch.js           # Touch events
│   └── wheel.js           # Mouse-wheel zoom
│
├── export/
│   ├── compositor.js      # Frame compositing
│   ├── optimizer.js       # PNG / GIF compression (WASM workers)
│   └── preview3d.js       # skinview3d 3D preview
│
├── parsers/
│   ├── GifParser.js       # Raw GIF binary parser
│   └── SimpleGifHandler.js # Unified animated-image loader
│
├── workers/
│   ├── oxipng.worker.js   # OxiPNG WASM (Web Worker)
│   └── upng.worker.js     # UPNG PNG encoding (Web Worker)
│
└── partials/              # Dynamically injected HTML modals

assets/        # Logos, cape templates, tutorial SVG
libs/          # Vendored third-party libraries (no npm)
css/           # style.css
index.html     # Entry point — also defines the script load order
```

> **For contributors:** the script load order in `index.html` follows a strict tier system.
> See [CONTRIBUTING.md](CONTRIBUTING.md) for the full architecture guide.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.
It covers the EventBus architecture, how to add new features, and the PR checklist.

---

## Getting Started

AniCape is a client-side application and can be run locally without specialized server configuration.

### Live Demo
The application is available at: [anicape.wryy.org](https://anicape.wryy.org/)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/Terry010011/AniCape.git
   ```
2. Open `index.html` in a modern web browser.
3. *Note*: Using a local development server (such as VS Code Live Server) is recommended to ensure all features, including Web Workers and PWA service workers, function as intended.

---

## License

This project is licensed under the MIT License. Please refer to the [LICENSE](LICENSE) file for more details.

---

## Credits

Developed by Terry010011. Appreciation is extended to the authors of the open-source libraries utilized in this project.
