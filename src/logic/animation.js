// ============================================================
// ANIMATION MANAGEMENT
// ============================================================

function playLayerAnimation(layerId, animationData) {
    if (!animationData || !animationData.frames) return;
    state.animatingLayers.set(layerId, {
        animationData: animationData,
        currentFrame: 0,
        startTime: animationData.startTime || performance.now(),
        elapsedTime: 0
    });
    state.isAnimating = true;
}

function stopLayerAnimation(layerId) {
    state.animatingLayers.delete(layerId);
    if (state.animatingLayers.size === 0) state.isAnimating = false;
}

function stopAllAnimations() {
    state.animatingLayers.clear();
    state.isAnimating = false;
}

function updateAnimations(currentTime) {
    if (!state.isAnimating) return;
    state.animatingLayers.forEach((animState, layerId) => {
        const { animationData } = animState;
        const frames = animationData.displayFrames || animationData.frames;
        const totalFrames = frames.length;
        if (totalFrames === 0) return;

        if (state.targetMod === 'minecraftcapes') {
            const elapsed = currentTime - animState.startTime;
            animState.currentFrame = Math.floor(elapsed / CONSTANTS.FRAME_INTERVAL_MS) % totalFrames;
        } else {
            const DURATION = animationData.ANIMATION_DURATION || CONSTANTS.ANIMATION_DURATION_MS;
            const elapsed = (currentTime - animState.startTime) % DURATION;
            const progress = elapsed / DURATION;
            animState.currentFrame = Math.floor(progress * totalFrames) % totalFrames;
        }
    });
}

function resampleFramesAt100ms(rawFrames, rawDurations) {
    if (!rawFrames || rawFrames.length === 0) return rawFrames;
    if (!rawDurations || rawDurations.length === 0) return rawFrames;

    const clampedDurations = rawDurations.map(d =>
        (d < CONSTANTS.MIN_GIF_FRAME_MS) ? CONSTANTS.FRAME_INTERVAL_MS : d);
    const totalDuration = clampedDurations.reduce((a, b) => a + b, 0);

    const cumulativeTimes = [];
    let cumTime = 0;
    for (let i = 0; i < clampedDurations.length; i++) {
        cumulativeTimes.push(cumTime);
        cumTime += clampedDurations[i];
    }

    const sampleCount = Math.max(1,
        Math.round(totalDuration / CONSTANTS.FRAME_INTERVAL_MS));
    const sampledFrames = [];
    for (let s = 0; s < sampleCount; s++) {
        const sampleTime = s * CONSTANTS.FRAME_INTERVAL_MS;
        let frameIdx = 0;
        for (let i = cumulativeTimes.length - 1; i >= 0; i--) {
            if (sampleTime >= cumulativeTimes[i]) { frameIdx = i; break; }
        }
        sampledFrames.push(rawFrames[frameIdx]);
    }
    return sampledFrames;
}

function rebuildFramesForMod(layer) {
    if (!layer || !layer.isAnimated || !layer.animationData) return;
    const animData = layer.animationData;
    if (!animData.rawFrames) return;

    if (state.targetMod === 'minecraftcapes' && state.resampleForMC) {
        animData.frames = resampleFramesAt100ms(animData.rawFrames, animData.rawDurations);
    } else {
        animData.frames = animData.rawFrames;
    }
    animData.totalFrames = animData.frames.length;

    if (animData.targetFps === undefined) {
        animData.targetFps = Math.max(1, Math.floor(animData.rawFrames.length / 2));
    }

    updateAnimatedDisplayFrames(layer);
}

function updateAnimatedDisplayFrames(layer) {
    if (!layer || !layer.isAnimated || !layer.animationData) return;
    const animData = layer.animationData;
    const originalFrames = animData.frames;
    let generatedFrames = [];
    let singleLoopFrames = originalFrames.length;

    if (state.targetMod === 'minecraftcapes') {
        const multiplierFloat = parseFloat(animData.frameMultiplier) || 1;
        if (multiplierFloat < 1) {
            const duplicateCount = Math.round(1 / multiplierFloat);
            for (let i = 0; i < originalFrames.length; i++) {
                for (let d = 0; d < duplicateCount; d++) generatedFrames.push(originalFrames[i]);
            }
        } else {
            let skipFactor = Math.floor(multiplierFloat);
            const maxSkip = Math.max(1, Math.floor(originalFrames.length / 4));
            if (skipFactor > maxSkip) skipFactor = maxSkip;
            for (let i = 0; i < originalFrames.length; i += skipFactor) {
                generatedFrames.push(originalFrames[i]);
            }
        }
        singleLoopFrames = generatedFrames.length;
    } else {
        const mult = parseInt(animData.frameMultiplier) || 1;
        const maxFps = Math.max(1, Math.floor(originalFrames.length / 2));
        let targetFps = animData.targetFps;
        if (targetFps === undefined || targetFps > maxFps) targetFps = maxFps;

        let framesPerLoop = (targetFps >= maxFps)
            ? originalFrames.length
            : (targetFps * 2);
        let singleLoop = [];
        if (framesPerLoop >= originalFrames.length) {
            singleLoop = [...originalFrames];
        } else {
            for (let i = 0; i < framesPerLoop; i++) {
                const idx = Math.floor((i / framesPerLoop) * originalFrames.length);
                singleLoop.push(originalFrames[idx]);
            }
        }
        singleLoopFrames = singleLoop.length;
        for (let m = 0; m < mult; m++) generatedFrames.push(...singleLoop);
    }

    if (generatedFrames.length === 0) {
        generatedFrames.push(...originalFrames);
        singleLoopFrames = originalFrames.length;
    }

    animData.displayFrames = generatedFrames;
    animData.singleLoopFrames = singleLoopFrames;
}

