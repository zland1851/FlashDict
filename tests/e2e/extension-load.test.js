/**
 * E2E tests for extension loading and basic functionality
 */

const puppeteer = require('puppeteer');
const { getExtensionPath, loadExtension, getPopupUrl, getOptionsUrl } = require('../helpers/extension-loader');
const { waitFor, getConsoleErrors } = require('../helpers/test-utils');

describe('Extension Loading', () => {
    let browser;
    let extensionId;
    let page;

    beforeAll(async () => {
        const extPath = getExtensionPath();
        
        try {
            browser = await puppeteer.launch({
                headless: false, // Extensions require non-headless mode
                args: [
                    `--disable-extensions-except=${extPath}`,
                    `--load-extension=${extPath}`,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer'
                ],
                ignoreDefaultArgs: ['--disable-extensions'],
                timeout: 30000
            });

            extensionId = await loadExtension(browser);
            page = await browser.newPage();
        } catch (error) {
            console.error('Failed to launch browser:', error.message);
            console.warn('E2E tests require Chrome browser. Skipping E2E tests.');
            throw error;
        }
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('should load extension successfully', () => {
        expect(extensionId).toBeDefined();
        expect(extensionId.length).toBe(32); // Chrome extension IDs are 32 chars
    });

    test('should open popup page', async () => {
        const popupUrl = getPopupUrl(extensionId);
        const popupPage = await browser.newPage();
        
        try {
            await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' });
            const title = await popupPage.title();
            expect(title).toBeDefined();
        } finally {
            await popupPage.close();
        }
    });

    test('should open options page', async () => {
        const optionsUrl = getOptionsUrl(extensionId);
        const optionsPage = await browser.newPage();
        
        try {
            await optionsPage.goto(optionsUrl, { waitUntil: 'networkidle0' });
            const title = await optionsPage.title();
            expect(title).toBeDefined();
        } finally {
            await optionsPage.close();
        }
    });

    test('should not have critical console errors in popup', async () => {
        const popupUrl = getPopupUrl(extensionId);
        const popupPage = await browser.newPage();
        const errors = [];
        
        popupPage.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        try {
            await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Filter out known non-critical errors
            const criticalErrors = errors.filter(err => 
                !err.includes('favicon') && 
                !err.includes('chrome-extension://')
            );
            
            expect(criticalErrors.length).toBe(0);
        } finally {
            await popupPage.close();
        }
    });
});
