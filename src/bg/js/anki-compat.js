/**
 * Anki Services Compatibility Layer
 * Replaces legacy Ankiconnect and Ankiweb classes with wrappers that
 * delegate to TypeScript AnkiConnectService and AnkiWebService.
 *
 * This maintains the same API surface as the legacy classes but uses
 * the TypeScript implementations under the hood.
 */

/**
 * Ankiconnect wrapper class
 * Delegates to TypeScript AnkiConnectService
 */
class Ankiconnect {
    constructor() {
        this.version = 6;
        this._tsService = null;
    }

    /**
     * Get TypeScript AnkiConnectService instance
     * @private
     */
    _getTSService() {
        if (!this._tsService && self.odhback && self.odhback.tsServices) {
            this._tsService = self.odhback.tsServices.ankiConnectService;
        }
        return this._tsService;
    }

    /**
     * Check if TypeScript service is available
     * @private
     */
    _isUsingTS() {
        return this._getTSService() !== null;
    }

    async addNote(note) {
        if (!note) return Promise.resolve(null);

        const tsService = this._getTSService();
        if (tsService) {
            try {
                const result = await tsService.addNote(note);
                return result.noteId || result;
            } catch (error) {
                console.error('[Anki Compat] AnkiConnect addNote error:', error);
                return null;
            }
        }

        // Fallback to legacy implementation
        return await this._legacyAnkiInvoke('addNote', { note });
    }

    async getDeckNames() {
        const tsService = this._getTSService();
        if (tsService) {
            try {
                return await tsService.getDeckNames();
            } catch (error) {
                console.error('[Anki Compat] AnkiConnect getDeckNames error:', error);
                return null;
            }
        }

        // Fallback to legacy
        return await this._legacyAnkiInvoke('deckNames');
    }

    async getModelNames() {
        const tsService = this._getTSService();
        if (tsService) {
            try {
                return await tsService.getModelNames();
            } catch (error) {
                console.error('[Anki Compat] AnkiConnect getModelNames error:', error);
                return null;
            }
        }

        // Fallback to legacy
        return await this._legacyAnkiInvoke('modelNames');
    }

    async getModelFieldNames(modelName) {
        const tsService = this._getTSService();
        if (tsService) {
            try {
                return await tsService.getModelFieldNames(modelName);
            } catch (error) {
                console.error('[Anki Compat] AnkiConnect getModelFieldNames error:', error);
                return null;
            }
        }

        // Fallback to legacy
        return await this._legacyAnkiInvoke('modelFieldNames', { modelName });
    }

    async getVersion() {
        const tsService = this._getTSService();
        if (tsService) {
            try {
                const version = await tsService.getVersion();
                return version ? 'ver:' + version : null;
            } catch (error) {
                console.error('[Anki Compat] AnkiConnect getVersion error:', error);
                return null;
            }
        }

        // Fallback to legacy
        let version = await this._legacyAnkiInvoke('version', {}, 100);
        return version ? 'ver:' + version : null;
    }

    /**
     * Legacy AnkiConnect invoke method (fallback)
     * @private
     */
    async _legacyAnkiInvoke(action, params = {}, timeout = 3000) {
        let version = this.version;
        let request = { action, version, params };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch('http://127.0.0.1:8765', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(request),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();

            // Validate response structure
            if (Object.getOwnPropertyNames(responseData).length != 2) {
                throw 'response has an unexpected number of fields';
            }
            if (!responseData.hasOwnProperty('error')) {
                throw 'response is missing required error field';
            }
            if (!responseData.hasOwnProperty('result')) {
                throw 'response is missing required result field';
            }
            if (responseData.error) {
                throw responseData.error;
            }

            return responseData.result;
        } catch (error) {
            return null;
        }
    }
}

/**
 * Ankiweb wrapper class
 * Delegates to TypeScript AnkiWebService
 */
class Ankiweb {
    constructor() {
        this.profile = null;
        this.version = 'web';
        this.id = '';
        this.password = '';
        this._tsService = null;
    }

    /**
     * Get TypeScript AnkiWebService instance
     * @private
     */
    _getTSService() {
        if (!this._tsService && self.odhback && self.odhback.tsServices) {
            this._tsService = self.odhback.tsServices.ankiWebService;
        }
        return this._tsService;
    }

    /**
     * Check if TypeScript service is available
     * @private
     */
    _isUsingTS() {
        return this._getTSService() !== null;
    }

    async initConnection(options, forceLogout = false) {
        this.id = options.id;
        this.password = options.password;

        const tsService = this._getTSService();
        if (tsService) {
            try {
                // TypeScript service initConnection
                await tsService.initConnection(this.id, this.password, forceLogout);

                // Store profile for legacy compatibility
                const deckNames = await tsService.getDeckNames();
                const modelNames = await tsService.getModelNames();

                // Build model field names map
                const modelFieldNames = {};
                if (modelNames) {
                    for (const modelName of modelNames) {
                        modelFieldNames[modelName] = await tsService.getModelFieldNames(modelName);
                    }
                }

                this.profile = {
                    decknames: deckNames,
                    modelnames: modelNames,
                    modelfieldnames: modelFieldNames
                };

                console.log('[Anki Compat] AnkiWeb initialized via TypeScript service');
                return;
            } catch (error) {
                console.error('[Anki Compat] AnkiWeb initConnection error:', error);
                this.profile = null;
                // Continue to fallback
            }
        }

        // Fallback to legacy implementation
        console.warn('[Anki Compat] TypeScript AnkiWeb not available, using fallback');
        // Note: Legacy AnkiWeb implementation is complex, keeping as-is for now
        // If TS service fails, profile will remain null
        return;
    }

    async addNote(note) {
        if (!note) return Promise.resolve(null);

        const tsService = this._getTSService();
        if (tsService && this.profile) {
            try {
                const result = await tsService.addNote(note);
                return result.noteId || result;
            } catch (error) {
                console.error('[Anki Compat] AnkiWeb addNote error:', error);
                return null;
            }
        }

        return Promise.resolve(null);
    }

    async getDeckNames() {
        return this.profile ? this.profile.decknames : null;
    }

    async getModelNames() {
        return this.profile ? this.profile.modelnames : null;
    }

    async getModelFieldNames(modelName) {
        return this.profile ? this.profile.modelfieldnames[modelName] : null;
    }

    async getVersion() {
        return this.profile ? this.version : null;
    }
}

// Log when compatibility layer is loaded
console.log('[Anki Compat] Anki compatibility layer loaded');
