/* global Ankiconnect, Ankiweb, Deinflector, Builtin, Agent, optionsLoad, optionsSave */
class ODHBack {
    constructor() {
        this.audios = {};
        this.options = null;

        this.ankiconnect = new Ankiconnect();
        this.ankiweb = new Ankiweb();
        this.target = null;

        //setup lemmatizer
        this.deinflector = new Deinflector();
        this.deinflector.loadData();

        //Setup builtin dictionary data
        this.builtin = new Builtin();
        this.builtin.loadData();

        // In Service Worker, we can't use iframe directly
        // We'll initialize agent when sandbox is ready via message
        this.agent = null;
        this.initSandboxAgent();

        // Don't register message listener here - it will be registered in background.js
        // In Service Worker, use self instead of window
        self.addEventListener('message', e => this.onSandboxMessage(e));
        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
        chrome.tabs.onCreated.addListener((tab) => this.onTabReady(tab.id));
        chrome.tabs.onUpdated.addListener(this.onTabReady.bind(this));
        chrome.commands.onCommand.addListener((command) => this.onCommand(command));

    }

    initSandboxAgent() {
        // In Service Worker, we need to communicate with sandbox via chrome.runtime
        // For now, create a dummy agent that will be replaced when sandbox is ready
        // The sandbox will send a message to initialize the connection
        this.agent = new Agent(null);
        this.sandboxReady = false;
        
        // In Manifest V3, sandbox page needs to be opened explicitly
        // The sandbox page will send 'sandboxReady' message when it loads
        // We'll track when sandbox is ready to avoid sending messages too early
    }

    onCommand(command) {
        if (command != 'enabled') return;
        this.options.enabled = !this.options.enabled;
        this.setFrontendOptions(this.options);
        optionsSave(this.options);
    }

    onInstalled(details) {
        if (details.reason === 'install') {
            chrome.tabs.create({ url: chrome.runtime.getURL('bg/guide.html') });
            return;
        }
        if (details.reason === 'update') {
            chrome.tabs.create({ url: chrome.runtime.getURL('bg/update.html') });
            return;
        }
    }

    onTabReady(tabId) {
        this.tabInvoke(tabId, 'setFrontendOptions', { options: this.options });
    }

    setFrontendOptions(options) {

        switch (options.enabled) {
            case false:
                chrome.action.setBadgeText({ text: 'off' });
                break;
            case true:
                chrome.action.setBadgeText({ text: '' });
                break;
        }
        this.tabInvokeAll('setFrontendOptions', {
            options
        });
    }

    checkLastError(){
        // NOP
    }

    tabInvokeAll(action, params) {
        chrome.tabs.query({}, (tabs) => {
            for (let tab of tabs) {
                this.tabInvoke(tab.id, action, params);
            }
        });
    }

    tabInvoke(tabId, action, params) {
        const callback = () => this.checkLastError(chrome.runtime.lastError);
        chrome.tabs.sendMessage(tabId, { action, params }, callback);
    }

    formatNote(notedef) {
        let options = this.options;
        if (!options.deckname || !options.typename || !options.expression)
            return null;

        let note = {
            deckName: options.deckname,
            modelName: options.typename,
            options: { allowDuplicate: options.duplicate == '1' ? true : false },
            fields: {},
            tags: []
        };

        let fieldnames = ['expression', 'reading', 'extrainfo', 'definition', 'definitions', 'sentence', 'url'];
        for (const fieldname of fieldnames) {
            if (!options[fieldname]) continue;
            note.fields[options[fieldname]] = notedef[fieldname];
        }

        let tags = options.tags.trim();
        if (tags.length > 0) 
            note.tags = tags.split(' ');

        if (options.audio && notedef.audios.length > 0) {
            note.fields[options.audio] = '';
            let audionumber = Number(options.preferredaudio);
            audionumber = (audionumber && notedef.audios[audionumber]) ? audionumber : 0;
            let audiofile = notedef.audios[audionumber];
            note.audio = {
                'url': audiofile,
                'filename': `ODH_${options.dictSelected}_${encodeURIComponent(notedef.expression)}_${audionumber}.mp3`,
                'fields': [options.audio]
            };
        }

        return note;
    }

