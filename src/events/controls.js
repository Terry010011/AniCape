// ============================================================
// REPEAT BUTTON HELPER - hold-to-repeat for control buttons
// ============================================================

let repeatIntervalId = null;

function startRepeating(callback) {
    if (repeatIntervalId) return;
    callback();
    repeatIntervalId = setTimeout(() => {
        repeatIntervalId = setInterval(callback, CONSTANTS.REPEAT_INTERVAL_MS);
    }, CONSTANTS.REPEAT_DELAY_MS);
}

function stopRepeating() {
    clearTimeout(repeatIntervalId);
    clearInterval(repeatIntervalId);
    repeatIntervalId = null;
}

/**
 * Attach hold-to-repeat behaviour to a button.
 * @param {string} id - Element ID
 * @param {Function} callback - Action to repeat
 */
const setupRepeatBtn = (id, callback) => {
    const btn   = document.getElementById(id);
    const start = (e) => { e.preventDefault(); startRepeating(callback); };
    const stop  = () => stopRepeating();
    btn.addEventListener('mousedown',  start);
    btn.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('mouseup', stop);
    btn.addEventListener('mouseleave', stop);
    btn.addEventListener('touchend',   stop);
};

// ============================================================
// ZOOM CONTROLS
// ============================================================

document.getElementById('zoomSlider').addEventListener('input', (e) => {
    const newScale    = parseInt(e.target.value) / 100;
    state.offsetX     = state.offsetX * (newScale / state.scale);
    state.offsetY     = state.offsetY * (newScale / state.scale);
    state.scale       = newScale;
    updateZoomLabel();
});

setupRepeatBtn('moveUp',    () => { state.offsetY += CONSTANTS.MOVE_STEP_PX; updateCanvasTransform(); });
setupRepeatBtn('moveDown',  () => { state.offsetY -= CONSTANTS.MOVE_STEP_PX; updateCanvasTransform(); });
setupRepeatBtn('moveLeft',  () => { state.offsetX += CONSTANTS.MOVE_STEP_PX; updateCanvasTransform(); });
setupRepeatBtn('moveRight', () => { state.offsetX -= CONSTANTS.MOVE_STEP_PX; updateCanvasTransform(); });

setupRepeatBtn('zoomInBtn', () => {
    const newScale    = Math.min(CONSTANTS.ZOOM_MAX, state.scale * CONSTANTS.ZOOM_STEP_IN);
    state.offsetX     = state.offsetX * (newScale / state.scale);
    state.offsetY     = state.offsetY * (newScale / state.scale);
    state.scale       = newScale;
    document.getElementById('zoomSlider').value = state.scale * 100;
    updateZoomLabel();
});
setupRepeatBtn('zoomOutBtn', () => {
    const newScale    = Math.max(CONSTANTS.ZOOM_MIN, state.scale * CONSTANTS.ZOOM_STEP_OUT);
    state.offsetX     = state.offsetX * (newScale / state.scale);
    state.offsetY     = state.offsetY * (newScale / state.scale);
    state.scale       = newScale;
    document.getElementById('zoomSlider').value = state.scale * 100;
    updateZoomLabel();
});

document.getElementById('centerCanvasBtn').onclick = () => fitToScreen();
document.getElementById('undoBtn').onclick = undo;
document.getElementById('redoBtn').onclick = redo;

// ============================================================
// LAYER MANAGEMENT
// ============================================================

document.getElementById('addImageBtn').addEventListener('click', () => {
    document.getElementById('layerInput').click();
});
document.getElementById('layerInput').addEventListener('change', (e) => {
    if (e.target.files[0]) addLayer(e.target.files[0]);
});

document.getElementById('addSolidLayerBtn').addEventListener('click', () => {
    const layer          = createLayer(getTranslation('solid_layer'), new Image(), false, null);
    layer.isSolid        = true;
    layer.solidColor     = CONSTANTS.SOLID_LAYER_DEFAULT_COLOR;
    layer.solidWidth     = state.width  / 2;
    layer.solidHeight    = state.height / 2;
    if (state.config.regions.length > 0) {
        layer.regions = state.config.regions.map(r => r.id);
    }
    StateManager.pushLayer(layer);
    setActiveLayer(layer.id);
    EventBus.emit('history:save');
});

