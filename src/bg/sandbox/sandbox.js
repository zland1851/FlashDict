/* global api */
class Sandbox {
    constructor() {
        this.dicts = {};
        this.current = null;
        
        // Listen for messages from parent window (offscreen document)
        window.addEventListener('message', e => this.onBackendMessage(e));
    }

    onBackendMessage(e) {
        const { action, params } = e.data;
        const method = this['backend_' + action];
        if (typeof(method) === 'function') {
            method.call(this, params);
        }
    }

    buildScriptURL(name) {
        let gitbase = 'https://raw.githubusercontent.com/ninja33/ODH/master/src/dict/';
        let url = name;

        if (url.indexOf('://') == -1) {
            url = '/dict/' + url;
        } else {
            //build remote script url with gitbase(https://) if prefix lib:// existing.
            url = (url.indexOf('lib://') != -1) ? gitbase + url.replace('lib://', '') : url;            
        }

        //add .js suffix if missing.
        url = (url.indexOf('.js') == -1) ? url + '.js' : url;
        return url;
    }

    async backend_loadScript(params) {
        let { name, callbackId } = params;

        // Input validation: ensure name is a valid string
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            api.callback({ name, result: null }, callbackId);
            return;
        }

        let scripttext = await api.fetch(this.buildScriptURL(name));
        if (!scripttext) {
            api.callback({ name, result: null }, callbackId);
            return;
        }

        // Basic validation: ensure scripttext is a string and not empty
        if (typeof scripttext !== 'string' || scripttext.trim().length === 0) {
            api.callback({ name, result: null }, callbackId);
            return;
        }

        try {
            // Note: eval() is used here because we're in a sandboxed environment
            // The sandbox page is isolated and can only communicate via postMessage
            // This is the intended design for executing user-defined dictionary scripts
            let SCRIPT = eval(`(${scripttext})`);
            
            // Validate that the result is a function
            if (!SCRIPT || typeof SCRIPT !== 'function') {
                api.callback({ name, result: null }, callbackId);
                return;
            }

            // Validate that the function has a name property
            if (!SCRIPT.name) {
                api.callback({ name, result: null }, callbackId);
                return;
            }

            let script = new SCRIPT();
            this.dicts[SCRIPT.name] = script;
            let displayname = typeof(script.displayName) === 'function' ? await script.displayName() : SCRIPT.name;
            api.callback({ name, result: { objectname: SCRIPT.name, displayname } }, callbackId);
        } catch (err) {
            // Log error for debugging but don't expose to user
            console.error('Error loading script:', name, err);
            api.callback({ name, result: null }, callbackId);
            return;
        }
    }

    backend_setScriptsOptions(params) {
        let { options, callbackId } = params;

        for (const dictionary of Object.values(this.dicts)) {
            if (typeof(dictionary.setOptions) === 'function')
                dictionary.setOptions(options);
        }

        let selected = options.dictSelected;
        if (this.dicts[selected]) {
            this.current = selected;
            api.callback(selected, callbackId);
            return;
        }
        api.callback(null, callbackId);
    }

    async backend_findTerm(params) {
        let { expression, callbackId } = params;

        if (this.dicts[this.current] && typeof(this.dicts[this.current].findTerm) === 'function') {
            let notes = await this.dicts[this.current].findTerm(expression);
            api.callback(notes, callbackId);
            return;
        }
        api.callback(null, callbackId);
    }
}

window.sandbox = new Sandbox();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize backend
    api.initBackend();
}, false);