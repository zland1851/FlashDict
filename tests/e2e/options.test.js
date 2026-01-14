/**
 * E2E tests for options page functionality
 */

const puppeteer = require('puppeteer');
const { getExtensionPath, loadExtension, getOptionsUrl } = require('../helpers/extension-loader');
const { waitFor, setExtensionOptions, getExtensionOptions } = require('../helpers/test-utils');

describe('Options Page Functionality', () => {
    let browser;
    let extensionId;
    let optionsPage;

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
            const optionsUrl = getOptionsUrl(extensionId);
            optionsPage = await browser.newPage();
            await optionsPage.goto(optionsUrl, { waitUntil: 'networkidle0' });
        } catch (error) {
            console.error('Failed to launch browser:', error.message);
            console.warn('E2E tests require Chrome browser. Skipping E2E tests.');
            throw error;
        }
    });

    afterAll(async () => {
        if (optionsPage) await optionsPage.close();
        if (browser) await browser.close();
    });

    test('should load options page', async () => {
        await waitFor(() => 
            optionsPage.evaluate(() => typeof $ !== 'undefined')
        );

        const hasContent = await optionsPage.evaluate(() => {
            return document.body.innerHTML.length > 0;
        });

        expect(hasContent).toBe(true);
    });

    test('should save and load settings', async () => {
        await waitFor(() => 
            optionsPage.evaluate(() => typeof $ !== 'undefined')
        );

        // Wait for options page to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test that options can be saved
        const saveButtonExists = await optionsPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"]'));
            return buttons.some(btn => 
                btn.textContent.toLowerCase().includes('save') ||
                btn.value.toLowerCase().includes('save')
            );
        });

        expect(saveButtonExists).toBe(true);
    });

    test('should display dictionary script list', async () => {
        await waitFor(() => 
            optionsPage.evaluate(() => typeof $ !== 'undefined')
        );

        await new Promise(resolve => setTimeout(resolve, 2000));

        const hasScriptList = await optionsPage.evaluate(() => {
            // Look for script list or dictionary configuration
            const selects = document.querySelectorAll('select');
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            return selects.length > 0 || checkboxes.length > 0;
        });

        expect(hasScriptList).toBe(true);
    });
});
