// ============================================================
// APPLICATION CONSTANTS
// All magic numbers live here. Import this file first so every
// other module can reference CONSTANTS.xxx instead of raw values.
// ============================================================

const CONSTANTS = Object.freeze({

    // ── History ──────────────────────────────────────────────
    HISTORY_LIMIT: 50,

    // ── Animation ────────────────────────────────────────────
    ANIMATION_DURATION_MS: 2000,      // Wynntils loop length (ms)
    FRAME_INTERVAL_MS: 100,           // MinecraftCapes frame tick (ms)
    MIN_GIF_FRAME_MS: 20,             // Frames shorter than this → treated as 100ms
    ANIMATION_MIN_FPS: 10,

    // ── Frame multiplier ─────────────────────────────────────
    FRAME_MULTIPLIER_MIN_MC: 0.25,    // MinecraftCapes minimum
    FRAME_MULTIPLIER_MIN_WY: 1,       // Wynntils minimum
    FRAME_MULTIPLIER_MAX: 100,
    FRAME_MULTIPLIER_MC_MAX_DIVISOR: 4, // maxLimit = floor(totalFrames / 4)

    // ── Canvas zoom ──────────────────────────────────────────
    ZOOM_MIN: 0.01,
    ZOOM_MAX: 50,
    ZOOM_STEP_IN: 1.05,
    ZOOM_STEP_OUT: 0.95,
    ZOOM_FIT_MARGIN: 0.5,            // fraction of workspace used for fit

    // ── Viewport pan ─────────────────────────────────────────
    MOVE_STEP_PX: 10,

    // ── Repeat button ────────────────────────────────────────
    REPEAT_DELAY_MS: 300,
    REPEAT_INTERVAL_MS: 50,

    // ── Layer ────────────────────────────────────────────────
    LAYER_MIN_PIXELS: 1,             // minimum width/height during resize
    OPACITY_STEP: 0.05,

    // ── Template / mask ──────────────────────────────────────
    MASK_TOLERANCE_DEFAULT: 80,
    MASK_ALPHA_THRESHOLD: 10,

    // ── Default canvas ───────────────────────────────────────
    DEFAULT_CANVAS_WIDTH: 128,
    DEFAULT_CANVAS_HEIGHT: 64,
    DEFAULT_CANVAS_SIZE: '128x64',

    // ── Misc ─────────────────────────────────────────────────
    DOWNLOAD_CLEANUP_MS: 2000,
    SOLID_LAYER_DEFAULT_COLOR: '#FF0000',
});
