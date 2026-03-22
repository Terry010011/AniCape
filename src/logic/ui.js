// ============================================================
// UI MANAGEMENT - CENTRAL DISPATCHER
// ============================================================

/**
 * Main function to refresh the entire UI based on current state.
 */
function updateUI() {
    // 1. Refresh layer list
    if (typeof updateLayerListUI === 'function') {
        updateLayerListUI();
    }

    // 2. Refresh property panel
    const panel = document.getElementById('layerProperties');
    if (!panel) return;

    const layer = state.layers.find(l => l.id === state.activeLayerId);

    if (layer) {
        panel.classList.remove('hidden');

        const propWidth       = document.getElementById('propWidth');
        const propHeight      = document.getElementById('propHeight');
        const propRot         = document.getElementById('propRot');
        const propOpacity     = document.getElementById('propOpacity');
        const propOpacityInput = document.getElementById('propOpacityInput');
        const propScaleLock   = document.getElementById('propScaleLock');

        if (propWidth)  propWidth.value  = Math.round(Math.abs(LayerTransform.getScaleX(layer)) * 100);
        if (propHeight) propHeight.value = Math.round(Math.abs(LayerTransform.getScaleY(layer)) * 100);

        if (propScaleLock) {
            const isLocked = layer.scaleLocked !== false;
            propScaleLock.classList.toggle('locked', isLocked);
            propScaleLock.querySelector('.lock-unlocked')?.classList.toggle('hidden', isLocked);
            propScaleLock.querySelector('.lock-locked')?.classList.toggle('hidden', !isLocked);
        }

        if (propRot)          propRot.value          = Math.round(layer.rotation);
        if (propOpacity)      propOpacity.value      = layer.opacity;
        if (propOpacityInput) propOpacityInput.value = layer.opacity;

        // Deep sync: regions, animations, etc.
        if (typeof updateLayerPropertiesUI === 'function') {
            updateLayerPropertiesUI();
        }
    } else {
        panel.classList.add('hidden');
    }
}

// ── EventBus registration ─────────────────────────────────────
EventBus.on('ui:update', updateUI);
