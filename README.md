# Jenkins Automated Game Player

[![🎮 Daily Trolley Game Player](https://github.com/callumreid/jenkins-automated-game-player/actions/workflows/daily-game.yml/badge.svg)](https://github.com/callumreid/jenkins-automated-game-player/actions/workflows/daily-game.yml)
[![🧪 Test Daily Automation](https://github.com/callumreid/jenkins-automated-game-player/actions/workflows/test-automation.yml/badge.svg)](https://github.com/callumreid/jenkins-automated-game-player/actions/workflows/test-automation.yml)
[![🤖 Jenkins Game Player Tests](https://github.com/callumreid/jenkins-automated-game-player/actions/workflows/test.yml/badge.svg)](https://github.com/callumreid/jenkins-automated-game-player/actions/workflows/test.yml)

An automated web game player designed to play the "Trolley Problem" style game on trollilopolis.com once per day. This project serves two main purposes:

1. **Keep the game active**: Prevents the game's backend and database from shutting down due to inactivity
2. **Quality Assurance foundation**: Provides a framework for automated testing and monitoring of web games

## Features

- 🤖 **Automated gameplay**: Simulates user interactions with the trolley problem game
- 📅 **Scheduled execution**: Runs daily at a configurable time (default 6:00 AM)
- 📊 **Comprehensive logging**: Captures text logs, screenshots, network requests, and console output
- 🔄 **Error handling**: Built-in retry mechanisms and graceful error recovery
- ⚙️ **Configurable**: Easy customization of game settings, schedules, and behavior
- 🎯 **Manual triggers**: Run games on-demand for testing and debugging
- 📸 **Visual documentation**: Screenshots of each game step for verification

## Quick Start

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd jenkins
   npm install
   ```

2. **Configure the game** (optional):
   Edit `config/config.json` to customize settings:
   ```json
   {
     "game": {
       "url": "https://trollilopolis.com",
       "maxScenarios": 10
     },
     "schedule": {
       "dailyRunTime": "6:00",
       "enabled": true
     },
     "browser": {
       "headless": false
     }
   }
   ```

3. **Run manually first** (recommended):
   ```bash
   npm run play
   ```

4. **Start the scheduler**:
   ```bash
   npm start
   ```

### Basic Usage

```bash
# Run game manually (immediate execution)
npm run play

# Start daily scheduler
npm start

# Check current status and configuration
node index.js --status

# Get help
node index.js --help
```

## Project Structure

```
jenkins/
├── config/
│   └── config.json          # Configuration settings
├── src/
│   ├── gamePlayer.js        # Core game automation logic
│   ├── logger.js           # Logging and screenshot utilities
│   ├── scheduler.js        # Cron scheduling system
│   └── errorHandler.js     # Error handling and retry logic
├── logs/                   # Text logs and network/console data
├── screenshots/           # Visual documentation of game runs
├── index.js              # Main application entry point
├── package.json
└── README.md
```

## Configuration

The `config/config.json` file contains all customizable settings:

### Game Settings
- `url`: The game URL (default: "https://trollilopolis.com")
- `maxScenarios`: Maximum number of scenarios to play (default: 10)
- `waitTime`: Delay between actions in milliseconds (default: 2000)

### Browser Settings
- `headless`: Run browser in background (false = visible, true = hidden)
- `timeout`: Page load timeout in milliseconds
- `viewport`: Browser window dimensions

### Schedule Settings
- `dailyRunTime`: Daily execution time in "HH:MM" format
- `enabled`: Enable/disable scheduled runs
- `timezone`: Timezone for scheduling

### Logging Settings
- `screenshotQuality`: PNG quality for screenshots (0-100)
- `captureNetwork`: Record network requests
- `captureConsole`: Record browser console output
- `retainLogs`: Days to keep old log files

### Choice Strategy
- `strategy`: How to make choices ("random", "pattern", "left", "right")
- `pattern`: Sequence of choices when using pattern strategy

### Error Handling
- `maxRetries`: Number of retry attempts for failed actions
- `retryDelay`: Wait time between retries (milliseconds)
- `continueOnMinorErrors`: Whether to continue after recoverable errors

## Scheduling Options

### 1. Built-in Node Scheduler (Recommended)
The application includes a built-in scheduler using node-cron:

```bash
npm start  # Runs continuously with daily scheduling
```

### 2. System Cron (Linux/macOS)
For system-level scheduling, add to crontab:

```bash
# Edit crontab
crontab -e

# Add daily 6 AM execution
0 6 * * * cd /path/to/jenkins && npm run play >> /path/to/jenkins/logs/cron.log 2>&1
```

### 3. Jenkins CI/CD
Create a Jenkins job with:
- **Build Triggers**: "Build periodically" with cron expression `0 6 * * *`
- **Build Steps**: Execute shell command `npm run play`

## Output and Logs

Each run generates several types of output:

### 1. Text Logs (`logs/` directory)
- **Main log**: `YYYY-MM-DDTHH-MM-SS.log` - Chronological action log
- **Network log**: `*-network.json` - HTTP requests and responses  
- **Console log**: `*-console.json` - Browser console output

### 2. Screenshots (`screenshots/` directory)
- `01-game-loaded.png` - Initial page load
- `02-game-started.png` - After clicking start
- `03-scenario-N.png` - Each scenario presentation
- `04-choice-N.png` - After each choice is made
- `05-game-end.png` - Final game state

### 3. Console Output
Real-time progress updates displayed during execution.

## Troubleshooting

### Common Issues

1. **Game won't start**:
   - Check if the game URL is accessible
   - Verify start button selectors in config
   - Run with `headless: false` to see what's happening

2. **Browser fails to launch**:
   - Ensure Chrome/Chromium is installed
   - On Linux servers, you may need: `apt-get install chromium-browser`
   - Check system resources (memory/CPU)

3. **Elements not found**:
   - Game layout may have changed
   - Update selectors in `config.json`
   - Check screenshots to see current page state

4. **Scheduling not working**:
   - Verify `schedule.enabled: true` in config
   - Check system timezone matches config
   - For system cron, ensure path is absolute

### Debug Mode

Run with visible browser to debug issues:

```json
{
  "browser": {
    "headless": false
  }
}
```

### Log Analysis

Check the most recent log file for detailed execution information:
```bash
# View latest log
ls -la logs/
tail -f logs/2024-01-15T06-00-00.log

# View screenshots
open screenshots/2024-01-15T06-00-00/
```

## Extending the System

### Adding New Games

1. Create a new config section for the game
2. Extend `GamePlayer` class or create a new player class
3. Update selectors and interaction logic
4. Test thoroughly with manual runs

### Custom Choice Strategies

Modify the `determineChoice()` method in `GamePlayer`:

```javascript
determineChoice() {
    // Custom logic here
    // Return 'left' or 'right'
}
```

### Additional Logging

Extend the `Logger` class to add new output formats or destinations.

## Security and Safety

- **No sensitive data**: The system doesn't handle passwords or sensitive information
- **Local storage**: All logs are stored locally by default
- **Rate limiting**: Built-in delays prevent overwhelming the game server
- **Graceful degradation**: Designed to fail safely without breaking the game

## Performance Considerations

- **Resource usage**: Browser automation uses CPU and memory
- **Network usage**: Minimal - only loads the game pages
- **Storage**: Screenshots and logs accumulate over time (auto-cleanup available)
- **Headless mode**: Use `headless: true` for lower resource usage on servers

## Support

For issues, questions, or contributions:

1. Check the logs for error details
2. Review this documentation
3. Test with manual execution first
4. Create an issue with log files and configuration

## GitHub Repository

🔗 **Repository**: https://github.com/callumreid/jenkins-automated-game-player

### GitHub Actions
- **🎮 Daily Game Player**: Main production runs at 6:00 AM UTC + test at 3:45 PM UTC  
- **🧪 Test Automation**: Verification runs at 3:45 PM & 11:11 AM UTC with 2 scenarios
- **🤖 Test Suite**: Comprehensive testing on pushes and pull requests  
- **📊 Artifacts**: Logs and screenshots saved (30 days for daily, 14 days for tests)
- **🚀 Manual Dispatch**: Trigger runs on-demand with custom scenario counts

### Repository Features
- ✅ **Automated daily gameplay** via GitHub Actions
- ✅ **Comprehensive CI/CD** testing pipeline
- ✅ **Artifact management** with automatic cleanup
- ✅ **Workflow summaries** with game statistics
- ✅ **Manual triggers** for testing and debugging

## License

ISC License - See package.json for details.

---

*Jenkins Automated Game Player - Keep your games alive, catch issues early*