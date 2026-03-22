// ============================================================
// UI - LAYER LIST RENDERER
// ============================================================

/**
 * Renders the layer list in the sidebar based on current state.
 */
function updateLayerListUI() {
    const list = document.getElementById('layerList');
    if (!list) return;
    
    list.innerHTML = '';

    // Render layers in reverse order (top-most layer at the top of the list)
    [...state.layers].reverse().forEach((l, index) => {
        const li = document.createElement('li');
        li.className = `layer-item ${l.id === state.activeLayerId ? 'active' : ''} ${l.visible ? '' : 'hidden-layer'}`;
        li.draggable = true;
        li.setAttribute('data-layer-id', l.id);
        li.setAttribute('data-layer-index', index);

        // Thumbnail
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'layer-thumb';
        if (l.isSolid) {
            thumbDiv.style.backgroundColor = l.solidColor;
        } else if (l.img && l.img.src) {
            thumbDiv.style.backgroundImage = `url(${l.img.src})`;
        }
        thumbDiv.style.backgroundSize = 'contain';
        thumbDiv.style.backgroundRepeat = 'no-repeat';
        thumbDiv.style.backgroundPosition = 'center';
        thumbDiv.style.pointerEvents = 'none';

        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'layer-info';
        infoDiv.style.pointerEvents = 'none';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'layer-name';
        nameDiv.innerText = l.name;
        infoDiv.appendChild(nameDiv);

        if (l.isAnimated) {
            const tagDiv = document.createElement('div');
            tagDiv.className = 'layer-tag';
            tagDiv.setAttribute('data-i18n', 'animated');
            tagDiv.innerText = typeof getTranslation === 'function' ? getTranslation('animated') : 'Animated';
            infoDiv.appendChild(tagDiv);
        }

        // Visibility Toggle
        const visibilityBtn = document.createElement('button');
        visibilityBtn.className = 'layer-visibility-btn';
        const eyeSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeOffSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        
        visibilityBtn.innerHTML = l.visible ? eyeSvg : eyeOffSvg;
        visibilityBtn.title = l.visible ? 'Hide' : 'Show';
        visibilityBtn.onclick = (e) => {
            e.stopPropagation();
            l.visible = !l.visible;
            updateLayerListUI();
            if (typeof render === 'function') render();
            if (typeof saveState === 'function') saveState();
        };

        li.appendChild(visibilityBtn);
        li.appendChild(thumbDiv);
        li.appendChild(infoDiv);
        
        // Interaction
        li.onclick = () => {
            if (typeof setActiveLayer === 'function') setActiveLayer(l.id);
        };
        
        list.appendChild(li);
    });
}
