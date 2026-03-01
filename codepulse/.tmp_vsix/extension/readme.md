# CodePulse — Track Your Real Coding Time

![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue?logo=visualstudiocode)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Local%20Only-important)

A beautiful, minimal VS Code extension that tracks your real coding time with **active typing detection**, **streaks**, **personal bests**, and **zero cloud telemetry**.

## 🎯 What Makes This Different

CodePulse uses a **smart pause detection algorithm** instead of tracking idle time like traditional tools (WakaTime, Wakatime). Here's how it works:

- **Only counts actual typing**: A 10-second pause (configurable) marks the end of a coding session
- **Ignores distractions**: Reading code, debugging, testing—none of that counts unless you're typing
- **No network calls**: Everything is stored locally in VS Code's `globalState`
- **No telemetry**: Your data never leaves your machine
- **Personal streaks**: Build consecutive day streaks with freeze protection
- **Personal records**: Track your coding velocity (chars/words/lines per day)

The result? Honest metrics that motivate without guilt-tripping.

## ✨ Features

### Real-Time Dashboard
- **Today's Stats**: Active time, words typed, characters, lines, files touched
- **Progress Bar**: Visual goal tracking (default: 60 minutes/day)
- **Weekly Chart**: Bar chart showing last 7 days of activity + goal line
- **Personal Bests**: Best day, longest streak, fastest session
- **Language Breakdown**: See which languages you coded in this week
- **Language-aware Metrics**: Automatic tracking by file type

### Streaks & Motivation
- **Current Streak**: Build consecutive day streaks
- **Longest Streak**: Personal record for streak length
- **Freeze System**: 2 free strikes per week when you miss a day (auto-replenish every 7 days)
- **Notifications**: Alerts when you hit records or freeze is consumed
- **Zero Days Protected**: Never lose your streak to a busy day

### Status Bar Integration
- **Live Updates**: See active time + word count in the status bar (updates every second)
- **Goal Indicator**: Icon changes when you hit your daily goal ✅
- **One-Click Dashboard**: Open full dashboard from status bar

### Privacy-First
- 100% local storage (globalState only)
- No network requests ever
- No analytics, no tracking pixels, no cloud sync
- Data export: Download your stats as JSON anytime
- Retention: Auto-deletes sessions older than 90 days

## 📦 Installation

### From VS Code Marketplace (coming soon)
```
Search for "CodePulse" in the Extensions panel
Click Install
```

### Manual Installation (Development)
```bash
git clone https://github.com/yourusername/codepulse
cd codepulse
npm install
npm run compile
```

Then in VS Code:
- `Ctrl+Shift+P` → "Developer: Install Extension from Location"
- Select the `codepulse` folder

## 🚀 How to Use

### Start Tracking
The extension activates automatically on startup. Just start coding!

### Open Dashboard
- Command: `CodePulse: Open Dashboard`
- Or click `🔥` in the status bar (right side)

### Configure Goals
1. Open the dashboard
2. Click the ⚙️ settings icon
3. Set your daily goal (default: 60 minutes)
4. Adjust pause threshold (5-30 seconds, default: 10s)
5. Click **Save Settings**

### Commands
- `CodePulse: Open Dashboard` — Open the full dashboard
- `CodePulse: Reset Today's Stats` — Clear today's data
- `CodePulse: Pause/Resume Tracking` — Disable/enable tracking
- `CodePulse: Export Stats as JSON` — Download your data

### Configuration (settings.json)
```json
{
  "codepulse.dailyGoalMinutes": 60,
  "codepulse.pauseThresholdSeconds": 10,
  "codepulse.enableStreakFreeze": true,
  "codepulse.showWordsInStatusBar": true
}
```

## 🔥 How Streaks Work

### Building a Streak
A day **counts** toward your streak when:
- Total active typing time ≥ your daily goal (default: 60 minutes)
- Tracked consecutive days

### Missing a Day
When you miss a goal, CodePulse checks if you have a **freeze**:
- **Freeze Available?** Your streak is protected + notification sent
- **No Freezes?** Streak resets to 0 (clean slate)

### Freeze Replenishment
- Start with **2 freezes** per week
- After **7 days**, you earn 1 more freeze (max 2)
- Replenishment auto-triggers at midnight

### Example
```
Mon - Goal hit → Streak: 1
Tue - Goal hit → Streak: 2
Wed - Missed!  → Freeze used → Streak: 2 (protected)
Thu - Goal hit → Streak: 3
Fri - Goal hit → Streak: 4
```

## 📊 Dashboard Layout

### Today Card
- Active time progress vs daily goal
- Words, characters, lines typed
- Files touched today