document.getElementById('duplicateLayerBtn').addEventListener('click', () => {
    if (state.activeLayerId) { duplicateLayer(state.activeLayerId); EventBus.emit('ui:update'); }
});

document.getElementById('deleteLayerBtn').addEventListener('click', deleteActiveLayer);

// ============================================================
// LAYER PROPERTY CONTROLS
// ============================================================

document.getElementById('propSolidColor').addEventListener('input', (e) => {
    const l = state.layers.find(x => x.id === state.activeLayerId);
    if (l?.isSolid) { l.solidColor = e.target.value; render(); debouncedSaveState(); }
});

document.getElementById('propLayerName').addEventListener('input', (e) => {
    const l = state.layers.find(x => x.id === state.activeLayerId);
    if (l) { l.name = e.target.value; updateLayerListUI(); }
});
document.getElementById('propLayerName').addEventListener('change', () =>
    EventBus.emit('history:save'));

// Opacity (slider + text input kept in sync)
document.getElementById('propOpacity').addEventListener('input', (e) => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    l.opacity = val;
    document.getElementById('propOpacityInput').value = l.opacity;
    render();
});
document.getElementById('propOpacity').addEventListener('change', () =>
    EventBus.emit('history:save'));

document.getElementById('propOpacityInput').addEventListener('input', (e) => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    l.opacity = val;
    document.getElementById('propOpacity').value = l.opacity;
    render();
});
document.getElementById('propOpacityInput').addEventListener('change', () =>
    EventBus.emit('history:save'));

// Scale Width / Height
document.getElementById('propWidth').addEventListener('input', (e) => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;

    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;

    const newScaleX = val / 100;
    const oldScaleX = LayerTransform.getScaleX(l);
    const oldScaleY = LayerTransform.getScaleY(l);

    if (l.scaleLocked !== false) {
        if (Math.abs(oldScaleX) > 0.0001) {
            l.scaleY *= Math.abs(newScaleX / oldScaleX);
        } else {
            l.scaleY = Math.abs(newScaleX) * (oldScaleY < 0 ? -1 : 1);
        }
        document.getElementById('propHeight').value = Math.round(Math.abs(l.scaleY) * 100);
    }

    l.scaleX = newScaleX;
    l.scale  = Math.max(Math.abs(l.scaleX), Math.abs(l.scaleY));

    const displayImg = getLayerDisplayImage(l);
    snapLayerPosition(l, l.x, l.y,
        LayerTransform.getRenderedWidth(l, displayImg),
        LayerTransform.getRenderedHeight(l, displayImg));
    render();
});
document.getElementById('propWidth').addEventListener('change', () =>
    EventBus.emit('history:save'));

document.getElementById('propHeight').addEventListener('input', (e) => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;

    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;

    const newScaleY = val / 100;
    const oldScaleX = LayerTransform.getScaleX(l);
    const oldScaleY = LayerTransform.getScaleY(l);

    if (l.scaleLocked !== false) {
        if (Math.abs(oldScaleY) > 0.0001) {
            l.scaleX *= Math.abs(newScaleY / oldScaleY);
        } else {
            l.scaleX = Math.abs(newScaleY) * (oldScaleX < 0 ? -1 : 1);
        }
        document.getElementById('propWidth').value = Math.round(Math.abs(l.scaleX) * 100);
    }

    l.scaleY = newScaleY;
    l.scale  = Math.max(Math.abs(l.scaleX), Math.abs(l.scaleY));

    const displayImg = getLayerDisplayImage(l);
    snapLayerPosition(l, l.x, l.y,
        LayerTransform.getRenderedWidth(l, displayImg),
        LayerTransform.getRenderedHeight(l, displayImg));
    render();
});
document.getElementById('propHeight').addEventListener('change', () =>
    EventBus.emit('history:save'));

