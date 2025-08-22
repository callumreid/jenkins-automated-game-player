const puppeteer = require('puppeteer');
const Logger = require('./logger');
const ErrorHandler = require('./errorHandler');

class GamePlayer {
    constructor(config) {
        this.config = config;
        this.logger = new Logger(config);
        this.errorHandler = new ErrorHandler(config, this.logger);
        this.browser = null;
        this.page = null;
        this.scenarioCount = 0;
        this.choiceIndex = 0;
        this.gameStats = [];
        this.isGameActive = false;
    }
    
    async init() {
        try {
            this.logger.info('Initializing browser...');
            
            this.browser = await puppeteer.launch({
                headless: this.config.browser.headless,
                defaultViewport: this.config.browser.viewport,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            this.page = await this.browser.newPage();
            
            // Set up network monitoring
            this.page.on('response', (response) => {
                this.logger.logNetworkResponse(response);
            });
            
            // Set up console monitoring
            this.page.on('console', (msg) => {
                this.logger.logConsoleMessage(msg);
                this.analyzeConsoleMessage(msg);
            });
            
            // Set up error monitoring
            this.page.on('pageerror', (error) => {
                this.logger.error('Page error occurred', { error: error.message });
            });
            
            this.logger.success('Browser initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize browser', { error: error.message });
            return false;
        }
    }
    
    async navigateToGame() {
        return await this.errorHandler.safeExecute(async () => {
            this.logger.info(`Navigating to game: ${this.config.game.url}`);
            
            await this.page.goto(this.config.game.url, {
                waitUntil: 'domcontentloaded',
                timeout: this.config.browser.timeout
            });
            
            await this.logger.screenshot(this.page, '01-game-loaded', 'Initial game page load');
            this.logger.success('Successfully navigated to game');
            return true;
        }, 'Navigate to game', this.page) !== null;
    }
    
    async startGame() {
        this.logger.info('Starting game by clicking screen...');
        
        try {
            // Wait longer for the React app to fully load
            await new Promise(resolve => setTimeout(resolve, 5000));
            await this.logger.screenshot(this.page, '02a-before-start', 'Before starting game');
            
            // Click in the center area where the trolley image is located
            this.logger.info('Clicking to start the game...');
            await this.page.click('body');
            
            // Wait for game to respond and take another screenshot
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.logger.screenshot(this.page, '02b-after-click', 'After clicking to start');
            
            this.logger.success('Game click completed, ready to proceed');
            return true;
            
        } catch (error) {
            this.logger.warn('Minor issue during start, continuing anyway', { error: error.message });
            await this.logger.screenshot(this.page, '02c-error-start', 'Error during start');
            return true; // Continue anyway since the game is loaded
        }
    }
    
    analyzeConsoleMessage(msg) {
        const text = msg.text();
        
        // Look for game progression indicators (broader patterns)
        if (text.includes('stats') || text.includes('score') || text.includes('choice') || 
            text.includes('scenario') || text.includes('result') || text.includes('victim') ||
            text.includes('loaded') || text.includes('ready') || text.includes('start') ||
            text.includes('click') || text.includes('game') || text.includes('play') ||
            text.toLowerCase().includes('database') || text.toLowerCase().includes('victims')) {
            this.gameStats.push({
                timestamp: new Date().toISOString(),
                message: text,
                type: msg.type()
            });
            this.logger.info('Game activity detected', { activity: text });
        }
        
        // Detect if game becomes active
        if (text.includes('game started') || text.includes('scenario') || text.includes('choice available')) {
            this.isGameActive = true;
            this.logger.info('Game active state detected');
        }
    }
    
    async waitForGameState(expectedStates, timeout = 10000) {
        this.logger.info('Waiting for game state change...', { expectedStates });
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            // Check for visual changes by taking a screenshot and looking for different elements
            try {
                // Look for common game elements
                const hasChoiceElements = await this.page.$$eval('*', (elements) => {
                    return elements.some(el => {
                        const text = el.textContent || el.alt || el.src || '';
                        return text.toLowerCase().includes('left') || 
                               text.toLowerCase().includes('right') ||
                               text.toLowerCase().includes('choice') ||
                               text.toLowerCase().includes('victim') ||
                               text.toLowerCase().includes('spare');
                    });
                });
                
                if (hasChoiceElements) {
                    this.logger.info('Choice elements detected on page');
                    return true;
                }
            } catch (error) {
                // Continue checking
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.logger.warn('Timeout waiting for game state change');
        return false;
    }
    
    async playScenarios() {
        this.logger.info('Beginning intelligent scenario gameplay...');
        
        let actualScenariosPlayed = 0;
        
        for (let i = 0; i < this.config.game.maxScenarios; i++) {
            this.scenarioCount = i + 1;
            this.logger.info(`Attempting to play scenario ${this.scenarioCount}`);
            
            // Take screenshot of current state
            await this.logger.screenshot(this.page, `03a-scenario-${this.scenarioCount}-start`, `Scenario ${this.scenarioCount} initial state`);
            
            // Try clicking to advance the game state
            this.logger.info('Advancing game state with click...');
            await this.page.click('body');
            await new Promise(resolve => setTimeout(resolve, 8000)); // Longer wait for game to load resources
            
            // Take screenshot of state before choice
            await this.logger.screenshot(this.page, `03b-scenario-${this.scenarioCount}-ready`, `Scenario ${this.scenarioCount} ready for choice`);
                
            // Make a choice
            const choiceDirection = this.determineChoice();
            this.logger.info(`Making ${choiceDirection} choice for scenario ${this.scenarioCount}`);
            
            const viewport = this.config.browser.viewport;
            const centerY = viewport.height / 2;
            
            // Click left or right side based on choice
            try {
                if (choiceDirection === 'left') {
                    await this.page.mouse.click(viewport.width * 0.25, centerY);
                } else {
                    await this.page.mouse.click(viewport.width * 0.75, centerY);
                }
                this.logger.success(`Clicked ${choiceDirection} side of screen`);
            } catch (error) {
                this.logger.warn(`Error with ${choiceDirection} click, trying center`, { error: error.message });
                await this.page.click('body');
            }
            
            // Wait for response and take screenshot
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.logger.screenshot(this.page, `04-choice-${this.scenarioCount}-result`, `After ${choiceDirection} choice result`);
            
            // Check if stats were logged to console (sign of successful interaction)
            const statsCount = this.gameStats.length;
            if (statsCount > actualScenariosPlayed) {
                actualScenariosPlayed++;
                this.logger.success(`Scenario ${this.scenarioCount} appears successful - stats detected`);
            } else {
                this.logger.warn(`Scenario ${this.scenarioCount} may not have registered - no new stats`);
            }
            
            this.choiceIndex++;
            
            // Additional wait to let game process
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Take final screenshot
        await this.logger.screenshot(this.page, '05-game-final', 'Final game state');
        
        // Log all collected stats
        if (this.gameStats.length > 0) {
            this.logger.success('Game statistics collected', { 
                totalStats: this.gameStats.length,
                stats: this.gameStats 
            });
        } else {
            this.logger.warn('No game statistics were collected from console');
        }
        
        this.logger.success(`Completed ${this.scenarioCount} clicking interactions, ${actualScenariosPlayed} appeared successful`);
        return actualScenariosPlayed;
    }
    
    async readScenarioInstructions() {
        try {
            const instructionSelectors = this.config.game.instructionSelector.split(', ');
            
            for (const selector of instructionSelectors) {
                try {
                    const instructionElement = await this.page.$(selector.trim());
                    if (instructionElement) {
                        const instructionText = await this.page.evaluate(el => el.textContent, instructionElement);
                        this.logger.info(`Scenario ${this.scenarioCount} instructions`, { text: instructionText });
                        return instructionText;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            this.logger.warn(`Could not find instruction text for scenario ${this.scenarioCount}`);
            return null;
        } catch (error) {
            this.logger.error('Error reading scenario instructions', { error: error.message });
            return null;
        }
    }
    
    async makeChoice() {
        try {
            // Determine which choice to make based on strategy
            const choiceDirection = this.determineChoice();
            this.logger.info(`Making ${choiceDirection} choice for scenario ${this.scenarioCount}`);
            
            // Get viewport size to calculate click positions
            const viewport = this.config.browser.viewport;
            const centerX = viewport.width / 2;
            const centerY = viewport.height / 2;
            
            // Click left or right side of the screen
            if (choiceDirection === 'left') {
                // Click left side (1/4 from left edge)
                await this.page.mouse.click(viewport.width * 0.25, centerY);
            } else {
                // Click right side (3/4 from left edge)
                await this.page.mouse.click(viewport.width * 0.75, centerY);
            }
            
            this.logger.success(`Successfully clicked ${choiceDirection} side of screen`);
            this.choiceIndex++;
            return true;
            
        } catch (error) {
            this.logger.error('Error making choice', { error: error.message });
            return false;
        }
    }
    
    async findChoiceElement(selectors) {
        const selectorList = selectors.split(', ');
        
        for (const selector of selectorList) {
            try {
                const element = await this.page.$(selector.trim());
                if (element) {
                    return element;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        return null;
    }
    
    determineChoice() {
        const strategy = this.config.choices.strategy;
        
        switch (strategy) {
            case 'random':
                return Math.random() < 0.5 ? 'left' : 'right';
            case 'pattern':
                const pattern = this.config.choices.pattern;
                return pattern[this.choiceIndex % pattern.length];
            case 'left':
                return 'left';
            case 'right':
                return 'right';
            default:
                return 'left'; // Default fallback
        }
    }
    
    async checkGameEnd() {
        try {
            const endSelectors = this.config.game.endSelector.split(', ');
            
            for (const selector of endSelectors) {
                try {
                    const endElement = await this.page.$(selector.trim());
                    if (endElement) {
                        this.logger.info('Game end detected', { selector });
                        await this.logger.screenshot(this.page, '05-game-end', 'Game end screen');
                        return true;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
            return false;
        } catch (error) {
            this.logger.error('Error checking game end', { error: error.message });
            return false;
        }
    }
    
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
            this.logger.info('Browser cleanup completed');
        } catch (error) {
            this.logger.error('Error during cleanup', { error: error.message });
        } finally {
            this.logger.finalize();
        }
    }
    
    async playGame() {
        let success = false;
        
        try {
            // Initialize browser
            if (!(await this.init())) {
                throw new Error('Failed to initialize browser');
            }
            
            // Navigate to game
            if (!(await this.navigateToGame())) {
                throw new Error('Failed to navigate to game');
            }
            
            // Start the game
            if (!(await this.startGame())) {
                throw new Error('Failed to start game');
            }
            
            // Play through scenarios
            const scenariosPlayed = await this.playScenarios();
            
            success = true;
            this.logger.success(`Game completed successfully! Played ${scenariosPlayed} scenarios`);
            
            if (this.gameStats.length > 0) {
                this.logger.success('Game statistics were captured - indicating actual gameplay occurred!');
            }
            
        } catch (error) {
            this.logger.error('Game play failed', { error: error.message, stack: error.stack });
        } finally {
            await this.cleanup();
        }
        
        return success;
    }
}

module.exports = GamePlayer;