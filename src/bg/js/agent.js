// --- Sandbox communication agent (with callback support) ---
class Agent {
    constructor(target) {
        this.callbacks = {};
        this.target = target;
        // In Service Worker, use self instead of window
        const eventTarget = typeof self !== 'undefined' ? self : window;
        if (eventTarget.addEventListener) {
            eventTarget.addEventListener('message', e => this.onMessage(e));
        }
    }

    onMessage(e) {
        const { action, params } = e.data;
        if (action != 'callback' || !params || !params.callbackId)
            return;
        // we are the sender getting the callback
        if (this.callbacks[params.callbackId] && typeof(this.callbacks[params.callbackId]) === 'function') {
            this.callbacks[params.callbackId](params.data);
            delete this.callbacks[params.callbackId];
        }
    }

    postMessage(action, params, callback) {
        if (action != 'callback' && callback) {
            params.callbackId = Math.random();
            this.callbacks[params.callbackId] = callback;
        }
        if (this.target) {
            // If target is a Window (iframe), use postMessage
            if (this.target.postMessage) {
                this.target.postMessage({ action, params }, '*');
            }
        } else {
            // In Service Worker (Manifest V3), we need to send message to sandbox page
            // Store the message and let sandbox page poll for it, or use a different approach
            // For now, try to send via chrome.runtime - sandbox page should be listening
            // Note: chrome.runtime.sendMessage from Service Worker goes to all listeners
            // Sandbox page needs to filter messages intended for it
            chrome.runtime.sendMessage({ 
                action: 'sandboxRequest', 
                data: { action, params },
                target: 'sandbox'
            }, (response) => {
                // Check for errors
                if (chrome.runtime.lastError) {
                    // Sandbox might not be ready yet, or message failed
                    // This is expected during initialization
                    if (action !== 'callback') {
                        // Only log warnings for non-callback messages to reduce noise
                        // console.warn('Sandbox not ready for message:', action);
                    }
                    // If callback exists and message failed, call it with null
                    if (callback && params.callbackId) {
                        callback(null);
                    }
                    return;
                }
                // Message sent successfully (response handling is done via callback mechanism)
            });
        }
    }

}