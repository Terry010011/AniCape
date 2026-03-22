// ============================================================
// PROJECT MANAGEMENT (Save / Load .anicape)
// ============================================================

async function saveProject() {
    if (state.layers.length === 0 && !state.templateImg) {
        alert(translations[currentLang].alert_no_layers || "No content to save!");
        return;
    }

    const zip = new JSZip();

    // 1. Prepare project configuration
    const config = {
        version: 1,
        width: state.width,
        height: state.height,
        targetMod: state.targetMod,
        regions: state.config.regions,
        tolerance: state.tolerance,
        layers: []
    };

    // 2. Add Template Image if exists
    if (state.templateImg) {
        try {
            const tempCv = document.createElement('canvas');
            tempCv.width = state.templateImg.width;
            tempCv.height = state.templateImg.height;
            tempCv.getContext('2d').drawImage(state.templateImg, 0, 0);

            // Get as blob (PNG) to preserve pixel data
            const templateBlob = await new Promise(resolve => tempCv.toBlob(resolve, 'image/png'));
            zip.file("template.png", templateBlob);
        } catch (e) {
            console.error("Failed to save template image", e);
        }
    }

    // 3. Add layers
    const layersFolder = zip.folder("layers");

    for (const layer of state.layers) {
        const layerConfig = {
            id: layer.id,
            name: layer.name,
            x: layer.x,
            y: layer.y,
            scale: layer.scale,
            scaleX: layer.scaleX,
            scaleY: layer.scaleY,
            rotation: layer.rotation,
            opacity: layer.opacity,
            visible: layer.visible !== false,
            regions: layer.regions || [],
            frameMultiplier: layer.isAnimated && layer.animationData ? layer.animationData.frameMultiplier : 1,
            targetFps: layer.isAnimated && layer.animationData ? layer.animationData.targetFps : undefined,
            isImage: !!layer.img,
            isSolid: layer.isSolid,
            solidColor: layer.solidColor,
            solidWidth: layer.solidWidth,
            solidHeight: layer.solidHeight,
            // Track the original file name to recreate the extension
            originalFileName: layer.originalFile ? layer.originalFile.name : (layer.isSolid ? null : "layer.png"),
            fileName: layer.isSolid ? null : (layer.id + (layer.originalFile ? "_" + layer.originalFile.name : ".png"))
        };

        if (!layer.isSolid && layer.img) {
            // Priority: use the original binary File if available
            if (layer.originalFile) {
                layersFolder.file(layerConfig.fileName, layer.originalFile);
            }
            // Fallback: Use data URL if it's a small scratch image
            else if (layer.img.src.startsWith('data:')) {
                const dataParts = layer.img.src.split(',');
                if (dataParts.length === 2) {
                    layersFolder.file(layerConfig.fileName, dataParts[1], { base64: true });
                }
            }
            // Last resort: Draw to canvas and get blob
            else {
                try {
                    const tempCv = document.createElement('canvas');
                    tempCv.width = layer.img.width;
                    tempCv.height = layer.img.height;
                    tempCv.getContext('2d').drawImage(layer.img, 0, 0);
                    const blob = await new Promise(resolve => tempCv.toBlob(resolve, 'image/png'));
                    layersFolder.file(layerConfig.fileName, blob);
                } catch (err) {
                    console.error("Failed to recover layer image binary:", layerConfig.name, err);
                }
            }
        }

        config.layers.push(layerConfig);
    }

    // 4. Save config
    zip.file("project.json", JSON.stringify(config, null, 2));

    // 5. Generate zip and download
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0"; overlay.style.left = "0"; overlay.style.width = "100%"; overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.5)"; overlay.style.zIndex = "9999";
    overlay.style.display = "flex"; overlay.style.justifyContent = "center"; overlay.style.alignItems = "center";
    overlay.style.color = "white"; overlay.style.fontSize = "1.5rem";
    overlay.innerText = translations[currentLang].saving_project || "Saving Project...";
    document.body.appendChild(overlay);

    try {
        const content = await zip.generateAsync({ type: "blob" });
        downloadBlob(content, "project.anicape");
    } catch (e) {
        console.error("Failed to save project", e);
        alert((translations[currentLang].alert_save_error || "Failed to save project:") + " " + e.message);
    } finally {
        document.body.removeChild(overlay);
    }
}

