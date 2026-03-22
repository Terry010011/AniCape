// ============================================================
// EXPORT DIALOG & MAIN FLOW
// ============================================================

function showExportDialog() {
    if (state.layers.length === 0) {
        showAlert('alert_no_layers');
        return;
    }

    const modal = document.getElementById('exportModal');
    const exportGenerateBtn = document.getElementById('exportGenerateBtn');
    const exportDownloadBtn = document.getElementById('exportDownloadBtn');
    const processingDiv = document.getElementById('exportProcessing');
    const processingText = document.getElementById('processingText');
    const originalSizeText = document.getElementById('originalSizeText');
    const optimizedSizeDiv = document.getElementById('optimizedSizeDiv');
    const optimizedSizeText = document.getElementById('optimizedSizeText');
    const savingsDiv = document.getElementById('savingsDiv');
    const savingsText = document.getElementById('savingsText');
    const oxipngLevelSlider = document.getElementById('oxipngLevel');
    const oxipngLevelValue = document.getElementById('oxipngLevelValue');
    const oxipngDesc = document.getElementById('oxipngDesc');
    const skinCanvas = document.getElementById('skin_container');
    const btnCape = document.getElementById('btn_cape');
    const btnElytra = document.getElementById('btn_elytra');
    const openBlob = document.getElementById('btn_open_blob');

    let finalBlob = null;
    let finalBlobUrl = null;
    let capeFrames = [];
    let backEquipmentType = 'cape';
    let numFramesForDownloadExport = 1;

    const SKIN_URL = "assets/steve.png";

    // Setup initial UI states
    modal.style.display = 'flex';
    exportDownloadBtn.disabled = true;
    processingDiv.style.display = 'none';
    optimizedSizeDiv.style.display = 'none';
    savingsDiv.style.display = 'none';
    originalSizeText.textContent = '--';
    
    if (btnCape) btnCape.classList.add('active');
    if (btnElytra) btnElytra.classList.remove('active');
    document.getElementById('export_preview_hint').classList.remove('hidden');
    document.querySelector('.cape-controls').classList.add('hidden');

    // 1. Init 3D Preview
    init3DPreview(skinCanvas, SKIN_URL);

    // 2. Slider Labels (Oxipng & GIF)
    const levelDescs = ['Minimal', 'Low', 'Balanced', 'Moderate', 'Thorough', 'Intense', 'Maximum'];
    oxipngLevelSlider.oninput = () => {
        const level = parseInt(oxipngLevelSlider.value);
        if (oxipngLevelValue) oxipngLevelValue.textContent = level;
        if (oxipngDesc) oxipngDesc.textContent = levelDescs[level] || 'Unknown';
    };
    oxipngLevelSlider.dispatchEvent(new Event('input'));

    const gifQualitySlider = document.getElementById('gifQualitySlider');
    const gifQualityValue = document.getElementById('gifQualityValue');
    if (gifQualitySlider && gifQualityValue) {
        gifQualitySlider.oninput = () => {
            gifQualityValue.textContent = gifQualitySlider.value;
        };
        gifQualitySlider.dispatchEvent(new Event('input'));
    }

    // 3. Conditional Visibility for GIF vs PNG
    const animatedLayer = state.layers.find(l => l.isAnimated && l.animationData && l.animationData.displayFrames);
    const totalFrames = animatedLayer ? animatedLayer.animationData.displayFrames.length : 1;
    const isMinecraftCapesAnimated = state.targetMod === 'minecraftcapes' && totalFrames > 1;

    document.getElementById('oxipngLevelWrapper').style.display = isMinecraftCapesAnimated ? 'none' : 'block';
    document.getElementById('oxipngToggleWrapper').style.display = isMinecraftCapesAnimated ? 'none' : 'flex';
    document.getElementById('upngToggleWrapper').style.display = isMinecraftCapesAnimated ? 'none' : 'flex';
    document.getElementById('gifQualityWrapper').style.display = isMinecraftCapesAnimated ? 'block' : 'none';

    // 4. Equipment Type Toggle
    if (btnCape) btnCape.onclick = () => {
        backEquipmentType = 'cape';
        btnCape.classList.add('active');
        btnElytra.classList.remove('active');
        if (capeFrames.length > 0) {
            updatePreviewTexture(capeFrames[0], 'cape');
            if (capeFrames.length > 1) startCapeAnimation(capeFrames, 'cape');
        }
    };
    if (btnElytra) btnElytra.onclick = () => {
        backEquipmentType = 'elytra';
        btnElytra.classList.add('active');
        btnCape.classList.remove('active');
        if (capeFrames.length > 0) {
            updatePreviewTexture(capeFrames[0], 'elytra');
            if (capeFrames.length > 1) startCapeAnimation(capeFrames, 'elytra');
        }
    };

    // 5. Main Generation Flow
    exportGenerateBtn.onclick = async () => {
        toggleGeneratingState(true);
        processingText.textContent = 'Preparing...';

        await new Promise(r => setTimeout(r, 50));

        const framesArray = generateExportFrames();
        if (!framesArray) {
            toggleGeneratingState(false);
            return;
        }

        numFramesForDownloadExport = framesArray.length;
        capeFrames = framesArray;

        // Build strip if not animated GIF
        let stripCanvas = null;
        if (state.targetMod !== 'minecraftcapes' || numFramesForDownloadExport <= 1) {
            stripCanvas = createStripCanvas(framesArray);
        }

        const useCompression = document.getElementById('oxipngToggle').checked;
        const level = parseInt(document.getElementById('oxipngLevel').value);
        const useUpng = document.getElementById('upngToggle').checked;

        // --- Animated GIF Path ---
        if (state.targetMod === 'minecraftcapes' && numFramesForDownloadExport > 1) {
            await handleAnimatedGIFExport(framesArray);
        } 
        // --- PNG / Strip Path ---
        else {
            try {
                let originalBlob = await new Promise(r => stripCanvas.toBlob(r, 'image/png'));
                originalSizeText.textContent = formatFileSize(originalBlob.size);
                
                let blobToProcess = originalBlob;
                if (useUpng) {
                    processingText.textContent = 'Reducing to 8-bit...';
                    blobToProcess = await optimizeUPNG(stripCanvas);
                }

                if (useCompression) {
                    processingText.textContent = `Compressing (Level ${level})...`;
                    finalBlob = await optimizeOxiPNG(blobToProcess, level);
                } else {
                    finalBlob = blobToProcess;
                }
                
                finishProcessing(finalBlob, originalBlob, useCompression);
            } catch (err) {
                handleExportError(err);
            }
        }
    };

    async function handleAnimatedGIFExport(frames) {
        if (!window.GIF) {
            handleExportError({ message: 'GIF encoder missing' });
            return;
        }
        processingText.textContent = 'Generating GIF...';
        
        try {
            const transColor = findUnusedColor(frames);
            const gifBlob = await encodeGIF(frames, transColor);
            finalBlob = gifBlob;
            originalSizeText.textContent = formatFileSize(gifBlob.size);
            finishProcessing(gifBlob, null, false);
        } catch (err) {
            handleExportError(err);
        }
    }

    async function encodeGIF(frames, transColorInt) {
        return new Promise(async (resolve, reject) => {
            const tr = (transColorInt >> 16) & 0xFF;
            const tg = (transColorInt >> 8) & 0xFF;
            const tb = transColorInt & 0xFF;

            const response = await fetch('./libs/gif.worker.js');
            const workerText = await response.text();
            const workerBlob = new Blob([workerText], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(workerBlob);

            const quality = parseInt(document.getElementById('gifQualitySlider').value);
            const workers = navigator.hardwareConcurrency ? Math.max(2, navigator.hardwareConcurrency - 1) : 2;

            const gif = new window.GIF({
                workers, quality,
                width: state.width, height: state.height,
                transparent: transColorInt,
                workerScript: workerUrl
            });

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.width;
            tempCanvas.height = state.height;
            const tempCtx = tempCanvas.getContext('2d');

            frames.forEach(frame => {
                tempCtx.clearRect(0, 0, state.width, state.height);
                tempCtx.drawImage(frame, 0, 0);
                const imgData = tempCtx.getImageData(0, 0, state.width, state.height);
                const data = imgData.data;

                for (let j = 0; j < data.length; j += 4) {
                    if (data[j + 3] < 128) {
                        data[j] = tr; data[j + 1] = tg; data[j + 2] = tb; data[j + 3] = 255;
                    } else {
                        data[j + 3] = 255;
                    }
                }
                tempCtx.putImageData(imgData, 0, 0);
                gif.addFrame(tempCtx.getImageData(0, 0, state.width, state.height), { delay: 100, dispose: 2 });
            });

            gif.on('finished', (blob) => {
                URL.revokeObjectURL(workerUrl);
                resolve(blob);
            });
            gif.render();
        });
    }

    function createStripCanvas(frames) {
        const canv = document.createElement('canvas');
        canv.width = state.width;
        canv.height = state.height * frames.length;
        const ctx = canv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        frames.forEach((f, i) => ctx.drawImage(f, 0, i * state.height));
        return canv;
    }

    function finishProcessing(blob, originalBlob, usedCompression) {
        if (finalBlobUrl) URL.revokeObjectURL(finalBlobUrl);
        finalBlobUrl = URL.createObjectURL(blob);

        updatePreviewTexture(capeFrames[0], backEquipmentType);
        if (capeFrames.length > 1) startCapeAnimation(capeFrames, backEquipmentType);

        document.getElementById('export_preview_hint').classList.add('hidden');
        const ctrl = document.querySelector('.cape-controls');
        if (ctrl) ctrl.classList.remove('hidden');

        // Show optimized stats only if we have an original to compare with (PNG path)
        if (originalBlob) {
            optimizedSizeText.textContent = formatFileSize(blob.size);
            optimizedSizeDiv.style.display = 'block';

            if (usedCompression && blob.size < originalBlob.size) {
                const savings = formatFileSize(originalBlob.size - blob.size);
                const percent = Math.round((1 - blob.size / originalBlob.size) * 100);
                savingsText.textContent = `${savings} (${percent}%)`;
                savingsDiv.style.display = 'block';
            }
        } else {
            // GIF mode or no optimization: optimized stats stay hidden
            optimizedSizeDiv.style.display = 'none';
            savingsDiv.style.display = 'none';
        }

        toggleGeneratingState(false);
        exportDownloadBtn.disabled = false;
    }

    function toggleGeneratingState(isProcessing) {
        exportGenerateBtn.disabled = isProcessing;
        const cancel = document.getElementById('exportCancelBtn');
        const close = document.getElementById('exportCloseBtn');
        if (cancel) cancel.disabled = isProcessing;
        if (close) close.disabled = isProcessing;
        processingDiv.style.display = isProcessing ? 'block' : 'none';
    }

    function handleExportError(err) {
        console.error("Export failed", err);
        processingText.textContent = 'Error: ' + err.message;
        toggleGeneratingState(false);
        exportDownloadBtn.disabled = true;
    }

    exportDownloadBtn.onclick = () => {
        if (!finalBlob) return;
        const ext = (state.targetMod === 'minecraftcapes' && numFramesForDownloadExport > 1) ? 'gif' : 'png';
        const filename = (state.targetMod === 'minecraftcapes') ? `cape.${ext}` : 'cape_strip.png';
        downloadBlob(finalBlob, filename);
    };

    if (openBlob) openBlob.onclick = () => {
        if (finalBlobUrl) window.open(finalBlobUrl, '_blank');
    };

    const closeAll = () => {
        cleanup3DPreview();
        if (finalBlobUrl) URL.revokeObjectURL(finalBlobUrl);
        modal.style.display = 'none';
    };
    const c1 = document.getElementById('exportCloseBtn');
    const c2 = document.getElementById('exportCancelBtn');
    if (c1) c1.onclick = closeAll;
    if (c2) c2.onclick = closeAll;
}
