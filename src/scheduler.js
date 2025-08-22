const cron = require('node-cron');
const GamePlayer = require('./gamePlayer');

class Scheduler {
    constructor(config) {
        this.config = config;
        this.isRunning = false;
        this.cronJob = null;
    }
    
    start() {
        if (!this.config.schedule.enabled) {
            console.log('Scheduling is disabled in configuration');
            return false;
        }
        
        const [hour, minute] = this.config.schedule.dailyRunTime.split(':');
        const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
        
        console.log(`Setting up daily schedule: ${this.config.schedule.dailyRunTime} (cron: ${cronExpression})`);
        
        this.cronJob = cron.schedule(cronExpression, async () => {
            console.log('Scheduled game run starting...');
            await this.runGame();
        });
        
        console.log('Scheduler started successfully');
        return true;
    }
    
    stop() {
        if (this.cronJob) {
            this.cronJob.destroy();
            this.cronJob = null;
            console.log('Scheduler stopped');
        }
    }
    
    async runGame() {
        if (this.isRunning) {
            console.log('Game is already running, skipping this execution');
            return false;
        }
        
        this.isRunning = true;
        
        try {
            console.log('Starting game player...');
            const gamePlayer = new GamePlayer(this.config);
            const success = await gamePlayer.playGame();
            
            if (success) {
                console.log('Game completed successfully');
            } else {
                console.log('Game completed with errors');
            }
            
            return success;
        } catch (error) {
            console.error('Error during game execution:', error);
            return false;
        } finally {
            this.isRunning = false;
        }
    }
    
    async runManual() {
        console.log('Manual game run requested...');
        return await this.runGame();
    }
    
    getStatus() {
        return {
            scheduled: this.config.schedule.enabled,
            dailyTime: this.config.schedule.dailyRunTime,
            isRunning: this.isRunning,
            nextRun: this.cronJob ? this.cronJob.nextDates().toString() : null
        };
    }
}

module.exports = Scheduler;