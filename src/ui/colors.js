// ============================================================
// UI - ADVANCED COLOR REGION EDITOR
// ============================================================

/**
 * Renders the custom color region list in the Advanced panel.
 */
function renderColorList() {
    const list = document.getElementById('dynamicColorList');
    if (!list) return;

    list.innerHTML = '';

    state.config.regions.forEach((region, index) => {
        const div = document.createElement('div');
        div.className = 'color-row';

        // Color picker input
        const inputColor = document.createElement('input');
        inputColor.type = 'color';
        inputColor.value = region.color;
        inputColor.onchange = (e) => {
            state.config.regions[index].color = e.target.value;
            if (typeof saveUserConfig === 'function') saveUserConfig();
        };

        // Name span (editable via prompt)
        const spanName = document.createElement('span');
        spanName.innerText = region.name;
        spanName.onclick = () => {
            const newName = prompt("Edit Region Name:", region.name);
            if (newName) {
                state.config.regions[index].name = newName;
                spanName.innerText = newName;
                if (typeof saveUserConfig === 'function') saveUserConfig();
                if (typeof updateLayerPropertiesUI === 'function') updateLayerPropertiesUI();
            }
        };

        // Remove button
        const btnRemove = document.createElement('button');
        btnRemove.className = 'remove-color-btn';
        btnRemove.innerHTML = '×';
        btnRemove.onclick = () => {
            if (typeof showConfirm === 'function' && showConfirm('alert_remove_region')) {
                state.config.regions.splice(index, 1);
                renderColorList();
                if (typeof saveUserConfig === 'function') saveUserConfig();
                if (typeof updateLayerPropertiesUI === 'function') updateLayerPropertiesUI();
            }
        };

        div.appendChild(inputColor);
        div.appendChild(spanName);
        div.appendChild(btnRemove);
        list.appendChild(div);
    });
}
