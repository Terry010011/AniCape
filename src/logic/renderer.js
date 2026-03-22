// ============================================================
// CANVAS & TEMPLATE MANAGEMENT
// ============================================================

const canvas    = document.getElementById('mainCanvas');
const ctx       = canvas.getContext('2d');
const workspace = document.getElementById('workspace');

function resizeCanvas(w, h) {
    const oldW        = state.width  || w;
    const oldH        = state.height || h;
    const scaleFactorW = w / oldW;
    const scaleFactorH = h / oldH;

    state.width  = w; state.height = h;
    canvas.width = w; canvas.height = h;

    const gizmoLayer = document.getElementById('gizmoLayer');
    if (gizmoLayer) {
        gizmoLayer.style.width  = w + 'px';
        gizmoLayer.style.height = h + 'px';
    }

    state.layers.forEach(l => {
        l.x       *= scaleFactorW;
        l.y       *= scaleFactorH;
        const sx   = LayerTransform.getScaleX(l);
        const sy   = LayerTransform.getScaleY(l);
        l.scaleX   = sx * scaleFactorW;
        l.scaleY   = sy * scaleFactorH;
        l.scale    = Math.abs(l.scaleX) > Math.abs(l.scaleY) ? l.scaleX : l.scaleY;
    });
    fitToScreen();
}

function fitToScreen() {
    const ws = document.getElementById('workspace');
    if (!ws) return;
    const wsW = ws.clientWidth  * CONSTANTS.ZOOM_FIT_MARGIN;
    const wsH = ws.clientHeight * CONSTANTS.ZOOM_FIT_MARGIN;
    if (state.width > 0 && state.height > 0) {
        state.scale = Math.max(
            CONSTANTS.ZOOM_MIN,
            Math.min(CONSTANTS.ZOOM_MAX, Math.min(wsW / state.width, wsH / state.height))
        );
        state.offsetX = 0;
        state.offsetY = 0;
        const slider = document.getElementById('zoomSlider');
        if (slider) slider.value = Math.round(state.scale * 100);
        updateZoomLabel();
    }
}

function updateCanvasTransform() {
    const container  = document.getElementById('canvasContainer');
    const gizmoLayer = document.getElementById('gizmoLayer');
    if (!container) return;
    const transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
    container.style.transform = `${transform} scale(${state.scale})`;
    if (gizmoLayer) gizmoLayer.style.transform = transform;
    container.style.setProperty('--scale', state.scale);

    const gridLayer = document.getElementById('gridLayer');
    if (gridLayer) {
        gridLayer.style.display =
            (state.showGrid && state.scale >= 8) ? 'block' : 'none';
    }
    updateGizmoUI();
}

function updateZoomLabel() {
    const zoomVal = document.getElementById('zoomValue');
    if (zoomVal) zoomVal.innerText = Math.round(state.scale * 100) + '%';
    updateCanvasTransform();
}

function loadPresetTemplate(sizeStr) {
    const [w, h] = sizeStr.split('x').map(Number);
    const img     = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload  = () => processTemplate(img);
    img.onerror = () => generateFallbackTemplate(w, h);
    img.src = `assets/${sizeStr}.png`;
}

function generateFallbackTemplate(w, h) {
    const cv  = document.createElement('canvas');
    cv.width  = w; cv.height = h;
    const c   = cv.getContext('2d');
    c.fillStyle = 'black';
    c.fillRect(0, 0, w, h);
    state.config.regions.forEach((r, i) => {
        c.fillStyle = r.color;
        c.fillRect(10 + i * 10, 10, 8, 8);
    });
    const img    = new Image();
    img.onload   = () => processTemplate(img);
    img.src      = cv.toDataURL();
}