async function loadProject(file) {
    if (!file) return;

    // Confirm overwrite if there's ongoing work
    if (state.layers && state.layers.length > 0) {
        if (!showConfirm('confirm_project_load')) return;
    }

    try {
        const zip = await JSZip.loadAsync(file);

        const configFile = zip.file("project.json");
        if (!configFile) throw new Error("Invalid project file (missing project.json)");

        const configText = await configFile.async("string");
        const config = JSON.parse(configText);

        // Reset state appropriately
        state.layers = [];
        state.activeLayerId = null;

        // 1. Load Global Configs (Regions & Tolerance)
        if (config.regions) {
            state.config.regions = config.regions;
            renderColorList();
        }
        if (config.tolerance !== undefined) {
            state.tolerance = config.tolerance;
            const tolInput = document.getElementById('toleranceInput');
            if (tolInput) tolInput.value = state.tolerance;
        }
        if (config.targetMod) {
            state.targetMod = config.targetMod;
            const targetModSelect = document.getElementById("targetModSelect");
            if (targetModSelect) targetModSelect.value = state.targetMod;
            const resampleWrapper = document.getElementById('resampleToggleWrapper');
            if (resampleWrapper) {
                resampleWrapper.style.display = (state.targetMod === 'minecraftcapes') ? 'block' : 'none';
            }
        }

        // 2. Load Template (Crucial for Clipping Masks)
        const templateFile = zip.file("template.png");
        if (templateFile) {
            const templateBlob = await templateFile.async("blob");
            const templateImg = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = URL.createObjectURL(templateBlob);
            });
            // processTemplate will setup canvas size and generate masks
            processTemplate(templateImg);
        } else if (config.width && config.height) {
            // Fallback: If no template image, at least set size
            state.width = config.width;
            state.height = config.height;
            const canvas = document.getElementById('mainCanvas');
            if (canvas) {
                canvas.width = config.width;
                canvas.height = config.height;
            }
            const gizmoLayer = document.getElementById('gizmoLayer');
            if (gizmoLayer) {
                gizmoLayer.style.width = config.width + 'px';
                gizmoLayer.style.height = config.height + 'px';
            }
        }

        // Update UI size selector
        if (config.width && config.height) {
            const sizeStr = `${config.width}x${config.height}`;
            const sizeSelect = document.getElementById('sizeSelect');
            if (sizeSelect) {
                const opt = sizeSelect.querySelector(`option[value="${sizeStr}"]`);
                if (opt) sizeSelect.value = sizeStr;
                else sizeSelect.value = 'custom';
            }
            fitToScreen();
        }

        // 3. Load Layers
        for (const layerConfig of config.layers) {
            let newLayer = null;

            if (layerConfig.isSolid) {
                newLayer = {
                    id: layerConfig.id,
                    name: layerConfig.name || "Solid Layer",
                    isSolid: true,
                    solidColor: layerConfig.solidColor || "#ffffff",
                    solidWidth: layerConfig.solidWidth || state.width,
                    solidHeight: layerConfig.solidHeight || state.height,
                    x: layerConfig.x,
                    y: layerConfig.y,
                    scale: layerConfig.scale || 1,
                    scaleX: layerConfig.scaleX !== undefined ? layerConfig.scaleX : (layerConfig.scale || 1),
                    scaleY: layerConfig.scaleY !== undefined ? layerConfig.scaleY : (layerConfig.scale || 1),
                    rotation: layerConfig.rotation || 0,
                    opacity: layerConfig.opacity !== undefined ? layerConfig.opacity : 1,
                    regions: layerConfig.regions || [],
                    visible: layerConfig.visible !== false
                };
            } else if (layerConfig.fileName) {
                const imgFile = zip.file(`layers/${layerConfig.fileName}`);
                if (imgFile) {
                    const blob = await imgFile.async("blob");
                    const originalFile = new File([blob], layerConfig.originalFileName || layerConfig.fileName, { type: blob.type || "image/png" });
                    const imgUrl = URL.createObjectURL(blob);

                    newLayer = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            resolve({
                                id: layerConfig.id,
                                name: layerConfig.name || "Image Layer",
                                isSolid: false,
                                img: img,
                                originalFile: originalFile,
                                x: layerConfig.x,
                                y: layerConfig.y,
                                scale: layerConfig.scale || 1,
                                scaleX: layerConfig.scaleX !== undefined ? layerConfig.scaleX : (layerConfig.scale || 1),
                                scaleY: layerConfig.scaleY !== undefined ? layerConfig.scaleY : (layerConfig.scale || 1),
                                rotation: layerConfig.rotation || 0,
                                opacity: layerConfig.opacity !== undefined ? layerConfig.opacity : 1,
                                regions: layerConfig.regions || [],
                                visible: layerConfig.visible !== false
                            });
                        };
                        img.onerror = () => resolve(null);
                        img.src = imgUrl;
                    });
                }
            }

            if (newLayer) {
                state.layers.push(newLayer);

                // If it's an animated file, trigger async handlers
                if (newLayer.originalFile && !newLayer.isSolid) {
                    if (typeof SimpleGifHandler !== 'undefined' && SimpleGifHandler.isAnimatedImage(newLayer.originalFile)) {
                        try {
                            const result = await SimpleGifHandler.loadAnimatedImage(newLayer.originalFile);
                            if (result.isAnimated) {
                                newLayer.isAnimated = true;
                                newLayer.animationData = setupAnimationData(
                                    result, 
                                    layerConfig.targetFps, 
                                    layerConfig.frameMultiplier
                                );
                                rebuildFramesForMod(newLayer);
                                playLayerAnimation(newLayer.id, newLayer.animationData);
                            }
                        } catch (err) {
                            console.error("SimpleGifHandler error during project load for", newLayer.name, err);
                        }
                    }
                }
            }
        }

        updateUI();
        render();
        state.historyStack = [];
        saveState();

    } catch (e) {
        console.error("Failed to load project", e);
        alert((translations[currentLang].alert_load_error || "Failed to load project:") + " " + e.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const saveProjectBtn = document.getElementById("saveProjectBtn");
    const openProjectBtn = document.getElementById("openProjectBtn");
    const projectInput = document.getElementById("projectInput");

    if (saveProjectBtn) {
        saveProjectBtn.addEventListener("click", () => {
            saveProject();
        });
    }

    if (openProjectBtn && projectInput) {
        openProjectBtn.addEventListener("click", () => {
            projectInput.click();
        });

        projectInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                loadProject(e.target.files[0]);
            }
            e.target.value = ""; // reset
        });
    }
});

// PWA File Handling
if ('launchQueue' in window && 'LaunchParams' in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
        // Nothing to do when the queue is empty.
        if (!launchParams.files.length) {
            return;
        }
        for (const fileHandle of launchParams.files) {
            try {
                // Get the actual File object from the handle
                const file = await fileHandle.getFile();
                // If it's a .anicape file, load it
                if (file.name.toLowerCase().endsWith('.anicape')) {
                    await loadProject(file);
                }
            } catch (err) {
                console.error("Failed to handle file launch:", err);
            }
        }
    });
}
