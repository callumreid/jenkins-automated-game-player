#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log(`
🤖 Jenkins Automated Game Player Setup
=====================================

This script will help you configure and test your automated game player.
`);

async function checkEnvironment() {
    console.log('Checking environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`✓ Node.js version: ${nodeVersion}`);
    
    // Check if dependencies are installed
    try {
        require('puppeteer');
        require('node-cron');
        console.log('✓ Dependencies installed');
    } catch (error) {
        console.log('❌ Dependencies not installed. Run: npm install');
        process.exit(1);
    }
    
    // Check directory structure
    const requiredDirs = ['config', 'src', 'logs', 'screenshots'];
    requiredDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            console.log(`✓ Directory ${dir}/ exists`);
        } else {
            console.log(`❌ Directory ${dir}/ missing`);
            fs.mkdirSync(dir, { recursive: true });
            console.log(`  Created ${dir}/ directory`);
        }
    });
    
    // Check config file
    const configPath = path.join('config', 'config.json');
    if (fs.existsSync(configPath)) {
        console.log('✓ Configuration file exists');
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log(`  Game URL: ${config.game.url}`);
            console.log(`  Daily run time: ${config.schedule.dailyRunTime}`);
            console.log(`  Browser headless: ${config.browser.headless}`);
        } catch (error) {
            console.log('❌ Configuration file is invalid JSON');
            process.exit(1);
        }
    } else {
        console.log('❌ Configuration file missing');
        process.exit(1);
    }
    
    console.log('\n✅ Environment check completed successfully!\n');
}

async function testBrowser() {
    console.log('Testing browser launch...');
    
    try {
        const puppeteer = require('puppeteer');
        
        console.log('  Launching browser...');
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        console.log('  Creating page...');
        const page = await browser.newPage();
        
        console.log('  Testing navigation...');
        await page.goto('https://example.com', { timeout: 10000 });
        
        console.log('  Cleaning up...');
        await browser.close();
        
        console.log('✅ Browser test successful!\n');
    } catch (error) {
        console.log(`❌ Browser test failed: ${error.message}`);
        console.log('   This might be due to missing Chrome/Chromium or system dependencies.');
        console.log('   On Linux, try: sudo apt-get install chromium-browser');
        console.log('   On macOS, Chrome should be installed automatically with Puppeteer.\n');
    }
}

async function showQuickStart() {
    console.log(`Quick Start Guide:
==================

1. Test the game manually first:
   npm run play

2. Check the output:
   ls -la logs/
   ls -la screenshots/

3. If successful, start the scheduler:
   npm start

4. Monitor the logs:
   tail -f logs/*.log

5. Check status anytime:
   node index.js --status

Configuration Tips:
- Edit config/config.json to customize settings
- Set "headless": false to see the browser in action
- Adjust "dailyRunTime" for your preferred schedule
- Change "strategy" to "pattern", "left", or "right" for deterministic choices

Need help? Check README.md for full documentation.
`);
}

async function main() {
    try {
        await checkEnvironment();
        await testBrowser();
        await showQuickStart();
        
        console.log('🎉 Setup completed successfully!\n');
        console.log('Ready to run: npm run play');
    } catch (error) {
        console.error('Setup failed:', error.message);
        process.exit(1);
    }
}

main();