function getLayerDisplayImage(layer) {
    if (layer.isSolid) {
        if (!layer.solidCanvas || layer.solidCanvasColor !== layer.solidColor) {
            const cv = document.createElement('canvas');
            cv.width = layer.solidWidth;
            cv.height = layer.solidHeight;
            const ctxx = cv.getContext('2d');
            ctxx.fillStyle = layer.solidColor;
            ctxx.fillRect(0, 0, cv.width, cv.height);
            layer.solidCanvas = cv;
            layer.solidCanvasColor = layer.solidColor;
        }
        return layer.solidCanvas;
    }

    if (layer.isAnimated && state.animatingLayers.has(layer.id)) {
        const animState = state.animatingLayers.get(layer.id);
        const frames = animState.animationData.displayFrames || animState.animationData.frames;
        if (!frames || frames.length === 0) return layer.img;
        return frames[animState.currentFrame % frames.length] || frames[0] || layer.img;
    }
    return layer.img;
}

function setupAnimationData(result, targetFps, frameMultiplier) {
    const rawFrames = result.frames;
    const rawDurations = result.durations;
    const workingFrames = (state.targetMod === 'minecraftcapes' && state.resampleForMC)
        ? resampleFramesAt100ms(rawFrames, rawDurations)
        : rawFrames;

    return {
        rawFrames, rawDurations, frames: workingFrames,
        originalDurations: rawDurations,
        totalFrames: workingFrames.length,
        currentFrame: 0,
        targetFps: targetFps || Math.max(1, Math.floor(workingFrames.length / 2)),
        frameMultiplier: frameMultiplier || 1,
        animationType: result.type || 'gif',
        startTime: performance.now(),
        ANIMATION_DURATION: CONSTANTS.ANIMATION_DURATION_MS
    };
}

async function handleAnimatedImage(file) {
    try {
        const result = await SimpleGifHandler.loadAnimatedImage(file);
        if (!result.isAnimated || result.frames.length === 1) {
            const img = new Image();
            img.onload = () => {
                const layer = createLayer(file.name, img, false, null);
                layer.originalFile = file;
                if (state.config.regions.length > 0) {
                    layer.regions = state.config.regions.map(r => r.id);
                }
                StateManager.pushLayer(layer);
                EventBus.emit('layer:setActive', layer.id);
            };
            img.src = URL.createObjectURL(file);
            return;
        }

        if (state.layers.some(l => l.isAnimated)) {
            EventBus.emit('ui:alert', { key: 'alert_only_one_gif' });
            return;
        }

        const animationData = setupAnimationData(result);

        const spriteImg = new Image();
        spriteImg.onload = () => {
            const layer = createLayer(file.name, spriteImg, true, animationData);
            layer.originalFile = file;
            updateAnimatedDisplayFrames(layer);
            if (state.config.regions.length > 0) {
                layer.regions = state.config.regions.map(r => r.id);
            }
            StateManager.pushLayer(layer);
            playLayerAnimation(layer.id, animationData);
            EventBus.emit('layer:setActive', layer.id);
        };
        spriteImg.src = URL.createObjectURL(file);

    } catch (err) {
        EventBus.emit('ui:alert', { key: 'alert_gif_error', msg: err.message });
    }
}

function startAnimationLoop() {
    function animationFrame(currentTime) {
        if (state.isAnimating) {
            updateAnimations(currentTime);
            EventBus.emit('render');
        }
        requestAnimationFrame(animationFrame);
    }
    requestAnimationFrame(animationFrame);
}

// ── EventBus registration ─────────────────────────────────────
EventBus.on('animation:play',          (data) => playLayerAnimation(data.id, data.data));
EventBus.on('animation:stop',          (id)   => stopLayerAnimation(id));
EventBus.on('animation:rebuildFrames', (layer) => updateAnimatedDisplayFrames(layer));
