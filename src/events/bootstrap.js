// ============================================================
// BOOTSTRAP - application entry point
// Partials must be injected before init() so all modal IDs
// exist when event listeners in controls.js attach.
// ============================================================

(async function bootstrap() {
    try {
        await loadAllLocales();
        await loadPartials();
        
        // Re-run i18n after partials inject new data-i18n nodes
        if (typeof updateI18n === 'function') updateI18n();

        await init();
        
        saveState();
        startAnimationLoop();
        updateUI();
        render();
    } catch (err) {
        console.error('Bootstrap failed:', err);
    }
})();
