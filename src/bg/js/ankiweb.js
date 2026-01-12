class Ankiweb {
    constructor() {
        this.profile = null;
        this.version = 'web';
        this.id = '';
        this.password = '';
        // In Manifest V3, blocking webRequest is restricted
        // Only works for extensions installed via ExtensionInstallForcelist
        // For regular extensions, this feature is disabled
        // Commented out to avoid "Unchecked runtime.lastError" warnings
        /*
        chrome.webRequest.onBeforeSendHeaders.addListener(
            this.rewriteHeader.bind(this),
            { urls: ['https://ankiweb.net/account/login', 'https://ankiuser.net/edit/save'] },
            ['requestHeaders', 'blocking', 'extraHeaders']
        );
        */
    }

    async initConnection(options, forceLogout = false) {
        const retryCount = 1;
        this.id = options.id;
        this.password = options.password;
        this.profile = await this.getProfile(retryCount, forceLogout);
        return;
    }

    async addNote(note) {
        return (note && this.profile) ? await this.saveNote(note) : Promise.resolve(null);
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

    // --- Ankiweb API
    async api_connect(forceLogout = false) {
        // In Service Worker, use fetch API instead of jQuery
        try {
            let url = forceLogout ? 'https://ankiweb.net/account/logout' : 'https://ankiuser.net/edit/';
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(result, 'text/html');
            let title = doc.querySelectorAll('h1');
            if (!title.length) return Promise.reject(false);
            
            switch (title[0].innerText) {
                case 'Add':
                    return {
                        action: 'edit',
                        data: await this.parseData(result)
                    };
                case 'Log in':
                    return {
                        action: 'login',
                        data: doc.querySelector('input[name=csrf_token]').getAttribute('value')
                    };
                default:
                    return Promise.reject(false);
            }
        } catch (error) {
            return Promise.reject(false);
        }
    }

    async api_login(id, password, token) {
        // In Service Worker, use fetch API instead of jQuery
        try {
            const formData = new URLSearchParams();
            formData.append('submitted', '1');
            formData.append('username', id);
            formData.append('password', password);
            formData.append('csrf_token', token);
            
            const response = await fetch('https://ankiweb.net/account/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString(),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(result, 'text/html');
            let title = doc.querySelectorAll('h1');
            if (!title.length) return false;
            
            return title[0].innerText == 'Decks';
        } catch (error) {
            return false;
        }
    }

    async api_save(note, profile) {
        // In Service Worker, use fetch API instead of jQuery
        try {
            let fields = [];
            for (const field of profile.modelfieldnames[note.modelName]) {
                let fielddata = note.fields[field] ? note.fields[field] : '';
                fields.push(fielddata);
            }

            let data = [fields, note.tags.join(' ')];
            
            const formData = new URLSearchParams();
            formData.append('csrf_token', profile.token);
            formData.append('data', JSON.stringify(data));
            formData.append('mid', profile.modelids[note.modelName]);
            formData.append('deck', profile.deckids[note.deckName]);
            
            const response = await fetch('https://ankiuser.net/edit/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString(),
                credentials: 'include'
            });
            
            if (!response.ok) {
                return null;
            }
            
            return await response.text();
        } catch (error) {
            return null;
        }
    }

    async getProfile(retryCount = 1, forceLogout = false) {
        try {
            let resp = await this.api_connect(forceLogout);
            if (resp.action == 'edit') {
                return resp.data;
            } else if (retryCount > 0 && resp.action == 'login' && await this.api_login(this.id, this.password, resp.data)) {
                return this.getProfile(retryCount - 1);
            } else {
                return null;
            }
        } catch (err) {
            return null;
        }
    }

    async saveNote(note, retryCount = 1) {
        try {
            let resp = await this.api_save(note, this.profile);
            if (resp != null) {
                return true;
            } else if (retryCount > 0 && (this.profile = await this.getProfile())) {
                return this.saveNote(note, retryCount - 1);
            } else {
                return null;
            }
        } catch (err) {
            return null;
        }
    }

    async getAddInfo(){
        // In Service Worker, use fetch API instead of jQuery
        try {
            const response = await fetch('https://ankiuser.net/edit/getAddInfo', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    async getNotetypeFields(nid){
        // In Service Worker, use fetch API instead of jQuery
        try {
            const response = await fetch(`https://ankiuser.net/edit/getNotetypeFields?ntid=${nid}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    async parseData(response) {
        //return {deck:'default', model:'basic'};
        const token = /anki\.Editor\('(.*)'/.exec(response)[1];
        //const [models, decks, curModelID] = JSON.parse('[' + /new anki\.EditorAddMode\((.*)\);/.exec(response)[1] + ']');
        const Addinfo = await this.getAddInfo();

        let decknames = [];
        let deckids= {};
        let modelnames = [];
        let modelids = {};
        let modelfieldnames = {};

        

        for (const deck of Addinfo.decks) {
            decknames.push(deck.name);
            deckids[deck.name]=deck.id;
        }

        for (const notetype of Addinfo.notetypes) {
            modelnames.push(notetype.name);
            modelids[notetype.name] = notetype.id;

            const NotetypeFields = await this.getNotetypeFields(notetype.id);
            let fieldnames = [];
            for (let field of NotetypeFields.fields) {
                fieldnames.push(field.name);
            }
            modelfieldnames[notetype.name] = fieldnames;
        }
        return {
            decknames,
            deckids,
            modelnames,
            modelids,
            modelfieldnames,
            token
        };
    }

    rewriteHeader(e) {
        const userAgent = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36';

        for (let header of e.requestHeaders) {
            if (header.name.toLowerCase() == 'user-agent') {
                header.value = userAgent;
            }
        }
        if (e.method == 'POST') {
            let origin = 'https://ankiweb.net';
            let referer = 'https://ankiweb.net';
            if (e.url == 'https://ankiweb.net/account/login') {
                origin = 'https://ankiweb.net';
                referer = 'https://ankiweb.net/account/login';
            }
            if (e.url == 'https://ankiuser.net/edit/save') {
                origin = 'https://ankiuser.net';
                referer = 'https://ankiuser.net/edit/';
            }
            let hasOrigin = false;
            let hasReferer = false;
            for (let header of e.requestHeaders) {
                if (header.name.toLowerCase() == 'origin') {
                    header.value = origin;
                    hasOrigin = true;
                }
                if (header.name.toLowerCase() == 'referer') {
                    header.value = referer;
                    hasReferer = true;
                }
            }
            if (!hasOrigin)
                e.requestHeaders.push({
                    name: 'origin',
                    value: origin
                });
            if (!hasReferer)
                e.requestHeaders.push({
                    name: 'referer',
                    value: referer
                });
        }

        return {
            requestHeaders: e.requestHeaders
        };
    }
}