// ============================================================
// LAYER MANAGEMENT
// ============================================================

function createLayer(name, img, isAnimated = false, animationData = null) {
    return {
        id: Date.now() + Math.random(),
        name: name,
        img: img,
        isAnimated,
        animationData,
        x: state.width / 2,
        y: state.height / 2,
        scale: 1, scaleX: 1, scaleY: 1,
        rotation: 0, opacity: 1.0,
        regions: [], visible: true, autoClip: true, syncGroupId: null,
        scaleLocked: true
    };
}

function duplicateLayer(layerId) {
    const originalLayer = state.layers.find(l => l.id === layerId);
    if (!originalLayer) return;

    const duplicatedLayer = {
        ...originalLayer,
        id: Date.now() + Math.random(),
        name: originalLayer.name + ' (copy)',
        regions: [...originalLayer.regions],
        animationData: originalLayer.animationData
            ? { ...originalLayer.animationData, currentFrame: 0 }
            : null
    };

    if (duplicatedLayer.isAnimated && duplicatedLayer.animationData) {
        updateAnimatedDisplayFrames(duplicatedLayer);
        EventBus.emit('animation:play', { id: duplicatedLayer.id, data: duplicatedLayer.animationData });
    }

    StateManager.pushLayer(duplicatedLayer);
    setActiveLayer(duplicatedLayer.id);
}

function deleteActiveLayer() {
    if (!state.activeLayerId) return;
    StateManager.removeLayer(state.activeLayerId);
    state.activeLayerId = null;
    EventBus.emit('render');
    EventBus.emit('ui:update');
    EventBus.emit('history:save');
}

function setActiveLayer(id) {
    StateManager.setActiveLayer(id);
}

function addLayer(file) {
    if (SimpleGifHandler.isAnimatedImage(file)) {
        handleAnimatedImage(file);
        return;
    }

    const img = new Image();
    img.onload = () => {
        const layer = createLayer(file.name, img, false, null);
        layer.originalFile = file;
        if (state.config.regions.length > 0) {
            layer.regions = state.config.regions.map(r => r.id);
        }
        StateManager.pushLayer(layer);
        setActiveLayer(layer.id);
        EventBus.emit('history:save');
    };
    img.src = URL.createObjectURL(file);
}

// ── Layer list drag-and-drop ──────────────────────────────────

const layerList = document.getElementById('layerList');
if (layerList) {
    let draggedLayerItem = null;
    let draggedLayerId   = null;

    layerList.addEventListener('dragstart', (e) => {
        const li = e.target.closest('li[data-layer-id]');
        if (li) {
            draggedLayerItem = li;
            draggedLayerId   = li.getAttribute('data-layer-id');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedLayerId);
            li.style.opacity = '0.5';
        }
    });

    layerList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const li = e.target.closest('li[data-layer-id]');
        if (li && li !== draggedLayerItem) {
            const rect = li.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (e.clientY < midY) li.parentNode.insertBefore(draggedLayerItem, li);
            else li.parentNode.insertBefore(draggedLayerItem, li.nextSibling);
        }
    });

    layerList.addEventListener('dragend', () => {
        if (draggedLayerItem) draggedLayerItem.style.opacity = '1';
        applyLayerListOrder();
        draggedLayerItem = null;
        draggedLayerId   = null;
    });

    layerList.addEventListener('drop', (e) => {
        e.preventDefault();
        applyLayerListOrder();
    });

    layerList.addEventListener('touchstart', (e) => {
        const li = e.target.closest('li[data-layer-id]');
        if (li) {
            draggedLayerItem = li;
            draggedLayerId   = li.getAttribute('data-layer-id');
            li.style.opacity = '0.5';
            li.style.cursor  = 'grabbing';
        }
    }, { passive: true });

    layerList.addEventListener('touchmove', (e) => {
        if (!draggedLayerItem) return;
        const touch    = e.touches[0];
        const allItems = Array.from(layerList.querySelectorAll('li[data-layer-id]'));
        allItems.forEach(li => {
            if (li === draggedLayerItem) return;
            const rect = li.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (touch.clientY < midY && li.previousSibling !== draggedLayerItem) {
                li.parentNode.insertBefore(draggedLayerItem, li);
            } else if (touch.clientY >= midY && li.nextSibling !== draggedLayerItem) {
                li.parentNode.insertBefore(draggedLayerItem, li.nextSibling);
            }
        });
    }, { passive: true });

    layerList.addEventListener('touchend', () => {
        if (draggedLayerItem) {
            draggedLayerItem.style.opacity = '1';
            draggedLayerItem.style.cursor  = 'grab';
        }
        applyLayerListOrder();
        draggedLayerItem = null;
        draggedLayerId   = null;
    });
}

function applyLayerListOrder() {
    const list = document.getElementById('layerList');
    if (!list) return;
    const items        = Array.from(list.querySelectorAll('li[data-layer-id]'));
    const newLayerOrder = [];
    items.reverse().forEach(item => {
        const lId  = item.getAttribute('data-layer-id');
        const layer = state.layers.find(l => l.id == lId);
        if (layer) newLayerOrder.push(layer);
    });
    StateManager.setLayers(newLayerOrder);
    EventBus.emit('render');
    EventBus.emit('history:save');
}

// ── EventBus registration ─────────────────────────────────────
EventBus.on('layer:setActive', (id) => setActiveLayer(id));