function generateMasksFromTemplate(img, toleranceArg) {
    if (!img) return;
    const tempCv    = document.createElement('canvas');
    tempCv.width    = img.width;
    tempCv.height   = img.height;
    const tCtx      = tempCv.getContext('2d');
    tCtx.drawImage(img, 0, 0);
    const data      = tCtx.getImageData(0, 0, img.width, img.height).data;

    const masks         = {};
    const maskContexts  = {};
    const regionColorMap = [];

    state.config.regions.forEach(r => {
        const c    = document.createElement('canvas');
        c.width    = img.width;
        c.height   = img.height;
        masks[r.id] = c;
        const mCtx  = c.getContext('2d');
        maskContexts[r.id] = { ctx: mCtx, imgData: mCtx.createImageData(img.width, img.height) };
        regionColorMap.push({ id: r.id, rgb: hexToRgb(r.color) });
    });

    const tol = toleranceArg !== undefined
        ? toleranceArg
        : (state.tolerance || CONSTANTS.MASK_TOLERANCE_DEFAULT);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < CONSTANTS.MASK_ALPHA_THRESHOLD) continue;
        let bestMatchId = null, minDist = Infinity;
        regionColorMap.forEach(rc => {
            const d = Math.sqrt((r - rc.rgb[0]) ** 2 + (g - rc.rgb[1]) ** 2 + (b - rc.rgb[2]) ** 2);
            if (d < minDist) { minDist = d; bestMatchId = rc.id; }
        });
        if (bestMatchId && minDist <= tol) {
            maskContexts[bestMatchId].imgData.data[i + 3] = 255;
        }
    }

    Object.keys(maskContexts).forEach(id =>
        maskContexts[id].ctx.putImageData(maskContexts[id].imgData, 0, 0));
    return masks;
}

function processTemplate(img) {
    state.templateImg = img;
    resizeCanvas(img.width, img.height);
    state.masks = generateMasksFromTemplate(img, state.tolerance);
    EventBus.emit('ui:refreshProperties');
    render();
    EventBus.emit('history:save');
}

// ============================================================
// RENDERING ENGINE
// ============================================================

function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, state.width, state.height);

    if (state.showTemplate && state.templateImg) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(state.templateImg, 0, 0);
        ctx.restore();
    }

    state.layers.forEach(layer => {
        if (!layer.visible) return;

        state.tempLayerCanvas.width  = state.width;
        state.tempLayerCanvas.height = state.height;
        const lCtx = state.tempLayerCanvas.getContext('2d');
        lCtx.clearRect(0, 0, state.width, state.height);
        lCtx.imageSmoothingEnabled = false;

        const displayImg = getLayerDisplayImage(layer);
        lCtx.save();
        LayerTransform.applyToContext(lCtx, layer);
        lCtx.drawImage(displayImg, -displayImg.width / 2, -displayImg.height / 2);
        lCtx.restore();

        if (layer.regions && layer.regions.length > 0) {
            state.tempMaskCanvas.width  = state.width;
            state.tempMaskCanvas.height = state.height;
            const maskCtx = state.tempMaskCanvas.getContext('2d');
            maskCtx.clearRect(0, 0, state.width, state.height);
            let hasMask = false;
            layer.regions.forEach(regionId => {
                if (state.masks[regionId]) {
                    maskCtx.drawImage(state.masks[regionId], 0, 0);
                    hasMask = true;
                }
            });
            if (hasMask) {
                lCtx.globalCompositeOperation = 'destination-in';
                lCtx.drawImage(state.tempMaskCanvas, 0, 0);
            }
        }

        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(state.tempLayerCanvas, 0, 0);
        ctx.restore();
    });

    updateGizmoUI();
}

