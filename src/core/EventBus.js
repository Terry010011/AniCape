// ============================================================
// EVENT BUS
// Lightweight pub/sub that decouples modules from each other.
// Replaces every `if (typeof functionName === 'function')` call
// in the codebase with a named event contract.
//
// ── Event catalogue ──────────────────────────────────────────
//  Emitted by           Event name                 Handled by
//  ------------         -------------------------  ------------------
//  any module           'render'                   renderer.js
//  any module           'ui:update'                logic/ui.js
//  any module           'ui:refreshProperties'     ui/properties.js
//  any module           'ui:alert'    {key,msg?}   core/utils.js
//  any module           'history:save'             logic/history.js
//  any module           'canvas:resize' {w,h}      logic/renderer.js
//  any module           'canvas:fitToScreen'       logic/renderer.js
//  any module           'canvas:updateTransform'   logic/renderer.js
//  any module           'masks:regenerate'         logic/renderer.js
//  any module           'animation:play' {id,data} logic/animation.js
//  any module           'animation:stop'  layerId  logic/animation.js
//  any module           'animation:rebuildFrames' layer  logic/animation.js
//  any module           'layer:setActive' id|null  logic/layers.js
// ============================================================

const EventBus = (function () {
    const _listeners = {};

    return Object.freeze({

        /**
         * Subscribe to an event.
         * @param {string} event
         * @param {Function} fn
         */
        on(event, fn) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(fn);
        },

        /**
         * Unsubscribe a previously registered handler.
         * @param {string} event
         * @param {Function} fn
         */
        off(event, fn) {
            if (!_listeners[event]) return;
            _listeners[event] = _listeners[event].filter(f => f !== fn);
        },

        /**
         * Emit an event; every subscriber is called synchronously.
         * Errors inside handlers are caught and logged so one bad
         * handler cannot silence the rest.
         * @param {string} event
         * @param {*} [data]
         */
        emit(event, data) {
            (_listeners[event] || []).forEach(fn => {
                try {
                    fn(data);
                } catch (err) {
                    console.error(`[EventBus] Error in handler for "${event}":`, err);
                }
            });
        },

        /**
         * Subscribe once; auto-unsubscribes after the first call.
         * @param {string} event
         * @param {Function} fn
         */
        once(event, fn) {
            const wrapper = (data) => {
                this.off(event, wrapper);
                fn(data);
            };
            this.on(event, wrapper);
        },
    });
})();
