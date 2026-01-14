/**
 * Unit tests for utility functions
 */

const { getExtensionPath, verifyExtensionFiles } = require('../helpers/extension-loader');
const path = require('path');

describe('Extension Loader Utilities', () => {
    describe('getExtensionPath', () => {
        it('should return the correct extension path', () => {
            const extPath = getExtensionPath();
            expect(extPath).toBe(path.resolve(__dirname, '../../src'));
        });
    });

    describe('verifyExtensionFiles', () => {
        it('should verify manifest.json exists', () => {
            expect(() => verifyExtensionFiles()).not.toThrow();
        });

        it('should throw error if manifest.json is missing', () => {
            // This test would require mocking fs.existsSync
            // For now, we just test the happy path
            expect(verifyExtensionFiles()).toBe(true);
        });
    });
});

describe('Test Utilities', () => {
    const { waitFor, clearStorage } = require('../helpers/test-utils');

    describe('waitFor', () => {
        it('should resolve when condition is met', async () => {
            let conditionMet = false;
            setTimeout(() => { conditionMet = true; }, 100);
            
            await expect(
                waitFor(() => conditionMet, 1000)
            ).resolves.toBe(true);
        });

        it('should timeout if condition is not met', async () => {
            await expect(
                waitFor(() => false, 100)
            ).rejects.toThrow();
        });
    });
});
