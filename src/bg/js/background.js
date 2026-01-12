/* global Agent */
class ODHBackground {
    constructor() {
        this.audios = {};
        this.agent = null;
        // Wait for iframe to load before initializing agent
        const iframe = document.getElementById('sandbox');
        if (iframe) {
            iframe.addEventListener('load', () => {
                this.agent = new Agent(iframe.contentWindow);
            });
            // If iframe is already loaded, initialize immediately
            if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
                this.agent = new Agent(iframe.contentWindow);
            }
        }
        // add listener
        chrome.runtime.onMessage.addListener(this.onServiceMessage.bind(this));
        window.addEventListener('message', e => this.onSandboxMessage(e));
    }

    playAudio(url) {
        for (let key in this.audios) {
            this.audios[key].pause();
        }

        const audio = this.audios[url] || new Audio(url);
        audio.currentTime = 0;
        audio.play();
        this.audios[url] = audio;
    }
    // message exchange for both servicework and sandbox start from here ...
    
    // message from service worker to sandbox
    onServiceMessage(request, sender, sendResponse) {
        const { action, params, target } = request;
        if (target != 'background')
            return false;
        
        if (action == 'playAudio') {
            let { url } = params
            this.playAudio(url)
            sendResponse(url);
            return true;
        }
        
        // Handle sandboxCallback - this is a callback from Service Worker to sandbox
        if (action === 'sandboxCallback' && params) {
            const { callbackId, data } = params;
            // Send callback to sandbox
            this.callback(data, callbackId);
            sendResponse(true);
            return true;
        }
        
        // Send message to sandbox and return result
        this.sendtoSandbox(action, params).then(result => {
            sendResponse(result);
        }).catch(err => {
            sendResponse(null);
        });
        return true; // Keep channel open for async response
    }

    async sendtoSandbox(action, params) {
        return new Promise((resolve, reject) => {
            // Wait for agent to be ready
            if (!this.agent) {
                // Try to initialize agent if iframe is ready
                const iframe = document.getElementById('sandbox');
                if (iframe && iframe.contentWindow) {
                    this.agent = new Agent(iframe.contentWindow);
                } else {
                    // If still not ready, wait a bit
                    setTimeout(() => {
                        const iframe = document.getElementById('sandbox');
                        if (iframe && iframe.contentWindow) {
                            this.agent = new Agent(iframe.contentWindow);
                            try {
                                this.agent.postMessage(action, params, result => resolve(result));
                            } catch (err) {
                                console.error('Error sending to sandbox:', err);
                                reject(null);
                            }
                        } else {
                            console.error('Sandbox iframe not ready');
                            reject(null);
                        }
                    }, 500);
                    return;
                }
            }
            try {
                this.agent.postMessage(action, params, result => {
                    resolve(result);
                });
            } catch (err) {
                console.error('Error sending to sandbox:', err);
                reject(null);
            }
        });
    }
    
    // message from sandbox to service worker
    async sendtoServiceworker(request){
        request.target='serviceworker';
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(request, (response) => {
                if (chrome.runtime.lastError) {
                    resolve(null);
                } else {
                    resolve(response);
                }
            });
        });
    }
    async onSandboxMessage(e) {
        const { action, params } = e.data;
        const callbackId = params.callbackId;
        
        // Send message to Service Worker
        try {
            const result = await this.sendtoServiceworker({
                action, 
                params,
                target: 'serviceworker'
            });
            // Send callback back to sandbox
            this.callback(result, callbackId);
        } catch (e) {
            console.error('Error in onSandboxMessage:', e);
            this.callback(null, callbackId);
        }
    }

    // 'callback' helper to simply simulate postMessage callback
    callback(data, callbackId) {
        this.agent.postMessage('callback', { data, callbackId });
    }
}

window.odhbackground = new ODHBackground();
