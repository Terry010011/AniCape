/**
 * GIF/APNG Handler - Using native libraries (omggif.js and UPNG.min.js)
 */
class SimpleGifHandler {
    static async loadAnimatedImage(file) {
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        if (fileName.endsWith('.gif') || fileType === 'image/gif') {
            return await this.loadGif(file);
        } else if (fileName.endsWith('.apng') || fileType === 'image/apng' || fileName.endsWith('.png') || fileType === 'image/png') {
            return await this.loadAPNG(file);
        } else {
            let result = await this.loadAPNG(file);
            if (!result.isAnimated) {
                result = await this.loadGif(file);
            }
            return result;
        }
    }

    static async loadGif(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if (typeof window.GifReader === 'undefined') throw new Error('GIF library not loaded.');
                    const arrayBuffer = e.target.result;
                    const gifReader = new window.GifReader(new Uint8Array(arrayBuffer));
                    const width = gifReader.width;
                    const height = gifReader.height;
                    const frameCount = gifReader.numFrames();

                    if (frameCount <= 1) return this._loadAsStaticImage(file).then(resolve);

                    const frames = [];
                    const delays = [];
                    const frameCanvas = document.createElement('canvas');
                    frameCanvas.width = width;
                    frameCanvas.height = height;
                    const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });

                    let prevFrameData = null;
                    for (let i = 0; i < frameCount; i++) {
                        const frameInfo = gifReader.frameInfo(i);
                        if (i > 0) {
                            const prevInfo = gifReader.frameInfo(i - 1);
                            if (prevInfo.disposal === 2) {
                                frameCtx.clearRect(prevInfo.x, prevInfo.y, prevInfo.width, prevInfo.height);
                            } else if (prevInfo.disposal === 3 && prevFrameData) {
                                frameCtx.putImageData(prevFrameData, 0, 0);
                            }
                        }
                        if (frameInfo.disposal === 3) {
                            prevFrameData = frameCtx.getImageData(0, 0, width, height);
                        }
                        const imageData = frameCtx.getImageData(0, 0, width, height);
                        gifReader.decodeAndBlitFrameRGBA(i, imageData.data);
                        frameCtx.putImageData(imageData, 0, 0);

                        const finalFrameCanvas = document.createElement('canvas');
                        finalFrameCanvas.width = width;
                        finalFrameCanvas.height = height;
                        finalFrameCanvas.getContext('2d').drawImage(frameCanvas, 0, 0);

                        frames.push(finalFrameCanvas);
                        delays.push(frameInfo.delay * 10 || 100);
                    }

                    resolve({ frames, durations: delays, width, height, isAnimated: true, type: 'gif', frameCount });
                } catch (err) {
                    this._loadAsStaticImage(file).then(resolve).catch(reject);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    static async loadAPNG(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if (!window.UPNG) throw new Error('UPNG library not loaded.');
                    const arrayBuffer = e.target.result;
                    let img;
                    try {
                        img = window.UPNG.decode(arrayBuffer);
                    } catch (decodeErr) {
                        return this._loadAsStaticImage(file).then(resolve);
                    }

                    if (!img.frames || img.frames.length <= 1) return this._loadAsStaticImage(file).then(resolve);

                    const width = img.width;
                    const height = img.height;
                    const delaysArray = img.frames.map(f => f.delay || 0);

                    let rgbaArray;
                    try {
                        rgbaArray = window.UPNG.toRGBA8(img);
                    } catch (rgbaErr) {
                        return this._loadAsStaticImage(file).then(resolve);
                    }

                    const frames = [];
                    const delays = [];
                    rgbaArray.forEach((frameBuffer, index) => {
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = width;
                        frameCanvas.height = height;
                        const ctx = frameCanvas.getContext('2d');
                        const imageData = new ImageData(new Uint8ClampedArray(frameBuffer), width, height);
                        ctx.putImageData(imageData, 0, 0);
                        frames.push(frameCanvas);
                        delays.push(delaysArray[index] || 100);
                    });

                    resolve({ frames, durations: delays, width, height, isAnimated: true, type: 'apng', frameCount: frames.length });
                } catch (err) {
                    this._loadAsStaticImage(file).then(resolve).catch(reject);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    static async _loadAsStaticImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0);
                resolve({ frames: [canvas], durations: [100], width: img.width, height: img.height, isAnimated: false, type: 'static', frameCount: 1 });
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    static createSpriteSheet(frames, width, height) {
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = width;
        spriteCanvas.height = height * frames.length;
        const ctx = spriteCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        frames.forEach((frame, index) => ctx.drawImage(frame, 0, index * height, width, height));
        return spriteCanvas;
    }

    static createCustomSpriteSheet(frames, width, height, customFrameCount) {
        if (customFrameCount >= frames.length) return this.createSpriteSheet(frames, width, height);
        const step = frames.length / customFrameCount;
        const selectedFrames = [];
        for (let i = 0; i < customFrameCount; i++) {
            selectedFrames.push(frames[Math.min(Math.floor(i * step), frames.length - 1)]);
        }
        return this.createSpriteSheet(selectedFrames, width, height);
    }

    static isAnimatedImage(file) {
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.gif') || fileName.endsWith('.apng') || fileName.endsWith('.png') ||
            file.type === 'image/gif' || file.type === 'image/apng' || file.type === 'image/png';
    }
}