document.getElementById('propScaleLock').addEventListener('click', () => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;
    l.scaleLocked = l.scaleLocked === false;
    EventBus.emit('ui:update');
});

// Rotation
document.getElementById('propRot').addEventListener('input', (e) => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;
    let val = Math.round(parseFloat(e.target.value));
    if (isNaN(val)) val = Math.round(l.rotation);
    l.rotation = (val % 360 + 360) % 360;

    const displayImg = getLayerDisplayImage(l);
    snapLayerPosition(l, l.x, l.y,
        LayerTransform.getRenderedWidth(l, displayImg),
        LayerTransform.getRenderedHeight(l, displayImg));
    render();
});
document.getElementById('propRot').addEventListener('change', (e) => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (l) e.target.value = Math.round(l.rotation);
    EventBus.emit('history:save');
});

// Flip
document.getElementById('btnFlipX').addEventListener('click', () => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;
    l.scaleX = LayerTransform.getScaleX(l) * -1;
    EventBus.emit('ui:update'); render(); EventBus.emit('history:save');
});
document.getElementById('btnFlipY').addEventListener('click', () => {
    const l = state.layers.find(i => i.id === state.activeLayerId);
    if (!l) return;
    l.scaleY = LayerTransform.getScaleY(l) * -1;
    EventBus.emit('ui:update'); render(); EventBus.emit('history:save');
});

// ============================================================
// ANIMATION CONTROLS
// ============================================================

/** Clamp & snap frameMultiplier value according to the active mod rules. */
function clampFrameMultiplier(layer, rawValue) {
    let multiplier = parseFloat(rawValue);
    if (isNaN(multiplier)) multiplier = layer.animationData.frameMultiplier || 1;

    let maxLimit = CONSTANTS.FRAME_MULTIPLIER_MAX;
    if (state.targetMod === 'minecraftcapes') {
        maxLimit = Math.max(1, Math.floor(
            layer.animationData.totalFrames / CONSTANTS.FRAME_MULTIPLIER_MC_MAX_DIVISOR));
        const old = layer.animationData.frameMultiplier || 1;
        if      (multiplier === 0.75)                         multiplier = old >= 1 ? 0.5 : 1;
        else if (multiplier > 1 && multiplier % 1 !== 0)     multiplier = multiplier > old ? Math.ceil(multiplier)  : Math.floor(multiplier);
        else if (multiplier < 0.25)                          multiplier = 0.25;
        else if (multiplier > 0.25 && multiplier < 0.5)      multiplier = multiplier > old ? 0.5  : 0.25;
        else if (multiplier > 0.5  && multiplier < 1)        multiplier = multiplier > old ? 1    : 0.5;
    }

    const minVal = state.targetMod === 'minecraftcapes'
        ? CONSTANTS.FRAME_MULTIPLIER_MIN_MC
        : CONSTANTS.FRAME_MULTIPLIER_MIN_WY;
    return Math.min(Math.max(multiplier, minVal), maxLimit);
}

/** Apply frameMultiplier to all animated layers (global sync). */
function applyFrameMultiplierGlobal(sourceLayer, newMultiplier) {
    state.layers.forEach(l => {
        if (!l.isAnimated || !l.animationData) return;
        l.animationData.frameMultiplier = newMultiplier;
        updateAnimatedDisplayFrames(l);

        const mainAnim  = state.animatingLayers.get(sourceLayer.id);
        const otherAnim = state.animatingLayers.get(l.id);
        if (mainAnim && otherAnim) otherAnim.startTime = mainAnim.startTime;
    });
}

document.getElementById('frameMultiplierInput').addEventListener('change', (e) => {
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (!layer?.isAnimated || !layer.animationData) return;

    const newMultiplier = clampFrameMultiplier(layer, e.target.value);
    e.target.value = newMultiplier;
    layer.animationData.frameMultiplier = newMultiplier;
    updateAnimatedDisplayFrames(layer);
    applyFrameMultiplierGlobal(layer, newMultiplier);

    updateLayerPropertiesUI();
    render();
    EventBus.emit('history:save');
});

