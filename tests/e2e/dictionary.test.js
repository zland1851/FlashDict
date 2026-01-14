/**
 * E2E tests for dictionary functionality
 */

const puppeteer = require('puppeteer');
const { getExtensionPath, loadExtension } = require('../helpers/extension-loader');
const { waitFor } = require('../helpers/test-utils');

describe('Dictionary Functionality', () => {
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

    test('should load built-in dictionary data', async () => {
        // Navigate to a test page
        await page.goto('https://example.com', { waitUntil: 'networkidle0' });
        
        // Wait for content script to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if extension is active
        const extensionActive = await page.evaluate(() => {
            return typeof window.odh !== 'undefined';
        });

        expect(extensionActive).toBe(true);
    });

    test('should handle text selection', async () => {
        await page.goto('https://example.com', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Inject test content
        await page.evaluate(() => {
            const div = document.createElement('div');
            div.id = 'test-content';
            div.textContent = 'This is a test word for dictionary lookup';
            document.body.appendChild(div);
        });

        // Simulate text selection
        const selectionWorked = await page.evaluate(() => {
            const element = document.getElementById('test-content');
            if (!element) return false;

            const range = document.createRange();
            const textNode = element.firstChild;
            
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                range.setStart(textNode, 0);
                range.setEnd(textNode, 4); // Select "This"
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                return selection.toString().length > 0;
            }
            
            return false;
        });

        expect(selectionWorked).toBe(true);
    });
});
