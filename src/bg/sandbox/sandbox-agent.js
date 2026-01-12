// Sandbox-specific Agent for Manifest V3
// Communicates with Service Worker via chrome.runtime
class SandboxAgent {
    constructor() {
        this.callbacks = {};
        // Listen for messages from Service Worker
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // Handle callbacks from Service Worker
            if (request.action === 'sandboxCallback' && request.params) {
                const { callbackId, data } = request.params;
                if (this.callbacks[callbackId] && typeof(this.callbacks[callbackId]) === 'function') {
                    this.callbacks[callbackId](data);
                    delete this.callbacks[callbackId];
                }
                return true;
            }
            return false;
        });
    }

    postMessage(action, params, callback) {
        if (action != 'callback' && callback) {
            params.callbackId = Math.random();
            this.callbacks[params.callbackId] = callback;
        }
        
        // Send message to Service Worker via chrome.runtime
        chrome.runtime.sendMessage({
            action: 'sandboxRequest',
            data: { action, params },
            target: 'backend'
        }).catch((error) => {
            if (callback) {
                callback(null);
            }
        });
    }
}