document.getElementById('frameMultiplierInput').addEventListener('input', (e) => {
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (!layer?.isAnimated || !layer.animationData) return;

    const rawValue = parseFloat(e.target.value);
    if (isNaN(rawValue)) return;

    const newMultiplier = clampFrameMultiplier(layer, rawValue);
    if (newMultiplier !== rawValue) e.target.value = newMultiplier;

    layer.animationData.frameMultiplier = newMultiplier;
    updateAnimatedDisplayFrames(layer);

    state.layers.forEach(l => {
        if (!l.isAnimated || !l.animationData) return;
        l.animationData.frameMultiplier = newMultiplier;
        updateAnimatedDisplayFrames(l);
    });

    const displayFrameCount = layer.animationData.displayFrames
        ? layer.animationData.displayFrames.length
        : Math.ceil(layer.animationData.totalFrames * rawValue);
    document.getElementById('frameSizeInfo').textContent =
        `${state.width}×${state.height * displayFrameCount}px (${displayFrameCount} frames)`;
});

document.getElementById('targetFpsSlider').addEventListener('input', (e) => {
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (!layer?.isAnimated || !layer.animationData) return;

    const maxFps = Math.max(CONSTANTS.ANIMATION_MIN_FPS,
        Math.floor(layer.animationData.totalFrames / 2));
    let targetFps = parseInt(e.target.value, 10);
    if (isNaN(targetFps) || targetFps < CONSTANTS.ANIMATION_MIN_FPS) {
        targetFps = CONSTANTS.ANIMATION_MIN_FPS;
    }
    if (targetFps > maxFps) targetFps = maxFps;

    if (targetFps >= maxFps) {
        document.getElementById('targetFpsValue').innerHTML =
            `<span data-i18n="fps_max">Max</span> (${maxFps})`;
    } else {
        document.getElementById('targetFpsValue').textContent = `~${targetFps} FPS`;
    }

    state.layers.forEach(l => {
        if (!l.isAnimated || !l.animationData) return;
        l.animationData.targetFps = targetFps;
        updateAnimatedDisplayFrames(l);

        const mainAnim  = state.animatingLayers.get(layer.id);
        const otherAnim = state.animatingLayers.get(l.id);
        if (mainAnim && otherAnim) otherAnim.startTime = mainAnim.startTime;
    });

    updateAnimatedDisplayFrames(layer);

    const displayFrameCount = layer.animationData.displayFrames
        ? layer.animationData.displayFrames.length
        : Math.ceil(layer.animationData.totalFrames *
            (parseFloat(layer.animationData.frameMultiplier) || 1));
    document.getElementById('frameSizeInfo').textContent =
        `${state.width}×${state.height * displayFrameCount}px (${displayFrameCount} frames)`;

    render();
    EventBus.emit('history:save');
});

// ============================================================
// WORKSPACE / CANVAS SETTINGS
// ============================================================

document.getElementById('autoClipCheck').addEventListener('change', (e) => {
    state.autoClip = e.target.checked;
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (layer && state.config.regions.length > 0) {
        if (state.autoClip) {
            state.config.regions.forEach(r => {
                if (!layer.regions.includes(r.id)) layer.regions.push(r.id);
            });
        } else {
            layer.regions = [];
        }
        updateLayerPropertiesUI();
        render();
    }
});

document.getElementById('autoSelectLayerCheck').addEventListener('change', (e) => {
    state.autoSelectLayer = e.target.checked;
});

document.getElementById('reprocessBtn').addEventListener('click', () => {
    if (state.templateImg) processTemplate(state.templateImg);
});

document.getElementById('showTemplateCheck').addEventListener('change', (e) => {
    state.showTemplate = e.target.checked;
    render();
});

document.getElementById('showGridCheck').addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    updateCanvasTransform();
});

document.getElementById('dlTemplateBtn').addEventListener('click', () => {
    if (!state.templateImg) return;
    const link      = document.createElement('a');
    link.download   = 'template.png';
    link.href       = state.templateImg.src;
    link.click();
});

