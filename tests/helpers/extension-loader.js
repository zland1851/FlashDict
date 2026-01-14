/**
 * Helper module for loading Chrome extension in Puppeteer
 */

const path = require('path');
const fs = require('fs');

/**
 * Get the extension path
 */
function getExtensionPath() {
    return path.resolve(__dirname, '../../src');
}

/**
 * Verify extension files exist
 */
function verifyExtensionFiles() {
    const extPath = getExtensionPath();
    const manifestPath = path.join(extPath, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest file not found at ${manifestPath}`);
    }
    
    return true;
}

/**
 * Load extension in Puppeteer browser
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Promise<string>} Extension ID
 */
async function loadExtension(browser) {
    verifyExtensionFiles();
    const extPath = getExtensionPath();
    
    // Wait for extension to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get extension ID from background page
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
        target.type() === 'service_worker' && 
        target.url().includes('chrome-extension://')
    );
    
    if (!extensionTarget) {
        throw new Error('Extension service worker not found');
    }
    
    // Extract extension ID from URL
    const extensionUrl = extensionTarget.url();
    const match = extensionUrl.match(/chrome-extension:\/\/([a-z]{32})/);
    
    if (!match) {
        throw new Error('Could not extract extension ID');
    }
    
    return match[1];
}

/**
 * Get extension popup URL
 * @param {string} extensionId - Extension ID
 * @returns {string} Popup URL
 */
function getPopupUrl(extensionId) {
    return `chrome-extension://${extensionId}/bg/popup.html`;
}

/**
 * Get extension options URL
 * @param {string} extensionId - Extension ID
 * @returns {string} Options URL
 */
function getOptionsUrl(extensionId) {
    return `chrome-extension://${extensionId}/bg/options.html`;
}

/**
 * Wait for extension to be ready
 * @param {Object} page - Puppeteer page instance
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForExtensionReady(page, timeout = 5000) {
    try {
        await page.waitForFunction(
            () => typeof window.odhback !== 'undefined',
            { timeout }
        );
    } catch (error) {
        // Extension might not expose odhback globally, which is okay
        console.warn('Extension ready check failed:', error.message);
    }
}

module.exports = {
    getExtensionPath,
    verifyExtensionFiles,
    loadExtension,
    getPopupUrl,
    getOptionsUrl,
    waitForExtensionReady
};
