// ============================================================
// STATE MANAGER
// Centralised, validated write-access to the application state.
//
// Design contract:
//   • Direct reads from the global `state` object remain allowed
//     (backward-compatible with existing code).
//   • All writes that affect other modules should go through
//     StateManager so validation and event emission happen once.
//   • StateManager depends on: CONSTANTS, EventBus, state (globals).
// ============================================================

const StateManager = (function () {

    // ── Layer reads ───────────────────────────────────────────

    function getLayer(id) {
        return state.layers.find(l => l.id === id) || null;
    }

    function getActiveLayer() {
        return getLayer(state.activeLayerId);
    }

    // ── Layer mutations ───────────────────────────────────────

    /**
     * Set the active layer by id (or null to deselect).
     * Validates that the id exists before writing to state.
     * Emits 'ui:update' and 'render'.
     */
    function setActiveLayer(id) {
        if (id !== null && id !== undefined && !getLayer(id)) {
            console.warn(`[StateManager] setActiveLayer: unknown id "${id}"`);
            return;
        }
        state.activeLayerId = id;
        EventBus.emit('ui:update');
        EventBus.emit('render');
    }

    /**
     * Append a new layer object to the stack.
     * Validates that the layer has a unique id.
     */
    function pushLayer(layer) {
        if (!layer || layer.id === undefined || layer.id === null) {
            console.warn('[StateManager] pushLayer: invalid layer object (missing id)');
            return;
        }
        state.layers.push(layer);
    }

    /**
     * Remove a layer by id. Also stops its animation.
     */
    function removeLayer(id) {
        state.layers = state.layers.filter(l => l.id !== id);
        EventBus.emit('animation:stop', id);
    }

    /**
     * Patch arbitrary properties onto an existing layer.
     * Silently ignores unknown ids.
     */
    function updateLayer(id, patch) {
        const layer = getLayer(id);
        if (!layer) return;
        Object.assign(layer, patch);
    }

    /**
     * Replace the entire layers array (used by undo/redo and project load).
     */
    function setLayers(layers) {
        state.layers = layers;
    }

    // ── Settings mutations ────────────────────────────────────

    /**
     * Set mask tolerance with clamping (0-255).
     */
    function setTolerance(value) {
        state.tolerance = Math.max(0, Math.min(255,
            parseInt(value) || CONSTANTS.MASK_TOLERANCE_DEFAULT));
    }

    /**
     * Set the target mod with validation.
     */
    function setTargetMod(mod) {
        if (mod !== 'wynntils' && mod !== 'minecraftcapes') {
            console.warn(`[StateManager] setTargetMod: unknown mod "${mod}"`);
            return;
        }
        state.targetMod = mod;
    }

    // ── Public API ────────────────────────────────────────────

    return Object.freeze({
        getLayer,
        getActiveLayer,
        setActiveLayer,
        pushLayer,
        removeLayer,
        updateLayer,
        setLayers,
        setTolerance,
        setTargetMod,
    });
})();
