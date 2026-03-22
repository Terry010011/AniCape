// ============================================================
// TOUCH STATE - variables shared across touch event handlers
// ============================================================

let isPinching = false;
let pinchMode = null;
let initialPinchDistance = 0;
let initialPinchAngle = 0;
let initialLayerScaleX = 1;
let initialLayerScaleY = 1;
let initialLayerRotation = 0;
let initialMidpointX = 0;
let initialMidpointY = 0;

// Workspace zoom/pan via two-finger pinch
let isWorkspacePinching = false;
let initialWorkspaceScale = 1;
let initialWorkspaceOffsetX = 0;
let initialWorkspaceOffsetY = 0;
let initialMidX = 0;
let initialMidY = 0;

// ============================================================
// TOUCH START
// ============================================================

workspace.addEventListener('touchstart', (e) => {
    if (e.target !== canvas && e.target !== workspace) return;
    e.preventDefault();

    const touches = e.touches;

    if (touches.length === 1) {
        const rect = canvas.getBoundingClientRect();
        const mx = (touches[0].clientX - rect.left) / (rect.width / state.width);
        const my = (touches[0].clientY - rect.top) / (rect.height / state.height);

        let hit = null;
        for (let i = state.layers.length - 1; i >= 0; i--) {
            const l = state.layers[i];
            if (!l.visible) continue;
            if (isPointInLayer(mx, my, l)) {
                if (!hit) hit = l;
                if (!state.autoSelectLayer && state.activeLayerId === l.id) {
                    hit = l;
                    break;
                }
                if (state.autoSelectLayer) break;
            }
        }

        if (hit) {
            if (state.autoSelectLayer || !state.activeLayerId) {
                setActiveLayer(hit.id);
                isDragging = 'layer';
            } else if (hit.id === state.activeLayerId) {
                isDragging = 'layer';
            } else {
                setActiveLayer(null);
            }
        } else {
            setActiveLayer(null);
        }

        if (isDragging === 'layer' && state.activeLayerId) {
            startX = touches[0].clientX;
            startY = touches[0].clientY;
            const l = state.layers.find(x => x.id === state.activeLayerId);
            initX = l.x;
            initY = l.y;
        }

    } else if (touches.length === 2) {
        const rect = workspace.getBoundingClientRect();
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;

        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        initialPinchAngle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Midpoint relative to workspace center
        initialMidX = midX - (rect.left + rect.width / 2);
        initialMidY = midY - (rect.top + rect.height / 2);

        // Decide whether the pinch targets the active layer or the workspace
        let hitLayer = false;
        if (state.activeLayerId) {
            const canvasRect = canvas.getBoundingClientRect();
            const canvasMx = (midX - canvasRect.left) / (canvasRect.width / state.width);
            const canvasMy = (midY - canvasRect.top) / (canvasRect.height / state.height);
            const layer = state.layers.find(l => l.id === state.activeLayerId);
            if (layer && isPointInLayer(canvasMx, canvasMy, layer)) hitLayer = true;
        }

        if (hitLayer) {
            isPinching = true;
            isWorkspacePinching = false;
            isDragging = false;
            pinchMode = null;

            const canvasRect = canvas.getBoundingClientRect();
            initialMidpointX = (midX - canvasRect.left) / (canvasRect.width / state.width);
            initialMidpointY = (midY - canvasRect.top) / (canvasRect.height / state.height);

            const layer = state.layers.find(l => l.id === state.activeLayerId);
            initX = layer.x;
            initY = layer.y;
            initialLayerScaleX = LayerTransform.getScaleX(layer);
            initialLayerScaleY = LayerTransform.getScaleY(layer);
            initialLayerRotation = layer.rotation;
        } else {
            isWorkspacePinching = true;
            isPinching = false;
            isDragging = false;
            initialWorkspaceScale = state.scale;
            initialWorkspaceOffsetX = state.offsetX;
            initialWorkspaceOffsetY = state.offsetY;
        }
    }
}, { passive: false });

// ============================================================
// TOUCH MOVE
// ============================================================