### Weekly Chart
- Last 7 days of active time (minutes)
- Goal line overlay
- Color coding: Green (goal hit), amber (partial), grey (zero)

### Streak Status
- Current streak (days)
- Freezes remaining
- Total days active

### Personal Records
- Most words in a day
- Most characters in a day
- Longest streak ever
- Longest single session

### Language Breakdown
- Top 5 languages by active time (this week)
- Time spent in each language

## 🔒 Privacy & Security

### No Cloud Sync
- All data stored in `globalState` (VS Code's local encrypted storage)
- No third-party servers
- No credentials required

### Data Export
- Download stats as JSON: `CodePulse: Export Stats as JSON`
- Import/backup manually
- Format matches internal storage schema

### Data Retention
- Automatically deletes sessions older than 90 days
- Keeps aggregated stats longer (optional future feature)
- Manual deletion anytime via `Reset Today's Stats`

### CSP & Safety
- Webview uses strict Content Security Policy
- No inline scripts, only nonce-protected code
- Chart.js loaded from CDN (pinned version)

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Development Setup
```bash
npm install
npm run compile       # Build & typecheck
npm run watch        # Watch mode (auto-recompile)
npm run test         # Run tests
npm run lint         # Run ESLint
npm run format       # Auto-format with Prettier
```

### Testing
```bash
npm run test              # Run all tests
npm run test:ui          # Interactive UI
```

### Building for Publication
```bash
npm run vscode:prepublish
vsce package
vsce publish
```

## 🛠️ Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: VS Code Extension API v1.85+
- **Storage**: vscode.ExtensionContext.globalState
- **UI**: Webview (HTML + CSS + Vanilla JS)
- **Charts**: Chart.js 4.x
- **Bundler**: esbuild
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## 📋 Project Structure

```
codepulse/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── core/
│   │   ├── SessionEngine.ts      # Debounce + session logic
│   │   ├── DeltaCalculator.ts    # Track char/word/line deltas
│   │   ├── StatsAggregator.ts    # Aggregate sessions into stats
│   │   ├── StreakManager.ts      # Streak + freeze logic
│   │   └── RecordKeeper.ts       # Personal records tracking
│   ├── storage/
│   │   └── StorageManager.ts     # globalState persistence
│   ├── ui/
│   │   ├── StatusBarItem.ts      # Status bar display
│   │   ├── DashboardPanel.ts     # Webview panel controller
│   │   └── webview/
│   │       ├── dashboard.html    # Dashboard markup
│   │       ├── dashboard.css     # Dashboard styles
│   │       └── dashboard.js      # Dashboard interactivity
│   ├── models/
│   │   └── types.ts              # TypeScript interfaces
│   └── utils/
│       ├── timeUtils.ts          # Date helpers
│       └── textUtils.ts          # Text analysis
├── tests/
│   ├── SessionEngine.test.ts
│   ├── StreakManager.test.ts
│   ├── DeltaCalculator.test.ts
│   └── StatsAggregator.test.ts
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## 🎨 Customization

### Themes
CodePulse respects VS Code's light/dark theme. Colors adapt automatically based on:
- `--vscode-editor-background`
- `--vscode-editor-foreground`
- `--vscode-button-background`
- Other VS Code CSS variables

### Status Bar Icon
Change the emoji/icon in `src/ui/StatusBarItem.ts`:
```typescript
const icon = goal.goalHit ? '✅' : isActive ? '⚡' : '💤';
```

## 📝 License

MIT © 2026 CodePulse Contributors

See [LICENSE](https://github.com/arpitshukla9/openSource-Projects/blob/HEAD/LICENSE) for details.

## 🐞 Troubleshooting

### Extension Won't Activate
- Check: `CodePulse: Open Dashboard` command visible?
- Verify: Extension installed correctly (Extensions panel)
- Try: Reload window (`Ctrl+R` on Windows/Linux, `Cmd+R` on Mac)

### Stats Not Updating
- Check: Editor is active (text changes are tracked)
- Try: Type a character to trigger session start
- View: Output channel "CodePulse" for debug info

### Dashboard Won't Open
- Try: Restart VS Code
- Check: WebView CSP not blocking (dev console should be clean)
- Run: `Developer: Toggle Developer Tools`

### Performance Issues
- Disable other extensions temporarily
- Clear extension cache: `rm -r ~/.vscode/extensions/codepulse*`
- Reinstall: `npm run compile`, reload window

## 📞 Support

- **Issues**: GitHub Issues (coming soon)
- **Discussions**: GitHub Discussions
- **Feedback**: Open an issue with `[Feature Request]` label

---

**Happy coding! Build those streaks. Track your velocity. Own your productivity.**

🔥 _CodePulse: Real Time. Real Coding._
