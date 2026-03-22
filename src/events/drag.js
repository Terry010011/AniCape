// ============================================================
// DRAG STATE - variables shared across mouse event handlers
// ============================================================

let isDragging = false;
let startX, startY, initX, initY;
let initScaleX, initScaleY, initW, initH, initRot, dragHandle;
let startCanvasX, startCanvasY;
let lastMouseX = 0, lastMouseY = 0;

// ============================================================
// TOOLTIP
// ============================================================

function updateDragTooltip(text) {
    const tooltip = document.getElementById('dragTooltip');
    if (!tooltip) return;
    if (text === null) {
        tooltip.classList.remove('show');
    } else {
        tooltip.innerText = text;
        tooltip.classList.add('show');
    }
}

// ============================================================
// SNAPPING - pixel-perfect layer position alignment
// ============================================================

function snapLayerPosition(layer, targetX, targetY, w, h) {
    const absoluteRot = (layer.rotation % 360 + 360) % 360;
    if (absoluteRot === 90 || absoluteRot === 270) {
        layer.x = Math.round(targetX - h / 2) + h / 2;
        layer.y = Math.round(targetY - w / 2) + w / 2;
    } else if (absoluteRot === 0 || absoluteRot === 180) {
        layer.x = Math.round(targetX - w / 2) + w / 2;
        layer.y = Math.round(targetY - h / 2) + h / 2;
    } else {
        layer.x = targetX;
        layer.y = targetY;
    }
}

// ============================================================
// MOUSE DOWN - handle gizmo, pan, and layer selection
// ============================================================

workspace.addEventListener('mousedown', (e) => {
    // Gizmo handle (scale / rotate)
    if (e.target.classList.contains('gizmo-handle') ||
        e.target.classList.contains('gizmo-rot-handle')) {
        isDragging  = e.target.classList.contains('gizmo-handle') ? 'handle' : 'rot-handle';
        dragHandle  = e.target.dataset.pos;
        startX      = e.clientX;
        startY      = e.clientY;

        const l = state.layers.find(x => x.id === state.activeLayerId);
        if (l) {
            initX      = l.x;
            initY      = l.y;
            initScaleX = LayerTransform.getScaleX(l);
            initScaleY = LayerTransform.getScaleY(l);
            const displayImg = getLayerDisplayImage(l);
            initW      = LayerTransform.getRenderedWidth(l, displayImg);
            initH      = LayerTransform.getRenderedHeight(l, displayImg);
            initRot    = l.rotation;

            const rect      = canvas.getBoundingClientRect();
            startCanvasX    = (e.clientX - rect.left) / (rect.width  / state.width);
            startCanvasY    = (e.clientY - rect.top)  / (rect.height / state.height);

            if (isDragging === 'rot-handle') {
                initialPinchAngle = Math.atan2(
                    startCanvasY - l.y, startCanvasX - l.x) * 180 / Math.PI;
            }
        }
        e.stopPropagation();
        return;
    }

    if (e.target !== canvas && e.target !== workspace) return;

    if (e.button === 1 || (e.button === 0 && e.code === 'Space')) {
        isDragging             = 'pan';
        workspace.style.cursor = 'grabbing';
    } else if (e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const mx   = (e.clientX - rect.left) / (rect.width  / state.width);
        const my   = (e.clientY - rect.top)  / (rect.height / state.height);

        let hit = null;
        for (let i = state.layers.length - 1; i >= 0; i--) {
            const l = state.layers[i];
            if (!l.visible) continue;
            if (isPointInLayer(mx, my, l)) {
                if (!hit) hit = l;
                if (!state.autoSelectLayer && state.activeLayerId === l.id) {
                    hit = l; break;
                }
                if (state.autoSelectLayer) break;
            }
        }

        if (hit) {
            if (state.autoSelectLayer || !state.activeLayerId) {
                setActiveLayer(hit.id);
                isDragging = 'layer';
            } else {
                if (hit.id === state.activeLayerId) {
                    isDragging = 'layer';
                } else {
                    setActiveLayer(null);
                }
            }
        } else {
            setActiveLayer(null);
        }
    }

    if (isDragging) {
        startX = e.clientX;
        startY = e.clientY;
        const rect   = canvas.getBoundingClientRect();
        startCanvasX = (e.clientX - rect.left) / (rect.width  / state.width);
        startCanvasY = (e.clientY - rect.top)  / (rect.height / state.height);
        if (isDragging === 'pan') {
            initX = state.offsetX;
            initY = state.offsetY;
        } else if (isDragging === 'layer' && state.activeLayerId) {
            const l = state.layers.find(x => x.id === state.activeLayerId);
            initX = l.x;
            initY = l.y;
        }
    }
});

