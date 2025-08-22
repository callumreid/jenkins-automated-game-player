const fs = require('fs');
const path = require('path');

class Logger {
    constructor(config) {
        this.config = config.logging;
        this.runId = this.generateRunId();
        this.logDir = path.join(process.cwd(), 'logs');
        this.screenshotDir = path.join(process.cwd(), 'screenshots', this.runId);
        this.logFile = path.join(this.logDir, `${this.runId}.log`);
        this.networkLog = path.join(this.logDir, `${this.runId}-network.json`);
        this.consoleLog = path.join(this.logDir, `${this.runId}-console.json`);
        
        this.networkData = [];
        this.consoleData = [];
        
        this.ensureDirectories();
        this.initializeLog();
    }
    
    generateRunId() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    }
    
    ensureDirectories() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }
    
    initializeLog() {
        const header = `
=== Jenkins Automated Game Player - Run ${this.runId} ===
Started: ${new Date().toISOString()}
Configuration: ${JSON.stringify(this.config, null, 2)}
========================================

`;
        fs.writeFileSync(this.logFile, header);
    }
    
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        const fullEntry = data ? `${logEntry}\nData: ${JSON.stringify(data, null, 2)}\n` : `${logEntry}\n`;
        
        console.log(logEntry);
        fs.appendFileSync(this.logFile, fullEntry);
    }
    
    info(message, data) {
        this.log('info', message, data);
    }
    
    warn(message, data) {
        this.log('warn', message, data);
    }
    
    error(message, data) {
        this.log('error', message, data);
    }
    
    success(message, data) {
        this.log('success', message, data);
    }
    
    async screenshot(page, name, description) {
        try {
            const screenshotPath = path.join(this.screenshotDir, `${name}.png`);
            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            this.info(`Screenshot captured: ${name}`, { path: screenshotPath, description });
            return screenshotPath;
        } catch (error) {
            this.error(`Failed to capture screenshot: ${name}`, { error: error.message });
            return null;
        }
    }
    
    logNetworkResponse(response) {
        if (!this.config.captureNetwork) return;
        
        const networkEntry = {
            timestamp: new Date().toISOString(),
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            method: response.request().method()
        };
        
        this.networkData.push(networkEntry);
        this.info(`Network request: ${networkEntry.method} ${networkEntry.url} - ${networkEntry.status}`);
    }
    
    logConsoleMessage(msg) {
        if (!this.config.captureConsole) return;
        
        const consoleEntry = {
            timestamp: new Date().toISOString(),
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        };
        
        this.consoleData.push(consoleEntry);
        this.info(`Console ${consoleEntry.type}: ${consoleEntry.text}`);
    }
    
    finalize() {
        try {
            if (this.config.captureNetwork && this.networkData.length > 0) {
                fs.writeFileSync(this.networkLog, JSON.stringify(this.networkData, null, 2));
                this.info(`Network data saved: ${this.networkData.length} requests`);
            }
            
            if (this.config.captureConsole && this.consoleData.length > 0) {
                fs.writeFileSync(this.consoleLog, JSON.stringify(this.consoleData, null, 2));
                this.info(`Console data saved: ${this.consoleData.length} messages`);
            }
            
            const footer = `\n========================================\nCompleted: ${new Date().toISOString()}\n`;
            fs.appendFileSync(this.logFile, footer);
            
            this.cleanupOldLogs();
        } catch (error) {
            console.error('Error finalizing logs:', error);
        }
    }
    
    cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retainLogs);
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                if (stats.mtime < cutoffDate && file.endsWith('.log')) {
                    fs.unlinkSync(filePath);
                    this.info(`Cleaned up old log file: ${file}`);
                }
            });
        } catch (error) {
            this.warn('Error cleaning up old logs', { error: error.message });
        }
    }
}

module.exports = Logger;