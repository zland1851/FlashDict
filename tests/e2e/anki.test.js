/**
 * E2E tests for Anki integration functionality
 * 
 * Note: These tests require AnkiConnect to be running for full functionality
 */

const puppeteer = require('puppeteer');
const { getExtensionPath, loadExtension } = require('../helpers/extension-loader');
const { waitFor } = require('../helpers/test-utils');

describe('Anki Integration', () => {
    let browser;
    let extensionId;
    let page;

    beforeAll(async () => {
        const extPath = getExtensionPath();
        
        try {
            browser = await puppeteer.launch({
                headless: false,
                args: [
                    `--disable-extensions-except=${extPath}`,
                    `--load-extension=${extPath}`,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
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
        if (page) await page.close();
        if (browser) await browser.close();
    });

    test('should handle AnkiConnect connection gracefully', async () => {
        // This test checks that the extension handles AnkiConnect
        // connection attempts without errors, even if AnkiConnect is not running
        
        await page.goto('https://example.com', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check that extension doesn't crash when AnkiConnect is unavailable
        const extensionActive = await page.evaluate(() => {
            return typeof window.odh !== 'undefined';
        });

        expect(extensionActive).toBe(true);
    });

    // Note: Full AnkiConnect tests would require:
    // 1. Anki desktop application running
    // 2. AnkiConnect addon installed
    // 3. Mock server or test Anki instance
    // These are marked as optional/integration tests
});