workspace.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touches = e.touches;

    if (isDragging === 'layer' && touches.length === 1) {
        const l = state.layers.find(x => x.id === state.activeLayerId);
        if (!l) return;
        const rect = canvas.getBoundingClientRect();
        const displayImg = getLayerDisplayImage(l);
        const sx = LayerTransform.getScaleX(l);
        const sy = LayerTransform.getScaleY(l);
        const curW = displayImg.width * Math.abs(sx);
        const curH = displayImg.height * Math.abs(sy);

        const dx = touches[0].clientX - startX;
        const dy = touches[0].clientY - startY;
        const targetX = initX + dx / (rect.width / state.width);
        const targetY = initY + dy / (rect.height / state.height);

        snapLayerPosition(l, targetX, targetY, curW, curH);
        render();

    } else if (isPinching && touches.length === 2) {
        const l = state.layers.find(x => x.id === state.activeLayerId);
        if (!l) return;
        const rect = canvas.getBoundingClientRect();

        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const currentPinchDistance = Math.sqrt(dx * dx + dy * dy);
        const currentPinchAngle = Math.atan2(dy, dx) * 180 / Math.PI;

        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        const currentMidPointX = (midX - rect.left) / (rect.width / state.width);
        const currentMidPointY = (midY - rect.top) / (rect.height / state.height);

        const scaleFactor = currentPinchDistance / initialPinchDistance;
        let angleDiff = currentPinchAngle - initialPinchAngle;
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;

        // Determine pinch mode after enough gesture input
        if (!pinchMode) {
            if (Math.abs(angleDiff) > 5) pinchMode = 'rotate';
            else if (Math.abs(scaleFactor - 1) > 0.08) pinchMode = 'scale';
        }

        const displayImg = getLayerDisplayImage(l);
        let currentW = LayerTransform.getRenderedWidth(l, displayImg);
        let currentH = LayerTransform.getRenderedHeight(l, displayImg);

        if (pinchMode === 'scale') {
            const initialW = displayImg.width * Math.abs(initialLayerScaleX);
            const initialH = displayImg.height * Math.abs(initialLayerScaleY);
            currentW = Math.max(1, Math.round(initialW * scaleFactor));
            currentH = Math.max(1, Math.round(initialH * scaleFactor));
            l.scaleX = (currentW / displayImg.width) * (initialLayerScaleX < 0 ? -1 : 1);
            l.scaleY = (currentH / displayImg.height) * (initialLayerScaleY < 0 ? -1 : 1);
            l.scale = Math.max(Math.abs(l.scaleX), Math.abs(l.scaleY));
        }

        if (pinchMode === 'rotate') {
            l.rotation = (Math.round(initialLayerRotation + angleDiff) % 360 + 360) % 360;
        }

        // Translate layer center with finger midpoint
        snapLayerPosition(l, initX + (currentMidPointX - initialMidpointX), initY + (currentMidPointY - initialMidpointY), currentW, currentH);

        if (pinchMode === 'scale') {
            updateDragTooltip(`w: ${currentW}px h: ${currentH}px`);
        } else if (pinchMode === 'rotate') {
            updateDragTooltip(`${Math.round(l.rotation)}°`);
        }

        updateUI();
        render();

    } else if (isWorkspacePinching && touches.length === 2) {
        const rect = workspace.getBoundingClientRect();
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const scaleFactor = Math.sqrt(dx * dx + dy * dy) / initialPinchDistance;

        const newScale = Math.max(0.01, Math.min(50, initialWorkspaceScale * scaleFactor));

        const screenMidX = (touches[0].clientX + touches[1].clientX) / 2;
        const screenMidY = (touches[0].clientY + touches[1].clientY) / 2;
        const midX = screenMidX - (rect.left + rect.width / 2);
        const midY = screenMidY - (rect.top + rect.height / 2);

        state.offsetX = midX - (initialMidX - initialWorkspaceOffsetX) * (newScale / initialWorkspaceScale);
        state.offsetY = midY - (initialMidY - initialWorkspaceOffsetY) * (newScale / initialWorkspaceScale);
        state.scale = newScale;

        document.getElementById('zoomSlider').value = state.scale * 100;
        updateZoomLabel();
    }
}, { passive: false });

// ============================================================
// TOUCH END
// ============================================================

workspace.addEventListener('touchend', (e) => {
    if (isDragging) {
        if (isDragging === 'layer') saveState();
        isDragging = false;
    }
    if (isPinching || isWorkspacePinching) {
        saveState();
        isPinching = false;
        isWorkspacePinching = false;
        pinchMode = null;
        initialPinchDistance = 0;
    }
    updateDragTooltip(null);
});
