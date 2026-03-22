// ============================================================
// APPLICATION STATE
// ============================================================

const state = {
    // Canvas & Template
    config: {
        regions: []
    },
    width: 64,
    height: 32,
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    targetMod: 'wynntils', // 'wynntils' or 'minecraftcapes'

    // Layers
    layers: [],
    activeLayerId: null,
    autoClip: true,
    autoSelectLayer: true,
    resampleForMC: true,

    // Template
    templateImg: null,
    showTemplate: true,
    showGrid: true,
    masks: {}, // { regionId: maskCanvas }
    tolerance: 80,

    // Animation
    animatingLayers: new Map(), // { layerId: { currentFrame, startTime, ... } }
    isAnimating: false,
    lastFrameTime: 0,

    // History
    historyStack: [],
    redoStack: [],

    // Shared temporary canvases for rendering (optimization)
    tempMaskCanvas: document.createElement('canvas'),
    tempLayerCanvas: document.createElement('canvas'),
};


// Note: History management (Undo/Redo) logic has been moved to src/logic/history.js
