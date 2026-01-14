const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Small icons use simplified logo, large icons use full logo
const iconConfigs = [
    { size: 16, svg: 'logo-small.svg' },
    { size: 19, svg: 'logo-small.svg' },
    { size: 38, svg: 'logo-small.svg' },
    { size: 48, svg: 'logo.svg' },
    { size: 128, svg: 'logo.svg' }
];

async function convertSvgToPng() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    for (const config of iconConfigs) {
        const svgPath = path.join(__dirname, '../src/img', config.svg);

        if (!fs.existsSync(svgPath)) {
            console.error(`SVG file not found: ${svgPath}`);
            continue;
        }

        const svgContent = fs.readFileSync(svgPath, 'utf8');

        // Set viewport to exact size
        await page.setViewport({ width: config.size, height: config.size });

        // Create HTML with SVG
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; }
                    body { width: ${config.size}px; height: ${config.size}px; }
                    svg { width: ${config.size}px; height: ${config.size}px; display: block; }
                </style>
            </head>
            <body>${svgContent}</body>
            </html>
        `;

        await page.setContent(html);

        const outputPath = path.join(__dirname, '../src/img', `icon${config.size}.png`);
        await page.screenshot({
            path: outputPath,
            omitBackground: false,
            type: 'png'
        });

        console.log(`Created: icon${config.size}.png (from ${config.svg})`);
    }

    await browser.close();
    console.log('\nAll icons generated successfully!');
}

convertSvgToPng().catch(console.error);
