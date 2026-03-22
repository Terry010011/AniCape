// ============================================================
// LAYER TRANSFORM UTILITIES
// Single source of truth for scale/rotation helpers.
// Eliminates the pattern:
//   layer.scaleX !== undefined ? layer.scaleX : layer.scale
// which was duplicated 15+ times across renderer.js, drag.js,
// controls.js, and animation.js.
// ============================================================

const LayerTransform = Object.freeze({

    /**
     * Resolved X scale (handles legacy `scale` fallback).
     * @param {object} layer
     * @returns {number}
     */
    getScaleX(layer) {
        return layer.scaleX !== undefined ? layer.scaleX : (layer.scale || 1);
    },

    /**
     * Resolved Y scale (handles legacy `scale` fallback).
     * @param {object} layer
     * @returns {number}
     */
    getScaleY(layer) {
        return layer.scaleY !== undefined ? layer.scaleY : (layer.scale || 1);
    },

    /**
     * Absolute rendered width in canvas pixels.
     * @param {object} layer
     * @param {HTMLImageElement|HTMLCanvasElement} displayImg
     * @returns {number}
     */
    getRenderedWidth(layer, displayImg) {
        return displayImg.width * Math.abs(this.getScaleX(layer));
    },

    /**
     * Absolute rendered height in canvas pixels.
     * @param {object} layer
     * @param {HTMLImageElement|HTMLCanvasElement} displayImg
     * @returns {number}
     */
    getRenderedHeight(layer, displayImg) {
        return displayImg.height * Math.abs(this.getScaleY(layer));
    },

    /**
     * Apply translate → rotate → scale to a 2D context.
     * Caller must ctx.save() / ctx.restore() around this.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} layer
     */
    applyToContext(ctx, layer) {
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        ctx.scale(this.getScaleX(layer), this.getScaleY(layer));
    },

    /**
     * Hit-test: returns true when canvas point (mx, my) is inside
     * the layer's oriented bounding box.
     * @param {object} layer
     * @param {HTMLImageElement|HTMLCanvasElement} displayImg
     * @param {number} mx  - canvas-space X
     * @param {number} my  - canvas-space Y
     * @returns {boolean}
     */
    containsPoint(layer, displayImg, mx, my) {
        const halfW = this.getRenderedWidth(layer, displayImg) / 2;
        const halfH = this.getRenderedHeight(layer, displayImg) / 2;
        const angle = -(layer.rotation || 0) * Math.PI / 180;
        const dx = mx - layer.x;
        const dy = my - layer.y;
        const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
        return rx >= -halfW && rx <= halfW && ry >= -halfH && ry <= halfH;
    },
});
