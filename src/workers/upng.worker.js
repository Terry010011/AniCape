var window = self;
// Adjusted path: from src/workers/ to libs/
importScripts('../../libs/pako.min.js', '../../libs/UPNG.min.js');

self.onmessage = function (e) {
    const { buffer, width, height, cnum } = e.data;
    try {
        const upngBuffer = UPNG.encode([buffer], width, height, cnum);
        self.postMessage({ success: true, buffer: upngBuffer }, [upngBuffer]);
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};
