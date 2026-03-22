// ============================================================
// FILE DRAG AND DROP onto the workspace
// ============================================================

workspace.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    workspace.classList.add('dragover');
}, false);

workspace.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    workspace.classList.add('dragover');
}, false);

workspace.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    workspace.classList.remove('dragover');
}, false);

workspace.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    workspace.classList.remove('dragover');

    const files = e.dataTransfer?.files;
    if (!files || !files.length) return;

    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.anicape')) {
            loadProject(file);
        } else if (file.type.startsWith('image/')) {
            addLayer(file);
        }
    }
}, false);
