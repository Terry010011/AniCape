// ============================================================
// HISTORY MANAGEMENT (Undo / Redo)
// ============================================================

/**
 * Capture current state and push to history stack.
 */
function saveState() {
    const snapshot = {
        layers: state.layers.map(l => ({
            ...l,
            regions: [...(l.regions || [])]
        })),
        activeLayerId: state.activeLayerId,
        canvasWidth: state.width,
        canvasHeight: state.height,
        sizeStr: `${state.width}x${state.height}`,
        templateImg: state.templateImg,
        tolerance: state.tolerance,
        targetMod: state.targetMod,
        resampleForMC: state.resampleForMC
    };

    state.historyStack.push(snapshot);

    if (state.historyStack.length > CONSTANTS.HISTORY_LIMIT) {
        state.historyStack.shift();
    }

    state.redoStack = [];
}

function undo() {
    if (state.historyStack.length <= 1) return;

    const current = state.historyStack.pop();
    state.redoStack.push(current);

    const prev = state.historyStack[state.historyStack.length - 1];
    applySnapshot(prev);
}

function redo() {
    if (state.redoStack.length === 0) return;

    const next = state.redoStack.pop();
    state.historyStack.push(next);
    applySnapshot(next);
}

/**
 * Applies a saved snapshot back to the application state.
 */
function applySnapshot(snapshot) {
    if (!snapshot) return;

    let templateChanged = false;
    let sizeChanged = false;

    // 1. Sync base configs
    StateManager.setTolerance(snapshot.tolerance !== undefined ? snapshot.tolerance : state.tolerance);
    StateManager.setTargetMod(snapshot.targetMod || state.targetMod);
    state.resampleForMC = snapshot.resampleForMC !== undefined
        ? snapshot.resampleForMC
        : state.resampleForMC;

    // 2. Sync canvas size — renderer.js handles 'canvas:resize'
    if (snapshot.canvasWidth && snapshot.canvasHeight &&
        (snapshot.canvasWidth !== state.width || snapshot.canvasHeight !== state.height)) {
        sizeChanged = true;
        EventBus.emit('canvas:resize', { w: snapshot.canvasWidth, h: snapshot.canvasHeight });
    }

    // 3. Sync template & masks
    if (snapshot.templateImg !== state.templateImg) {
        state.templateImg = snapshot.templateImg;
        templateChanged = true;
    }

    if (templateChanged || state.tolerance !== snapshot.tolerance) {
        EventBus.emit('masks:regenerate');
    }

    // 4. Sync layers
    StateManager.setLayers(snapshot.layers.map(l => ({
        ...l,
        regions: [...(l.regions || [])]
    })));

    // Rebuild animation state for animated layers
    state.layers.forEach(l => {
        if (l.isAnimated && l.animationData) {
            EventBus.emit('animation:rebuildFrames', l);
            if (!state.animatingLayers.has(l.id)) {
                EventBus.emit('animation:play', { id: l.id, data: l.animationData });
            }
        }
    });

    // Stop animations for layers that no longer exist
    state.animatingLayers.forEach((_, layerId) => {
        if (!state.layers.find(l => l.id === layerId)) {
            EventBus.emit('animation:stop', layerId);
        }
    });

    state.activeLayerId = snapshot.activeLayerId;

    // 5. Global refresh
    refreshAllUI(sizeChanged);
}

/**
 * Refresh everything after a major state change (Undo / Redo).
 */
function refreshAllUI(sizeChanged = false) {
    const targetModSelect = document.getElementById('targetModSelect');
    if (targetModSelect) targetModSelect.value = state.targetMod;

    const toleranceInput = document.getElementById('toleranceInput');
    if (toleranceInput) toleranceInput.value = state.tolerance;

    const resampleCheck = document.getElementById('resampleCheck');
    if (resampleCheck) resampleCheck.checked = state.resampleForMC;

    const resampleWrapper = document.getElementById('resampleToggleWrapper');
    if (resampleWrapper) {
        resampleWrapper.style.display =
            (state.targetMod === 'minecraftcapes') ? 'block' : 'none';
    }

    if (sizeChanged) {
        EventBus.emit('canvas:fitToScreen');
    } else {
        EventBus.emit('canvas:updateTransform');
    }

    EventBus.emit('ui:update');
    EventBus.emit('render');
}

// ── EventBus registration ─────────────────────────────────────
EventBus.on('history:save', saveState);
