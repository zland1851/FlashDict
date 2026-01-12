function sanitizeOptions(options) {
    const defaults = {
        enabled: true,
        mouseselection: true,
        hotkey: '16', // 0:off , 16:shift, 17:ctrl, 18:alt
        maxcontext: '1',
        maxexample: '2',
        monolingual: '0', //0: bilingual 1:monolingual
        preferredaudio: '0',
        services: 'none',
        id: '',
        password: '',

        duplicate: '1', // 0: not allowe duplicated cards; 1: allowe duplicated cards;
        tags: 'ODH',
        deckname: 'Default',
        typename: 'Basic',
        expression: 'Front',
        reading: '',
        extrainfo: '',
        definition: 'Back',
        definitions: '',
        sentence: '',
        url: '',
        audio: '',

        sysscripts: 'builtin_encn_Collins,encn_Collins,encn_Cambridge,encn_Oxford,fren_Cambridge,esen_Spanishdict,decn_Eudict,escn_Eudict,frcn_Eudict',
        udfscripts: '',

        dictSelected: '',
        dictNamelist: [],
    };

    for (const key in defaults) {
        if (!options.hasOwnProperty(key)) {
            options[key] = defaults[key];
        }
    }
    return options;
}


async function optionsLoad() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, (options) => {
            resolve(sanitizeOptions(options));
        });
    });
}

async function optionsSave(options) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(sanitizeOptions(options), resolve());
    });
}

function utilAsync(func) {
    return function(...args) {
        func.apply(this, args);
    };
}

function odhback() {
    // In Service Worker (Manifest V3), getBackgroundPage() is not available
    // Use message passing to communicate with Service Worker
    if (typeof self !== 'undefined' && self.odhback && typeof window === 'undefined') {
        // We're in Service Worker context
        return self.odhback;
    }
    
    // We're in a regular page (popup, options, etc.)
    // Create a proxy object that communicates with Service Worker via messages
    return {
        opt_getDeckNames: () => sendMessageToSW('opt_getDeckNames', {}),
        opt_getModelNames: () => sendMessageToSW('opt_getModelNames', {}),
        opt_getModelFieldNames: (modelName) => sendMessageToSW('opt_getModelFieldNames', { modelName }),
        opt_getVersion: () => sendMessageToSW('opt_getVersion', {}),
        opt_optionsChanged: (options) => sendMessageToSW('opt_optionsChanged', { options }),
        ankiweb: {
            initConnection: (options, forceLogout) => sendMessageToSW('ankiweb_initConnection', { options, forceLogout })
        }
    };
}

// Helper function to send messages to Service Worker
function sendMessageToSW(action, params = {}) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action, params }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message to Service Worker:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

function localizeHtmlPage() {
    for (const el of document.querySelectorAll('[data-i18n]')) {
        el.innerHTML = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
    }
}

/* example code from google's offscreen document*/
let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given path
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // create offscreen document
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['CLIPBOARD'],
            justification: 'ODH needs offscreen document to maintain sandbox page for dictionary scripts execution',
        });
        await creating;
        creating = null;
    }
}