#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Scheduler = require('./src/scheduler');
const GamePlayer = require('./src/gamePlayer');

// Load configuration
const configPath = path.join(__dirname, 'config', 'config.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load configuration:', error.message);
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isManual = args.includes('--manual') || args.includes('-m');
const isStatus = args.includes('--status') || args.includes('-s');
const isHelp = args.includes('--help') || args.includes('-h');

function showHelp() {
    console.log(`
Jenkins Automated Game Player
============================

Usage: node index.js [options]

Options:
  --manual, -m      Run the game immediately (manual trigger)
  --status, -s      Show current status and configuration
  --help, -h        Show this help message

Default behavior (no flags):
  Starts the scheduler to run the game daily at the configured time

Configuration:
  Edit config/config.json to customize game settings, schedule, and logging options.

Examples:
  npm start                    # Start scheduler for daily runs
  npm run play                 # Run game manually (equivalent to --manual)
  node index.js --status       # Show current status
    `);
}

async function showStatus() {
    console.log(`
Jenkins Automated Game Player - Status
======================================

Configuration:
- Game URL: ${config.game.url}
- Daily run time: ${config.schedule.dailyRunTime}
- Scheduling enabled: ${config.schedule.enabled}
- Browser headless: ${config.browser.headless}
- Max scenarios: ${config.game.maxScenarios}
- Choice strategy: ${config.choices.strategy}

Logging:
- Screenshot quality: ${config.logging.screenshotQuality}%
- Capture network: ${config.logging.captureNetwork}
- Capture console: ${config.logging.captureConsole}
- Retain logs: ${config.logging.retainLogs} days

Directories:
- Logs: ${path.join(__dirname, 'logs')}
- Screenshots: ${path.join(__dirname, 'screenshots')}
- Config: ${path.join(__dirname, 'config')}
    `);
    
    // Show recent log files
    const logsDir = path.join(__dirname, 'logs');
    if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir)
            .filter(file => file.endsWith('.log'))
            .sort()
            .slice(-5);
        
        if (logFiles.length > 0) {
            console.log('Recent log files:');
            logFiles.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                console.log(`- ${file} (${stats.mtime.toISOString().split('T')[0]})`);
            });
        } else {
            console.log('No log files found yet.');
        }
    }
}

async function runManual() {
    console.log('Running game manually...');
    const gamePlayer = new GamePlayer(config);
    const success = await gamePlayer.playGame();
    
    if (success) {
        console.log('\n✅ Manual game run completed successfully!');
        console.log('Check the logs/ and screenshots/ directories for detailed output.');
    } else {
        console.log('\n❌ Manual game run completed with errors.');
        console.log('Check the logs/ directory for error details.');
    }
    
    process.exit(success ? 0 : 1);
}

async function startScheduler() {
    console.log('Starting Jenkins Automated Game Player...');
    
    const scheduler = new Scheduler(config);
    
    if (!config.schedule.enabled) {
        console.log('\n⚠️  Scheduling is disabled in configuration.');
        console.log('To enable scheduling, set "schedule.enabled" to true in config/config.json');
        console.log('Or run manually with: npm run play');
        process.exit(0);
    }
    
    const started = scheduler.start();
    
    if (started) {
        console.log('\n🚀 Scheduler started successfully!');
        console.log(`Next run scheduled for: ${config.schedule.dailyRunTime} daily`);
        console.log('Press Ctrl+C to stop the scheduler\n');
        
        // Keep the process alive
        process.on('SIGINT', () => {
            console.log('\nStopping scheduler...');
            scheduler.stop();
            console.log('Goodbye!');
            process.exit(0);
        });
        
        // Keep process alive
        setInterval(() => {}, 1000);
    } else {
        console.log('\n❌ Failed to start scheduler');
        process.exit(1);
    }
}

// Main execution
async function main() {
    if (isHelp) {
        showHelp();
    } else if (isStatus) {
        await showStatus();
    } else if (isManual) {
        await runManual();
    } else {
        await startScheduler();
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function
main().catch((error) => {
    console.error('Main execution failed:', error);
    process.exit(1);
});