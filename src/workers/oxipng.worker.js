import init, { optimise } from "../../libs/squoosh_oxipng.js";

let initialized = false;

self.onmessage = async (e) => {
    try {
        if (!initialized) {
            // Adjusted path: from src/workers/ to libs/
            await init("../../libs/squoosh_oxipng_bg.wasm");
            initialized = true;
        }
        const { arrayBuffer, level } = e.data;
        const optimized = optimise(new Uint8Array(arrayBuffer), level, false, true);
        self.postMessage({ success: true, optimized: optimized.buffer }, [optimized.buffer]);
    } catch (err) {
        self.postMessage({ success: false, error: err.toString() });
    }
};
