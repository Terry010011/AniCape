// ============================================================
// WHEEL / SCROLL - workspace zoom, layer scale, layer rotate
// ============================================================

let wheelSaveTimeout = null;
let tooltipHideTimeout = null;

function debouncedSaveState() {
    if (wheelSaveTimeout) clearTimeout(wheelSaveTimeout);
    wheelSaveTimeout = setTimeout(() => {
        saveState();
        wheelSaveTimeout = null;
    }, 500);
}

function debouncedHideTooltip() {
    if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
    tooltipHideTimeout = setTimeout(() => {
        updateDragTooltip(null);
    }, 1000);
}

workspace.addEventListener('wheel', (e) => {
    e.preventDefault();

    if (e.ctrlKey && state.activeLayerId) {
        // Ctrl + scroll: scale active layer
        const l = state.layers.find(x => x.id === state.activeLayerId);
        if (!l) return;
        const displayImg = getLayerDisplayImage(l);
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const sx = LayerTransform.getScaleX(l);
        const sy = LayerTransform.getScaleY(l);

        let newW = Math.max(1, Math.round(displayImg.width  * Math.abs(sx) * scaleFactor));
        let newH = Math.max(1, Math.round(displayImg.height * Math.abs(sy) * scaleFactor));

        l.scaleX = (newW / displayImg.width)  * (sx < 0 ? -1 : 1);
        l.scaleY = (newH / displayImg.height) * (sy < 0 ? -1 : 1);
        l.scale  = Math.max(Math.abs(l.scaleX), Math.abs(l.scaleY));

        snapLayerPosition(l, l.x, l.y, newW, newH);
        updateDragTooltip(`w: ${newW}px h: ${newH}px`);
        debouncedHideTooltip();
        
        updateUI();
        render();
        debouncedSaveState();

    } else if (e.shiftKey && state.activeLayerId) {
        // Shift + scroll: rotate active layer by 5°
        const l = state.layers.find(x => x.id === state.activeLayerId);
        l.rotation += e.deltaY > 0 ? 5 : -5;
        l.rotation = (l.rotation % 360 + 360) % 360;

        const displayImg = getLayerDisplayImage(l);
        snapLayerPosition(l, l.x, l.y, LayerTransform.getRenderedWidth(l, displayImg), LayerTransform.getRenderedHeight(l, displayImg));

        updateDragTooltip(`${Math.round(l.rotation)}°`);
        debouncedHideTooltip();
        
        updateUI();
        render();
        debouncedSaveState();

    } else {
        // Default: zoom workspace around cursor
        const delta    = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.01, Math.min(50, state.scale * delta));
        const rect     = workspace.getBoundingClientRect();
        const mouseX   = e.clientX - (rect.left + rect.width  / 2);
        const mouseY   = e.clientY - (rect.top  + rect.height / 2);

        state.offsetX = mouseX - (mouseX - state.offsetX) * (newScale / state.scale);
        state.offsetY = mouseY - (mouseY - state.offsetY) * (newScale / state.scale);
        state.scale   = newScale;

        document.getElementById('zoomSlider').value = state.scale * 100;
        updateZoomLabel();

        // Keep any active drag in sync after zoom
        if (isDragging === 'layer' || isDragging === 'handle' || isDragging === 'rot-handle') {
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: lastMouseX, clientY: lastMouseY }));
        }
    }
}, { passive: false });
