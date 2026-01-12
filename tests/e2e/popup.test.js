/**
 * E2E tests for extension popup functionality
 */

const puppeteer = require('puppeteer');
const { getExtensionPath, loadExtension, getPopupUrl } = require('../helpers/extension-loader');
const { waitFor } = require('../helpers/test-utils');

describe('Popup Functionality', () => {
    let browser;
    let extensionId;
    let popupPage;

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
            const popupUrl = getPopupUrl(extensionId);
            popupPage = await browser.newPage();
            await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' });
        } catch (error) {
            console.error('Failed to launch browser:', error.message);
            console.warn('E2E tests require Chrome browser. Skipping E2E tests.');
            throw error;
        }
    });

    afterAll(async () => {
        if (popupPage) await popupPage.close();
        if (browser) await browser.close();
    });

    test('should display popup UI elements', async () => {
        // Wait for jQuery to load
        await waitFor(() => 
            popupPage.evaluate(() => typeof $ !== 'undefined')
        );

        const hasContent = await popupPage.evaluate(() => {
            return document.body.innerHTML.length > 0;
        });

        expect(hasContent).toBe(true);
    });

    test('should load dictionary list', async () => {
        await waitFor(() => 
            popupPage.evaluate(() => typeof $ !== 'undefined')
        );

        // Wait a bit for dictionaries to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        const dictListExists = await popupPage.evaluate(() => {
            // Check if dictionary dropdown exists
            const selects = document.querySelectorAll('select');
            return selects.length > 0;
        });

        expect(dictListExists).toBe(true);
    });

    test('should have options link', async () => {
        await waitFor(() => 
            popupPage.evaluate(() => typeof $ !== 'undefined')
        );

        const hasOptionsLink = await popupPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links.some(link => 
                link.href.includes('options.html') || 
                link.textContent.toLowerCase().includes('option')
            );
        });

        expect(hasOptionsLink).toBe(true);
    });
});