// ============================================================
// MOUSE MOVE - pan, rotate, drag layer, resize handle
// ============================================================

window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (isDragging === 'pan') {
        state.offsetX = initX + dx;
        state.offsetY = initY + dy;
        updateCanvasTransform();

    } else if (isDragging === 'rot-handle') {
        const l = state.layers.find(x => x.id === state.activeLayerId);
        if (!l) return;

        const rect       = canvas.getBoundingClientRect();
        const curCanvasX = (e.clientX - rect.left) / (rect.width  / state.width);
        const curCanvasY = (e.clientY - rect.top)  / (rect.height / state.height);

        const currentAngle = Math.atan2(curCanvasY - initY, curCanvasX - initX) * 180 / Math.PI;
        const angleDiff    = currentAngle - initialPinchAngle;

        l.rotation = Math.round(initRot + angleDiff);
        if (e.shiftKey) l.rotation = Math.round(l.rotation / 45) * 45;
        l.rotation = (l.rotation % 360 + 360) % 360;

        const displayImg = getLayerDisplayImage(l);
        const curW = LayerTransform.getRenderedWidth(l, displayImg);
        const curH = LayerTransform.getRenderedHeight(l, displayImg);
        snapLayerPosition(l, initX, initY, curW, curH);

        updateDragTooltip(`${Math.round(l.rotation)}°`);

        if (!document.getElementById('layerProperties').classList.contains('hidden')) {
            document.getElementById('propRot').value = Math.round(l.rotation);
        }
        render();

    } else if (isDragging === 'layer') {
        const l          = state.layers.find(x => x.id === state.activeLayerId);
        const rect       = canvas.getBoundingClientRect();
        const displayImg = getLayerDisplayImage(l);
        const curW       = LayerTransform.getRenderedWidth(l, displayImg);
        const curH       = LayerTransform.getRenderedHeight(l, displayImg);

        const curCanvasX = (e.clientX - rect.left) / (rect.width  / state.width);
        const curCanvasY = (e.clientY - rect.top)  / (rect.height / state.height);
        const targetX    = initX + (curCanvasX - startCanvasX);
        const targetY    = initY + (curCanvasY - startCanvasY);

        snapLayerPosition(l, targetX, targetY, curW, curH);
        render();

    } else if (isDragging === 'handle') {
        const l = state.layers.find(x => x.id === state.activeLayerId);
        if (!l) return;
        const displayImg = getLayerDisplayImage(l);

        const rect       = canvas.getBoundingClientRect();
        const curCanvasX = (e.clientX - rect.left) / (rect.width  / state.width);
        const curCanvasY = (e.clientY - rect.top)  / (rect.height / state.height);
        const canvasDx   = curCanvasX - startCanvasX;
        const canvasDy   = curCanvasY - startCanvasY;

        // Rotate delta into local layer space
        const angle = -initRot * Math.PI / 180;
        const ldx   = canvasDx * Math.cos(angle) - canvasDy * Math.sin(angle);
        const ldy   = canvasDx * Math.sin(angle) + canvasDy * Math.cos(angle);

        let dw = 0, dh = 0;
        let offsetX = 0, offsetY = 0;

        if (dragHandle.includes('e')) { dw =  ldx; offsetX =  ldx / 2; }
        if (dragHandle.includes('w')) { dw = -ldx; offsetX =  ldx / 2; }
        if (dragHandle.includes('s')) { dh =  ldy; offsetY =  ldy / 2; }
        if (dragHandle.includes('n')) { dh = -ldy; offsetY =  ldy / 2; }

        // Corner handles: proportional scaling
        if (['nw', 'ne', 'sw', 'se'].includes(dragHandle)) {
            let ratio = 1;
            if (dragHandle === 'se') {
                ratio = Math.max((initW + ldx) / initW, (initH + ldy) / initH);
                if (initW + ldx < 0 && initH + ldy < 0)
                    ratio = Math.min((initW + ldx) / initW, (initH + ldy) / initH);
            } else if (dragHandle === 'nw') {
                ratio = Math.max((initW - ldx) / initW, (initH - ldy) / initH);
                if (initW - ldx < 0 && initH - ldy < 0)
                    ratio = Math.min((initW - ldx) / initW, (initH - ldy) / initH);
            } else if (dragHandle === 'ne') {
                ratio = Math.max((initW + ldx) / initW, (initH - ldy) / initH);
                if (initW + ldx < 0 && initH - ldy < 0)
                    ratio = Math.min((initW + ldx) / initW, (initH - ldy) / initH);
            } else if (dragHandle === 'sw') {
                ratio = Math.max((initW - ldx) / initW, (initH + ldy) / initH);
                if (initW - ldx < 0 && initH + ldy < 0)
                    ratio = Math.min((initW - ldx) / initW, (initH + ldy) / initH);
            }
            dw = initW * ratio - initW;
            dh = initH * ratio - initH;
            if (dragHandle === 'se') { offsetX =  dw / 2; offsetY =  dh / 2; }
            if (dragHandle === 'nw') { offsetX = -dw / 2; offsetY = -dh / 2; }
            if (dragHandle === 'ne') { offsetX =  dw / 2; offsetY = -dh / 2; }
            if (dragHandle === 'sw') { offsetX = -dw / 2; offsetY =  dh / 2; }
        }

        let newW = Math.round(initW + dw);
        let newH = Math.round(initH + dh);
        if (Math.abs(newW) < CONSTANTS.LAYER_MIN_PIXELS) newW = CONSTANTS.LAYER_MIN_PIXELS;
        if (Math.abs(newH) < CONSTANTS.LAYER_MIN_PIXELS) newH = CONSTANTS.LAYER_MIN_PIXELS;

        // Convert local offset back to global space
        const rotAngle      = initRot * Math.PI / 180;
        const globalOffsetX = offsetX * Math.cos(rotAngle) - offsetY * Math.sin(rotAngle);
        const globalOffsetY = offsetX * Math.sin(rotAngle) + offsetY * Math.cos(rotAngle);

        snapLayerPosition(l, initX + globalOffsetX, initY + globalOffsetY, newW, newH);

        const signX = initScaleX < 0 ? -1 : 1;
        const signY = initScaleY < 0 ? -1 : 1;
        l.scaleX    = (newW / displayImg.width)  * signX;
        l.scaleY    = (newH / displayImg.height) * signY;
        l.scale     = Math.max(Math.abs(l.scaleX), Math.abs(l.scaleY));

        updateDragTooltip(`w: ${newW}px h: ${newH}px`);

        if (!document.getElementById('layerProperties').classList.contains('hidden')) {
            const pw = document.getElementById('propWidth');
            const ph = document.getElementById('propHeight');
            if (pw) pw.value = Math.round(Math.abs(l.scaleX) * 100);
            if (ph) ph.value = Math.round(Math.abs(l.scaleY) * 100);
        }
        render();
    }
});

// ============================================================
// MOUSE UP
// ============================================================

window.addEventListener('mouseup', () => {
    if (isDragging === 'layer' || isDragging === 'handle' || isDragging === 'rot-handle') {
        EventBus.emit('history:save');
        EventBus.emit('ui:update');
    }
    isDragging             = false;
    updateDragTooltip(null);
    workspace.style.cursor = 'default';
});
