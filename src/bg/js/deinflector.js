class Deinflector {
    constructor() {
        this.path = 'bg/data/wordforms.json';
        this.wordforms = null;
    }

    async loadData() {
        try {
            this.wordforms = await Deinflector.loadData(this.path);
        } catch (error) {
            // Data file not found - this is expected if not installed from Chrome Web Store
            // Use empty object to allow extension to continue working
            console.warn('Deinflector data file not found. Word inflection feature will be disabled. To enable it, extract wordforms.json from Chrome Web Store version.');
            this.wordforms = {};
        }
    }

    deinflect(term) {
        if (!this.wordforms) {
            return null;
        }
        return this.wordforms[term] ? this.wordforms[term] : null;
    }

    static async loadData(path) {
        // In Service Worker, use fetch API instead of jQuery
        try {
            const url = chrome.runtime.getURL(path);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            // Re-throw to let caller handle gracefully
            throw error;
        }
    }
    
}
