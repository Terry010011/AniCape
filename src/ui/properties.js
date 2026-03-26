// ============================================================
// UI - LAYER PROPERTIES PANEL
// ============================================================

/**
 * Updates all inputs and toggles in the active layer's property panel.
 */
function updateLayerPropertiesUI() {
    const container = document.getElementById('clipCheckboxes');
    if (!container) return;
    
    container.innerHTML = '';

    const layer = state.layers.find(l => l.id === state.activeLayerId);
    const autoClipCheck = document.getElementById('autoClipCheck');

    // Sync "Auto-clip All" checkbox
    const allSelected = layer && state.config.regions.length > 0 &&
        state.config.regions.every(r => layer.regions.includes(r.id));
        
    if (autoClipCheck) {
        autoClipCheck.checked = allSelected;
        autoClipCheck.disabled = !layer;
        if (layer) state.autoClip = allSelected;
    }

    // Render region checkboxes
    state.config.regions.forEach(r => {
        const wrapper = document.createElement('label');
        wrapper.className = 'checkbox-item';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = r.id;
        
        // Prevent event bubbling to avoid canvas interactions
        cb.addEventListener('mousedown', (e) => e.stopPropagation());
        cb.addEventListener('touchstart', (e) => e.stopPropagation());

        if (layer && layer.regions.includes(r.id)) {
            cb.checked = true;
        }

        cb.onchange = (e) => {
            if (state.activeLayerId) {
                const l = state.layers.find(x => x.id === state.activeLayerId);
                if (e.target.checked) {
                    if (!l.regions.includes(r.id)) l.regions.push(r.id);
                } else {
                    l.regions = l.regions.filter(id => id !== r.id);
                }

                // Update "All" checkbox status
                const isAllNow = state.config.regions.every(reg => l.regions.includes(reg.id));
                if (autoClipCheck) autoClipCheck.checked = isAllNow;
                state.autoClip = isAllNow;

                if (typeof render === 'function') render();
                if (typeof saveState === 'function') saveState();
            }
        };

        wrapper.appendChild(cb);
        wrapper.appendChild(document.createTextNode(r.name));
        container.appendChild(wrapper);
    });
    if (!layer) {
        container.querySelectorAll('input').forEach(c => c.disabled = true);
    }

    // --- Name ---
    const propLayerName = document.getElementById('propLayerName');

    if (propLayerName) {
        propLayerName.value = layer ? layer.name : '';
        propLayerName.disabled = !layer;
    }

    // --- Smoothing Quality ---
    const propSmoothing = document.getElementById('propSmoothing');
    if (propSmoothing) {
        propSmoothing.value    = layer ? (layer.smoothing || 'none') : 'none';
        propSmoothing.disabled = !layer;
    }

    // --- Animation frame controls ---
    syncAnimationControls(layer);

    // --- Opacity & Color ---
    const opacityRow = document.getElementById('propOpacityRow');
    if (opacityRow) opacityRow.classList.remove('hidden');

    const colorRow = document.getElementById('propColorRow');
    if (layer && layer.isSolid) {
        if (colorRow) {
            colorRow.classList.remove('hidden');
            document.getElementById('propSolidColor').value = layer.solidColor;
        }
    } else {
        if (colorRow) colorRow.classList.add('hidden');
    }
}

/**
 * Specifically handles animation-related property fields.
 */
function syncAnimationControls(layer) {
    const animControls = document.getElementById('animationFrameControls');
    const frameSizeInfo = document.getElementById('frameSizeInfo');
    const frameMultiplierInput = document.getElementById('frameMultiplierInput');
    if (!animControls) return;

    if (layer && layer.isAnimated && layer.animationData) {
        animControls.style.display = 'block';
        const totalFrames = layer.animationData.totalFrames;
        const multiplier = layer.animationData.frameMultiplier || 1;

        // Mod-dependent constraints
        if (state.targetMod === 'minecraftcapes') {
            frameMultiplierInput.step = "0.25";
            frameMultiplierInput.min = "0.25";
            frameMultiplierInput.max = Math.max(1, Math.floor(totalFrames / 4)).toString();
        } else {
            frameMultiplierInput.step = "1";
            frameMultiplierInput.min = "1";
            frameMultiplierInput.removeAttribute('max');
        }

        frameMultiplierInput.value = multiplier;

        // Wynntils FPS settings
        const targetFpsSlider = document.getElementById('targetFpsSlider');
        const targetFpsValue = document.getElementById('targetFpsValue');
        const targetFpsSetting = document.getElementById('targetFpsSetting');
        const targetFpsDesc = document.getElementById('targetFpsDesc');
        const wynntilsExtendedControls = document.getElementById('wynntilsExtendedControls');
        const minecraftcapesPlaybackInfo = document.getElementById('minecraftcapesPlaybackInfo');

        if (state.targetMod === 'minecraftcapes') {
            if (wynntilsExtendedControls) wynntilsExtendedControls.style.display = 'none';
            if (minecraftcapesPlaybackInfo) minecraftcapesPlaybackInfo.style.display = 'block';
        } else {
            if (wynntilsExtendedControls) wynntilsExtendedControls.style.display = 'block';
            if (minecraftcapesPlaybackInfo) minecraftcapesPlaybackInfo.style.display = 'none';

            const maxFps = Math.max(1, Math.floor(totalFrames / 2));

            if (maxFps <= 10) {
                if (targetFpsSetting) targetFpsSetting.style.display = 'flex';
                if (targetFpsSlider) targetFpsSlider.style.display = 'none';
                if (targetFpsValue) targetFpsValue.textContent = `~${maxFps} FPS`;
                if (targetFpsDesc) {
                    targetFpsDesc.setAttribute('data-i18n', 'target_fps_unsupported');
                    targetFpsDesc.innerHTML = getTranslation('target_fps_unsupported');
                }
            } else {
                if (targetFpsSetting) targetFpsSetting.style.display = 'flex';
                if (targetFpsSlider) {
                    targetFpsSlider.style.display = '';
                    targetFpsSlider.max = maxFps;
                    targetFpsSlider.min = 10;
                }
                if (targetFpsDesc) {
                    targetFpsDesc.setAttribute('data-i18n', 'target_fps_desc');
                    targetFpsDesc.innerHTML = getTranslation('target_fps_desc');
                }

                let currentFps = layer.animationData.targetFps;
                if (currentFps === undefined || currentFps > maxFps) {
                    currentFps = maxFps;
                } else if (currentFps < 10) {
                    currentFps = 10;
                }

                if (targetFpsSlider) targetFpsSlider.value = currentFps;
                if (targetFpsValue) {
                    if (currentFps >= maxFps) {
                        targetFpsValue.innerHTML = `<span data-i18n="fps_max">Max</span> (${maxFps})`;
                    } else {
                        targetFpsValue.textContent = `~${currentFps} FPS`;
                    }
                }
            }
        }

        const displayFrameCount = layer.animationData.displayFrames ? layer.animationData.displayFrames.length : Math.ceil(totalFrames * multiplier);
        if (frameSizeInfo) frameSizeInfo.textContent = `${state.width}×${state.height * displayFrameCount}px (${displayFrameCount} frames)`;
    } else {
        animControls.style.display = 'none';
    }
}