    // Message Hub and Handler start from here ...
    onMessage(request, sender, callback) {
        const { action, params } = request;
        
        // Handle messages from offscreen document (background.html)
        // In the new architecture, sandbox is in an iframe inside offscreen document
        // Messages from sandbox go through offscreen document to service worker
        if (action && request.target === 'serviceworker') {
            const method = this['api_' + action];
            if (typeof(method) === 'function') {
                // Handle callback-based API (like Fetch, Deinflect, etc.)
                // These need callbackId to be converted to callback function
                if (params && params.callbackId) {
                    // Convert callbackId to callback function
                    const callbackId = params.callbackId;
                    params.callback = (result) => {
                        // Send callback back to sandbox via offscreen document
                        chrome.runtime.sendMessage({
                            action: 'sandboxCallback',
                            params: { callbackId, data: result },
                            target: 'background'
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                // Ignore errors
                            }
                        });
                    };
                    delete params.callbackId;
                } else if (callback) {
                    // Use the provided callback from message handler
                    params.callback = callback;
                }
                method.call(this, params);
            }
            return true;
        }
        
        // Handle messages TO offscreen document (background.html)
        // These are requests that need to go to sandbox
        // Don't intercept these messages - let them pass through to offscreen document
        // The offscreen document's background.js will handle them
        if (action && request.target === 'background') {
            // Return false to let the message pass through to other listeners (offscreen document)
            return false;
        }
        
        // Handle messages from popup/options pages (Manifest V3)
        if (action && action.startsWith('opt_')) {
            // Special handling for opt_optionsChanged to avoid recursion
            if (action === 'opt_optionsChanged') {
                const options = params && params.options ? params.options : params;
                this.opt_optionsChanged(options).then(result => {
                    if (callback) callback(result);
                }).catch(err => {
                    if (callback) callback(null);
                });
                return true;
            }
            
            const method = this[action];
            if (typeof(method) === 'function') {
                method.call(this, params).then(result => {
                    if (callback) callback(result);
                }).catch(err => {
                    if (callback) callback(null);
                });
                return true;
            }
            // If opt_ method not found, fall through to api_ method
        }
        
        // Handle ankiweb messages
        if (action === 'ankiweb_initConnection') {
            this.ankiweb.initConnection(params.options, params.forceLogout).then(() => {
                if (callback) callback(true);
            }).catch(() => {
                if (callback) callback(false);
            });
            return true;
        }
        
        // Handle frontend messages (addNote, getTranslation, etc.)
        const method = this['api_' + action];
        if (typeof(method) === 'function') {
            params.callback = callback;
            method.call(this, params);
            return true; // Return true to indicate message was handled
        }
        
