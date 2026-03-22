// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Standard download function that works across desktop and mobile.
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, CONSTANTS.DOWNLOAD_CLEANUP_MS);
}

function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function showAlert(messageKey, customMessage = '') {
    const title   = getTranslation('alert_title');
    const message = customMessage || getTranslation(messageKey);
    alert(`${title}: ${message}`);
}

// ── EventBus registration ─────────────────────────────────────
// Allows any module to show an alert via:
//   EventBus.emit('ui:alert', { key: 'my_key' })
//   EventBus.emit('ui:alert', { key: 'my_key', msg: 'custom message' })
EventBus.on('ui:alert', (data) => {
    if (!data) return;
    showAlert(data.key || '', data.msg || '');
});

function showConfirm(messageKey, customMessage = '') {
    const message = customMessage || getTranslation(messageKey);
    return confirm(message);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// ============================================================
// CONFIG PERSISTENCE
// ============================================================

function saveUserConfig() {
    const toSave = {
        regions: state.config.regions,
        system: { defaultZoom: state.scale, defaultTolerance: state.tolerance }
    };
    localStorage.setItem('cape_editor_config', JSON.stringify(toSave));
}

function exportConfig() {
    const config = {
        regions: state.config.regions,
        system: { defaultZoom: state.scale, defaultTolerance: state.tolerance }
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    downloadBlob(blob, 'cape_config.json');
    showAlert('alert_config_export');
}

function importConfig(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const config = JSON.parse(e.target.result);
            if (!config.regions || !Array.isArray(config.regions)) {
                throw new Error('Invalid config structure');
            }
            state.config.regions = config.regions;
            if (config.system) {
                state.scale = config.system.defaultZoom || state.scale;
                state.tolerance = config.system.defaultTolerance || state.tolerance;
                document.getElementById('zoomSlider').value = state.scale * 100;
                updateZoomLabel();
                document.getElementById('toleranceInput').value = state.tolerance;
            }
            saveUserConfig();
            renderColorList();
            updateLayerPropertiesUI();
            render();
            showAlert('alert_config_import_success');
        } catch (err) {
            console.error('Config import error:', err);
            showAlert('alert_config_import_error', err.message);
        }
    };
    reader.readAsText(file);
}

async function resetToDefault() {
    if (showConfirm('confirm_reset')) {
        localStorage.removeItem('cape_editor_config');
        try {
            const res = await fetch('config.json');
            const defaultConf = await res.json();
            state.config = defaultConf;
            state.scale = state.config.system.defaultZoom || 0.1;
            state.tolerance = state.config.system.defaultTolerance || 80;

            document.getElementById('zoomSlider').value = state.scale * 100;
            updateZoomLabel();
            document.getElementById('toleranceInput').value = state.tolerance;

            if (typeof renderColorList === 'function') renderColorList();
            if (typeof updateLayerPropertiesUI === 'function') updateLayerPropertiesUI();
            if (typeof render === 'function') render();
            if (state.templateImg) {
                if (typeof processTemplate === 'function') processTemplate(state.templateImg);
            }
            showAlert('alert_reset_success');
        } catch (e) {
            console.error("Failed to load config.json for reset", e);
            location.reload(); // Fallback
        }
    }
}

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    const savedTheme = localStorage.getItem('cape_editor_theme');
    const systemTheme = detectSystemTheme();
    const theme = savedTheme || systemTheme;
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Update PWA navigation bar color (initial load)
    const themeColor = theme === 'dark' ? '#252529' : '#ffffff';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor);

    currentLang = localStorage.getItem('cape_editor_lang') || detectBrowserLanguage();

    try {
        const res = await fetch('config.json');
        const defaultConf = await res.json();

        const userConfStr = localStorage.getItem('cape_editor_config');
        if (userConfStr) {
            const userConf = JSON.parse(userConfStr);
            state.config.regions = userConf.regions || defaultConf.regions;
            state.config.system = { ...defaultConf.system, ...userConf.system };
        } else {
            state.config = defaultConf;
        }

        state.scale = state.config.system.defaultZoom || 0.1;
        state.tolerance = state.config.system.defaultTolerance || 80;

        document.getElementById('zoomSlider').value = state.scale * 100;
        updateZoomLabel();
        document.getElementById('toleranceInput').value = state.tolerance;
        document.getElementById('autoClipCheck').checked = state.autoClip;

        renderColorList();
        resizeCanvas(CONSTANTS.DEFAULT_CANVAS_WIDTH, CONSTANTS.DEFAULT_CANVAS_HEIGHT);
        loadPresetTemplate(CONSTANTS.DEFAULT_CANVAS_SIZE);
        startAnimationLoop();

    } catch (e) {
        console.error("Failed to load config.json", e);
        state.config = {
            regions: [
                { "id": "front", "name": "Front", "color": "#0000FF" },
                { "id": "back", "name": "Back", "color": "#FF0000" },
                { "id": "border", "name": "Border", "color": "#00FFFF" },
                { "id": "elytra", "name": "Elytra", "color": "#00FF00" }
            ]
        };
        resizeCanvas(64, 32);
        loadPresetTemplate('64x32');
        startAnimationLoop();
    }

    // Apply CONSTANTS.OPACITY_STEP to the opacity inputs so the HTML attribute
    // stays in sync with the constant (HTML attributes can't reference JS).
    document.getElementById('propOpacity')?.setAttribute('step', CONSTANTS.OPACITY_STEP);
    document.getElementById('propOpacityInput')?.setAttribute('step', CONSTANTS.OPACITY_STEP);

    updateI18n();
}

// Warn users before leaving the page if they have unsaved work
window.addEventListener('beforeunload', (e) => {
    if (typeof state !== 'undefined' && state.layers && state.layers.length > 0) {
        // Modern browsers ignore custom messages and show their own generic prompt.
        // e.preventDefault() alone is sufficient to trigger the dialog.
        e.preventDefault();
    }
});
