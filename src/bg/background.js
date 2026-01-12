// Service Worker entry point for Manifest V3
// Import all necessary scripts
importScripts(
    'js/ankiconnect.js',
    'js/ankiweb.js',
    'js/builtin.js',
    'js/deinflector.js',
    'js/utils.js',
    'js/agent.js',
    'js/backend.js'
);

// Setup offscreen document (contains sandbox iframe)
// This is the key to maintaining sandbox page in Manifest V3
// Wait for offscreen document to be ready before initializing
setupOffscreenDocument('/bg/background.html').then(() => {
    // Initialize backend when Service Worker starts
    // In Manifest V3, Service Worker starts when extension is installed or reloaded
    // The backend.js file should create odhback instance at the end
    // Wait a bit for it to be ready
    setTimeout(() => {
        if (typeof self !== 'undefined' && self.odhback) {
            // Set up message listener
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                return self.odhback.onMessage(request, sender, sendResponse);
            });
            
            // Set up command listener
            chrome.commands.onCommand.addListener((command) => {
                self.odhback.onCommand(command);
            });
            
            // Wait a bit more for offscreen document to fully initialize
            setTimeout(() => {
                // Initialize backend (this will trigger sandbox loading)
                self.odhback.api_initBackend({}).catch(err => {
                    console.error('Error initializing backend:', err);
                });
            }, 500);
        }
    }, 100);
}).catch(err => {
    console.error('Error setting up offscreen document:', err);
});

// Keep Service Worker alive
// according to woxxom's reply on below stackoverflow discussion
// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();