document.getElementById('sizeSelect').addEventListener('change', (e) => {
    if (e.target.value === 'custom') document.getElementById('templateInput').click();
    else loadPresetTemplate(e.target.value);
});

document.getElementById('templateInput').addEventListener('change', (e) => {
    if (!e.target.files[0]) return;
    const img    = new Image();
    img.onload   = () => processTemplate(img);
    img.src      = URL.createObjectURL(e.target.files[0]);
});

document.getElementById('targetModSelect').addEventListener('change', (e) => {
    StateManager.setTargetMod(e.target.value);

    const resampleWrapper = document.getElementById('resampleToggleWrapper');
    if (resampleWrapper) {
        resampleWrapper.style.display =
            state.targetMod === 'minecraftcapes' ? 'block' : 'none';
    }

    state.layers.forEach(l => {
        if (l.isAnimated && l.animationData) rebuildFramesForMod(l);
    });
    updateLayerPropertiesUI();
    render();
    EventBus.emit('history:save');
});

document.getElementById('resampleCheck').addEventListener('change', (e) => {
    state.resampleForMC = e.target.checked;
    state.layers.forEach(l => {
        if (l.isAnimated && l.animationData) rebuildFramesForMod(l);
    });
    updateLayerPropertiesUI();
    render();
    EventBus.emit('history:save');
});

// ============================================================
// CONFIG MANAGEMENT
// ============================================================

document.getElementById('addColorBtn').addEventListener('click', () => {
    const id = 'custom_' + Date.now();
    state.config.regions.push({ id, name: getTranslation('new_region'), color: '#ffffff' });
    renderColorList();
    saveUserConfig();
});

document.getElementById('exportConfigBtn').addEventListener('click', () => exportConfig());
document.getElementById('importConfigBtn').addEventListener('click', () =>
    document.getElementById('configInput').click());
document.getElementById('configInput').addEventListener('change', (e) => {
    if (e.target.files[0]) { importConfig(e.target.files[0]); e.target.value = ''; }
});
document.getElementById('resetConfigBtn').addEventListener('click', () => resetToDefault());

// ============================================================
// EXPORT / PROJECT
// ============================================================

document.getElementById('exportBtn').addEventListener('click', () => showExportDialog());

document.getElementById('faqBtn').addEventListener('click', () => {
    document.getElementById('faqModal').style.display = 'flex';
});
document.getElementById('aboutBtn').addEventListener('click', () => {
    document.getElementById('aboutModal').style.display = 'flex';
});

document.getElementById('modals-root').addEventListener('click', (e) => {
    const target = e.target;
    const id     = target.closest('[id]')?.id;

    if (id === 'exportCloseBtn' || id === 'exportCancelBtn') {
        document.getElementById('exportModal').style.display = 'none';
    } else if (id === 'faqCloseBtn' || id === 'faqDoneBtn') {
        document.getElementById('faqModal').style.display = 'none';
    } else if (id === 'aboutCloseBtn' || id === 'aboutDoneBtn') {
        document.getElementById('aboutModal').style.display = 'none';
    }

    if (target.classList.contains('modal-overlay')) {
        target.style.display = 'none';
    }

    // FAQ accordion
    const question = target.closest('.faq-question');
    if (question) {
        const item     = question.parentElement;
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
    }
});

// ============================================================
// UI PREFERENCES
// ============================================================

document.getElementById('advToggle').addEventListener('click', () => {
    document.getElementById('advContent').classList.toggle('show');
});

document.getElementById('langToggle').addEventListener('click', () => {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('cape_editor_lang', currentLang);
    updateI18n();
});

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cape_editor_theme', next);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', next === 'dark' ? '#252529' : '#ffffff');
    }
});

document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

['click', 'touchstart'].forEach(evt => {
    document.getElementById('workspace').addEventListener(evt, () => {
        document.getElementById('sidebar').classList.remove('open');
    }, { capture: true });
});

// ============================================================
// MISC
// ============================================================

document.getElementById('shortcutsHint').style.display = 'block';
