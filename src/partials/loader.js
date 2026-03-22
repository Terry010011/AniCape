// ============================================================
// PARTIAL LOADER
// Fetches and injects HTML partials into #modals-root before
// the app boots, so all modal IDs are available to JS.
// ============================================================

const PARTIALS = [
    'src/partials/modal-export.html',
    'src/partials/modal-faq.html',
    'src/partials/modal-about.html',
];

/**
 * Fetch all partials and inject them into #modals-root.
 * Returns a Promise that resolves when all partials are ready.
 */
function loadPartials() {
    const root = document.getElementById('modals-root');
    if (!root) return Promise.resolve();

    return Promise.all(
        PARTIALS.map(url =>
            fetch(url)
                .then(r => {
                    if (!r.ok) throw new Error(`Failed to load partial: ${url}`);
                    return r.text();
                })
                .then(html => {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = html;
                    root.appendChild(wrapper);
                })
        )
    );
}
