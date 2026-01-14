/**
 * Test utilities for ODH extension tests
 */

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns a boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Get console errors from page
 * @param {Object} page - Puppeteer page instance
 * @returns {Array} Array of console errors
 */
async function getConsoleErrors(page) {
    const errors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push({
                text: msg.text(),
                location: msg.location()
            });
        }
    });
    
    return errors;
}

/**
 * Clear browser storage
 * @param {Object} page - Puppeteer page instance
 */
async function clearStorage(page) {
    await page.evaluate(() => {
        chrome.storage.local.clear();
        chrome.storage.sync.clear();
    });
}

/**
 * Set extension options
 * @param {Object} page - Puppeteer page instance
 * @param {Object} options - Options to set
 */
async function setExtensionOptions(page, options) {
    await page.evaluate((opts) => {
        return new Promise((resolve) => {
            chrome.storage.local.set(opts, resolve);
        });
    }, options);
}

/**
 * Get extension options
 * @param {Object} page - Puppeteer page instance
 * @returns {Object} Extension options
 */
async function getExtensionOptions(page) {
    return await page.evaluate(() => {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, resolve);
        });
    });
}

/**
 * Simulate text selection
 * @param {Object} page - Puppeteer page instance
 * @param {string} selector - CSS selector for element
 * @param {number} startOffset - Start offset
 * @param {number} endOffset - End offset
 */
async function simulateTextSelection(page, selector, startOffset, endOffset) {
    await page.evaluate((sel, start, end) => {
        const element = document.querySelector(sel);
        if (!element) return;
        
        const range = document.createRange();
        const textNode = element.firstChild;
        
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            range.setStart(textNode, start);
            range.setEnd(textNode, end);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Trigger selection event
            const event = new Event('mouseup', { bubbles: true });
            element.dispatchEvent(event);
        }
    }, selector, startOffset, endOffset);
}

module.exports = {
    waitFor,
    getConsoleErrors,
    clearStorage,
    setExtensionOptions,
    getExtensionOptions,
    simulateTextSelection
};
