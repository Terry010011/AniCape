// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

window.addEventListener('keydown', (e) => {
    // Global: Delete active layer
    if (e.key === 'Delete' && state.activeLayerId) deleteActiveLayer();

    // Spacebar: switch cursor to grab mode for panning
    if (e.code === 'Space') {
        e.preventDefault();
        workspace.style.cursor = 'grab';
    }

    // Ctrl / Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            undo();
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            redo();
        } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            document.getElementById('saveProjectBtn')?.click();
        } else if (e.key === 'e' || e.key === 'E') {
            e.preventDefault();
            document.getElementById('exportBtn')?.click();
        } else if (e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            if (state.activeLayerId) duplicateLayer(state.activeLayerId);
        }
        return;
    }

    if (!state.activeLayerId) return;
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (!layer) return;
    const displayImg = getLayerDisplayImage(layer);

    const key = e.key.toLowerCase();
    if (!['l', 'r', 't', 'b', 'm', 'a'].includes(key)) return;
    e.preventDefault();

    const sx = Math.abs(LayerTransform.getScaleX(layer));
    const sy = Math.abs(LayerTransform.getScaleY(layer));
    const curW = displayImg.width * sx;
    const curH = displayImg.height * sy;

    // Quick alignment shortcuts
    if (key === 'l') {
        // Align left edge
        layer.x = Math.round(curW / 2 - curW / 2) + curW / 2;
    } else if (key === 'r') {
        // Align right edge
        layer.x = Math.round(state.width - curW / 2 - curW / 2) + curW / 2;
    } else if (key === 't') {
        // Align top edge
        layer.y = Math.round(curH / 2 - curH / 2) + curH / 2;
    } else if (key === 'b') {
        // Align bottom edge
        layer.y = Math.round(state.height - curH / 2 - curH / 2) + curH / 2;
    } else if (key === 'm') {
        // Center both axes
        layer.x = Math.round(state.width / 2 - curW / 2) + curW / 2;
        layer.y = Math.round(state.height / 2 - curH / 2) + curH / 2;
    } else if (key === 'a') {
        // Clamp Y within canvas bounds
        const hh = curH / 2;
        layer.y = Math.max(hh, Math.min(state.height - hh, layer.y));
        layer.y = Math.round(layer.y - curH / 2) + curH / 2;
    }

    updateLayerPropertiesUI();
    render();
    saveState();
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') workspace.style.cursor = 'default';
});
