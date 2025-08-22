class ErrorHandler {
    constructor(config, logger) {
        this.config = config.errorHandling;
        this.logger = logger;
    }
    
    async retryWithBackoff(operation, context = '', maxRetries = null) {
        const retries = maxRetries || this.config.maxRetries;
        let lastError = null;
        
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                this.logger.info(`${context} - Attempt ${attempt}/${retries + 1}`);
                const result = await operation();
                
                if (attempt > 1) {
                    this.logger.success(`${context} succeeded on attempt ${attempt}`);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                this.logger.warn(`${context} failed on attempt ${attempt}`, { 
                    error: error.message,
                    attempt,
                    maxAttempts: retries + 1
                });
                
                // If this was the last attempt, don't wait
                if (attempt <= retries) {
                    this.logger.info(`Waiting ${this.config.retryDelay}ms before retry...`);
                    await this.sleep(this.config.retryDelay);
                }
            }
        }
        
        this.logger.error(`${context} failed after ${retries + 1} attempts`, { 
            finalError: lastError.message 
        });
        throw lastError;
    }
    
    async withTimeout(operation, timeoutMs = null, context = '') {
        const timeout = timeoutMs || this.config.timeoutActions;
        
        return Promise.race([
            operation(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Operation timed out after ${timeout}ms: ${context}`));
                }, timeout);
            })
        ]);
    }
    
    async handleError(error, page = null, context = '') {
        this.logger.error(`Error in ${context}`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Take screenshot on error if configured
        if (this.config.takeScreenshotOnError && page) {
            try {
                await this.logger.screenshot(page, `error-${Date.now()}`, `Error screenshot: ${context}`);
            } catch (screenshotError) {
                this.logger.warn('Failed to take error screenshot', { 
                    error: screenshotError.message 
                });
            }
        }
        
        return this.shouldContinue(error);
    }
    
    shouldContinue(error) {
        if (!this.config.continueOnMinorErrors) {
            return false;
        }
        
        // Define minor errors that we can continue from
        const minorErrorPatterns = [
            /waiting for selector/i,
            /element not found/i,
            /timeout/i,
            /timed out/i,
            /navigation failed/i,
            /navigating frame was detached/i,
            /net::err_/i
        ];
        
        const isFatal = [
            /browser disconnected/i,
            /page crashed/i,
            /out of memory/i,
            /cannot launch browser/i
        ].some(pattern => pattern.test(error.message));
        
        if (isFatal) {
            this.logger.error('Fatal error detected, cannot continue', { error: error.message });
            return false;
        }
        
        const isMinor = minorErrorPatterns.some(pattern => pattern.test(error.message));
        
        if (isMinor) {
            this.logger.warn('Minor error detected, attempting to continue', { error: error.message });
            return true;
        }
        
        // Unknown error - be conservative
        this.logger.warn('Unknown error type, stopping execution for safety', { error: error.message });
        return false;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async safeExecute(operation, context = '', page = null) {
        try {
            return await this.withTimeout(
                () => this.retryWithBackoff(operation, context),
                null,
                context
            );
        } catch (error) {
            const shouldContinue = await this.handleError(error, page, context);
            if (!shouldContinue) {
                throw error;
            }
            return null; // Indicate partial failure but continue
        }
    }
}

module.exports = ErrorHandler;