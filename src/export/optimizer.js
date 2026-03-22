// ============================================================
// EXPORT - IMAGE OPTIMIZERS (UPNG & OXIPNG)
// ============================================================

/**
 * Encodes a Canvas to 8-bit indexed PNG using UPNG.js in a separate worker.
 */
async function optimizeUPNG(canvas) {
    return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const buffer = imgData.data.buffer;
        
        const worker = new Worker('src/workers/upng.worker.js');
        worker.onmessage = (e) => {
            if (e.data.success) {
                const blob = new Blob([e.data.buffer], { type: 'image/png' });
                worker.terminate();
                resolve(blob);
            } else {
                worker.terminate();
                reject(new Error(e.data.error));
            }
        };
        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message));
        };
        worker.postMessage({ buffer, width: canvas.width, height: canvas.height, cnum: 256 }, [buffer]);
    });
}

/**
 * Compresses a PNG Blob losslessly using OxiPNG (WebAssembly) in a separate worker.
 */
async function optimizeOxiPNG(blob, level) {
    return new Promise(async (resolve, reject) => {
        const arrayBuffer = await blob.arrayBuffer();
        const worker = new Worker('src/workers/oxipng.worker.js', { type: 'module' });

        worker.onmessage = (e) => {
            if (e.data.success) {
                const optimized = new Blob([e.data.optimized], { type: 'image/png' });
                worker.terminate();
                resolve(optimized);
            } else {
                worker.terminate();
                // If optimization fails, fallback to original
                resolve(blob); 
            }
        };

        worker.onerror = (e) => {
            worker.terminate();
            resolve(blob);
        };

        worker.postMessage({ arrayBuffer, level }, [arrayBuffer]);
    });
}
