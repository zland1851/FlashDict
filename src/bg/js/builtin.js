class Builtin {
    constructor() {
        this.dicts = {};
    }

    async loadData() {
        try {
            this.dicts['collins'] = await Builtin.loadData('bg/data/collins.json');
        } catch (error) {
            // Data file not found - this is expected if not installed from Chrome Web Store
            // Use empty object to allow extension to continue working
            console.warn('Builtin dictionary data file not found. Builtin Collins dictionary will be disabled. To enable it, extract collins.json from Chrome Web Store version.');
            this.dicts['collins'] = {};
        }
    }

    findTerm(dictname, term) {
        const dict = this.dicts[dictname];
        if (!dict) {
            return null;
        }
        return dict.hasOwnProperty(term) ? JSON.stringify(dict[term]) : null;
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