        // Message not handled
        return false;
    }

    onSandboxMessage(e) {
        // Handle messages from sandbox
        // In Service Worker, messages come via chrome.runtime.onMessage
        // This method is called from the message handler
        const {
            action,
            params
        } = e.data || e;
        const method = this['api_' + action];
        if (typeof(method) === 'function')
            method.call(this, params);
    }

    async api_initBackend(params) {
        let options = await optionsLoad();
        this.ankiweb.initConnection(options);

        //to do: will remove it late after all users migrate to new version.
        if (options.dictLibrary) { // to migrate legacy scripts list to new list.
            options.sysscripts = options.dictLibrary;
            options.dictLibrary = '';
        }
        
        // Wait a bit for sandbox to be ready before loading scripts
        // In Manifest V3, sandbox page needs time to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await this.opt_optionsChanged(options);
    }

    async api_Fetch(params) {
        let { url, callback } = params;

        // In Service Worker, use fetch API instead of jQuery
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Increase timeout for script loading
            
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.text();
            if (callback) {
                callback(data);
            }
        } catch (error) {
            console.error('Fetch error:', error, 'for URL:', url);
            if (callback) {
                callback(null);
            }
        }
    }

    async api_Deinflect(params) {
        let { word, callback } = params;
        if (callback) {
            callback(this.deinflector.deinflect(word));
        }
    }

    async api_getBuiltin(params) {
        let { dict, word, callback } = params;
        if (callback) {
            callback(this.builtin.findTerm(dict, word));
        }
    }

    async api_getLocale(params) {
        let { callback } = params;
        if (callback) {
            callback(chrome.i18n.getUILanguage());
        }
    }

    // front end message handler
    async api_isConnected(params) {
        let callback = params.callback;
        callback(await this.opt_getVersion());
    }

    async api_getTranslation(params) {
        let { expression, callback } = params;

        // Fix https://github.com/ninja33/ODH/issues/97
        if (expression.endsWith(".")) {
            expression = expression.slice(0, -1);
        }

        try {
            let result = await this.findTerm(expression);
            callback(result);
        } catch (err) {
            console.error(err);
            callback(null);
        }
    }

    async api_addNote(params) {
        let { notedef, callback } = params;

        const note = this.formatNote(notedef);
        try {
            let result = await this.target.addNote(note);
            callback(result);
        } catch (err) {
            console.error(err);
            callback(null);
        }
    }

    async api_playAudio(params) {
        let { url, callback } = params;
        
        // In Service Worker, Audio API is not available
        // Forward the request to offscreen document (background.html) to play audio
        try {
            const result = await this.sendtoBackground({ action: 'playAudio', params: { url } });
            if (callback) {
                callback(result);
            }
        } catch (err) {
            console.error('Error playing audio:', err);
            if (callback) {
                callback(null);
            }
        }
    }

    // Option page and Brower Action page requests handlers.
    async opt_optionsChanged(options) {
        this.setFrontendOptions(options);

        switch (options.services) {
            case 'none':
                this.target = null;
                break;
            case 'ankiconnect':
                this.target = this.ankiconnect;
                break;
            case 'ankiweb':
                this.target = this.ankiweb;
                break;
            default:
                this.target = null;
        }

        let defaultscripts = ['builtin_encn_Collins'];
        let newscripts = `${options.sysscripts},${options.udfscripts}`;
        let loadresults = null;
        if (!this.options || (`${this.options.sysscripts},${this.options.udfscripts}` != newscripts)) {
            const scriptsset = Array.from(new Set(defaultscripts.concat(newscripts.split(',').filter(x => x).map(x => x.trim()))));
            loadresults = await this.loadScripts(scriptsset);
        }

        this.options = options;
        if (loadresults && loadresults.length > 0) {
            // Filter out null results
            const validResults = loadresults.filter(x => x && x.result);
            if (validResults.length > 0) {
                let namelist = validResults.map(x => x.result.objectname);
                this.options.dictSelected = namelist.includes(options.dictSelected) ? options.dictSelected : namelist[0];
                this.options.dictNamelist = validResults.map(x => x.result);
            } else {
                // No scripts loaded, use default
                console.warn('No dictionary scripts loaded, using default');
                this.options.dictNamelist = this.options.dictNamelist || [];
            }
        } else {
            // Keep existing dictNamelist if available (scripts list hasn't changed)
            // This is normal and expected behavior - no need to reload scripts
            if (!this.options || !this.options.dictNamelist || this.options.dictNamelist.length === 0) {
                this.options.dictNamelist = [];
            } else {
                // Preserve existing dictNamelist
                this.options.dictNamelist = this.options.dictNamelist;
            }
        }
        await this.setScriptsOptions(this.options);
        optionsSave(this.options);
        return this.options;
    }


    async opt_getDeckNames() {
        return this.target ? await this.target.getDeckNames() : null;
    }

    async opt_getModelNames() {
        return this.target ? await this.target.getModelNames() : null;
    }

    async opt_getModelFieldNames(params) {
        const modelName = params && params.modelName ? params.modelName : params;
        return this.target ? await this.target.getModelFieldNames(modelName) : null;
    }

    async opt_getVersion() {
        return this.target ? await this.target.getVersion() : null;
    }
    
    // Note: opt_optionsChanged is already defined above, this handles message-based calls
    async handle_opt_optionsChanged(params) {
        const options = params && params.options ? params.options : params;
        return await this.opt_optionsChanged(options);
    }

    // Sandbox communication start here
    async ensureSandboxOpen() {
        // In Manifest V3, sandbox page needs to be opened explicitly
        // Try to open sandbox page if not already open
        const sandboxUrl = chrome.runtime.getURL('bg/sandbox/sandbox.html');
        
        // Try to check if sandbox is already open by pinging it
        try {
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'sandboxPing' }, (response) => {
                    // Check for errors
                    if (chrome.runtime.lastError) {
                        // Sandbox not open yet
                        resolve();
                        return;
                    }
                    if (response && response.ready) {
                        this.sandboxReady = true;
                    }
                    resolve();
                });
            });
            
            if (this.sandboxReady) {
                return; // Sandbox is already open
            }
        } catch (e) {
            // Sandbox not open yet
        }
        
        // Try to open sandbox page using chrome.tabs.create
        // This requires tabs permission, but we'll try anyway
        // If it fails, we'll just wait for sandboxReady message
        try {
            if (chrome.tabs && chrome.tabs.create) {
                await chrome.tabs.create({
                    url: sandboxUrl,
                    active: false // Open in background
                });
                // Wait a bit for the page to load
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (e) {
            // If we don't have tabs permission or it fails, that's okay
            // The sandbox page might be opened manually or through other means
            console.log('Could not open sandbox page automatically:', e);
        }
    }

    async waitForSandboxReady(maxWait = 10000) {
        if (this.sandboxReady) {
            return true;
        }
        
        // Try to ensure sandbox is open
        await this.ensureSandboxOpen();
        
        const startTime = Date.now();
        while (!this.sandboxReady && (Date.now() - startTime) < maxWait) {
            // Try to ping sandbox to check if it's ready
            try {
                await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'sandboxPing' }, (response) => {
                        // Check for errors
                        if (chrome.runtime.lastError) {
                            // Sandbox not ready yet, continue waiting
                            resolve();
                            return;
                        }
                        if (response && response.ready) {
                            this.sandboxReady = true;
                        }
                        resolve();
                    });
                });
            } catch (e) {
                // Sandbox not ready yet, continue waiting
            }
            
            if (this.sandboxReady) {
                return true;
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!this.sandboxReady) {
            console.warn('Sandbox not ready after waiting', maxWait, 'ms');
        }
        
        return this.sandboxReady;
    }

    async loadScripts(list) {
        let promises = list.map((name) => this.loadScript(name));
        let results = await Promise.all(promises);
        const filtered = results.filter(x => { if (x && x.result) return x.result; });
        return filtered;
    }

    async sendtoBackground(request) {
        request.target = 'background';
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

    async loadScript(name) {
        const result = await this.sendtoBackground({ action: 'loadScript', params: { name } });
        if (!result || !result.result) {
            // Only log warning for non-builtin scripts
            if (name !== 'builtin_encn_Collins') {
                console.warn('Failed to load script:', name);
            }
        }
        return result || { name, result: null };
    }

    async setScriptsOptions(options) {
        return await this.sendtoBackground({ action: 'setScriptsOptions', params: { options } });
    }

    async findTerm(expression) {
        return await this.sendtoBackground({ action: 'findTerm', params: { expression } });
    }

    callback(data, callbackId) {
        if (!this.agent) {
            return;
        }
        this.agent.postMessage('callback', { data, callbackId });
    }


}

// In Service Worker, use self instead of window
if (typeof self !== 'undefined') {
    self.odhback = new ODHBack();
} else if (typeof window !== 'undefined') {
    window.odhback = new ODHBack();
}