/**
 * Options Compatibility Layer
 * Bridges legacy optionsLoad/optionsSave functions with TypeScript OptionsManager
 *
 * This file provides backward-compatible functions that use the TypeScript
 * OptionsManager under the hood. This allows gradual migration without
 * breaking existing code.
 */

/**
 * Load options using TypeScript OptionsManager
 * @returns {Promise<Object>} Promise resolving to options object
 */
async function optionsLoad() {
    try {
        // Access TypeScript OptionsManager through the bridge
        if (!self.odhback || !self.odhback.tsServices) {
            console.warn('[Options Compat] TypeScript services not yet initialized, using legacy load');
            return legacyOptionsLoad();
        }

        const optionsManager = self.odhback.tsServices.optionsManager;

        // Try to get current options from cache first
        let options = optionsManager.getCurrent();

        // If not in cache, load from storage
        if (!options) {
            options = await optionsManager.load();
        }

        return options;
    } catch (error) {
        console.error('[Options Compat] Error loading options:', error);
        // Fallback to legacy
        return legacyOptionsLoad();
    }
}

/**
 * Save options using TypeScript OptionsManager
 * @param {Object} options - Options object to save
 * @returns {Promise<void>}
 */
async function optionsSave(options) {
    try {
        // Access TypeScript OptionsManager through the bridge
        if (!self.odhback || !self.odhback.tsServices) {
            console.warn('[Options Compat] TypeScript services not yet initialized, using legacy save');
            return legacyOptionsSave(options);
        }

        const optionsManager = self.odhback.tsServices.optionsManager;

        // Use OptionsManager save method
        await optionsManager.save(options);

        return Promise.resolve();
    } catch (error) {
        console.error('[Options Compat] Error saving options:', error);
        // Fallback to legacy
        return legacyOptionsSave(options);
    }
}

/**
 * Legacy options load (fallback)
 * @private
 */
function legacyOptionsLoad() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, (options) => {
            resolve(sanitizeOptions(options));
        });
    });
}

/**
 * Legacy options save (fallback)
 * @private
 */
function legacyOptionsSave(options) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(sanitizeOptions(options), resolve());
    });
}

/**
 * Sanitize and fill options with defaults
 * @private
 */
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

// Make functions globally available for legacy code
if (typeof self !== 'undefined') {
    self.optionsLoad = optionsLoad;
    self.optionsSave = optionsSave;
}