function updateGizmoUI() {
    const gizmoLayer = document.getElementById('gizmoLayer');
    if (!gizmoLayer) return;
    gizmoLayer.innerHTML = '';
    if (!state.activeLayerId) return;

    const l = state.layers.find(x => x.id === state.activeLayerId);
    if (!l || !l.visible) return;

    const displayImg = getLayerDisplayImage(l);
    const sx = LayerTransform.getScaleX(l);
    const sy = LayerTransform.getScaleY(l);

    const canvasW = Math.round(displayImg.width  * Math.abs(sx));
    const canvasH = Math.round(displayImg.height * Math.abs(sy));
    const w       = canvasW * state.scale;
    const h       = canvasH * state.scale;
    const centerX = (l.x - state.width  / 2) * state.scale;
    const centerY = (l.y - state.height / 2) * state.scale;

    const box         = document.createElement('div');
    box.className     = 'gizmo-box';
    box.style.width   = w + 'px';
    box.style.height  = h + 'px';
    box.style.left    = (centerX - w / 2) + 'px';
    box.style.top     = (centerY - h / 2) + 'px';

    let rot = l.rotation;
    if ((sx < 0) !== (sy < 0)) rot = -rot;
    box.style.transform = `rotate(${rot}deg)`;

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach(pos => {
        const handle         = document.createElement('div');
        handle.className     = `gizmo-handle gizmo-handle-${pos}`;
        handle.dataset.pos   = pos;
        if (pos.includes('n')) handle.style.top  = '0';
        if (pos.includes('s')) handle.style.top  = '100%';
        if (pos.includes('e')) handle.style.left = '100%';
        if (pos.includes('w')) handle.style.left = '0';
        if (pos === 'n' || pos === 's') handle.style.left = '50%';
        if (pos === 'e' || pos === 'w') handle.style.top  = '50%';
        handle.style.transform = 'translate(-50%, -50%)';

        const angleMap = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 };
        let absoluteAngle = (angleMap[pos] + rot) % 360;
        if (absoluteAngle < 0) absoluteAngle += 360;
        const roundedAngle = Math.round(absoluteAngle / 45) * 45 % 360;
        if (roundedAngle === 0   || roundedAngle === 180) handle.style.cursor = 'ew-resize';
        else if (roundedAngle === 45  || roundedAngle === 225) handle.style.cursor = 'nwse-resize';
        else if (roundedAngle === 90  || roundedAngle === 270) handle.style.cursor = 'ns-resize';
        else if (roundedAngle === 135 || roundedAngle === 315) handle.style.cursor = 'nesw-resize';
        box.appendChild(handle);
    });

    ['nw', 'ne', 'se', 'sw'].forEach(pos => {
        const rh         = document.createElement('div');
        rh.className     = `gizmo-rot-handle gizmo-rot-handle-${pos}`;
        rh.dataset.pos   = pos;
        if (pos === 'nw') { rh.style.top = '-15px'; rh.style.left = '-15px'; }
        if (pos === 'ne') { rh.style.top = '-15px'; rh.style.left = 'calc(100% + 15px)'; }
        if (pos === 'se') { rh.style.top = 'calc(100% + 15px)'; rh.style.left = 'calc(100% + 15px)'; }
        if (pos === 'sw') { rh.style.top = 'calc(100% + 15px)'; rh.style.left = '-15px'; }
        rh.style.transform = 'translate(-50%, -50%)';
        const baseAngle = { se: 45, sw: 135, nw: 225, ne: 315 }[pos];
        const deg = (Math.round(((baseAngle + rot) % 360 + 360) % 360 / 45) * 45 + 45) % 360;
        const svg = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" transform="rotate(${deg})"><g stroke="black" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M6 7 A 7 7 0 0 1 17 18" fill="none" /><polygon points="4 7 8 4 8 9" fill="black" /><polygon points="19 18 15 21 15 16" fill="black" /></g><g stroke="white" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M6 7 A 7 7 0 0 1 17 18" fill="none" /><polygon points="4 7 8 4 8 9" fill="white" /><polygon points="19 18 15 21 15 16" fill="white" /></g></svg>`;
        rh.style.cursor = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 12 12, crosshair`;
        box.appendChild(rh);
    });

    gizmoLayer.appendChild(box);
}

function isPointInLayer(mx, my, layer) {
    const displayImg = getLayerDisplayImage(layer);
    return LayerTransform.containsPoint(layer, displayImg, mx, my);
}

// ── EventBus registration ─────────────────────────────────────
EventBus.on('render',                  render);
EventBus.on('canvas:resize',           (data) => resizeCanvas(data.w, data.h));
EventBus.on('canvas:fitToScreen',      fitToScreen);
EventBus.on('canvas:updateTransform',  updateCanvasTransform);
EventBus.on('masks:regenerate',        () => {
    state.masks = generateMasksFromTemplate(state.templateImg, state.tolerance);
});
