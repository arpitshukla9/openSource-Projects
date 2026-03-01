# CodePulse Development Guide

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm 7+
- VS Code 1.85+

### Setup
```bash
cd codepulse
npm install
npm run compile
```

### Run in Development
```bash
# In VS Code
F5  # Starts debug session

# Or via command line
npm run watch  # Watch mode (auto-recompile)
```

## Build Commands

### Development Build (with source maps)
```bash
npm run esbuild
```

### Production Build (minified)
```bash
npm run vscode:prepublish
```

### Watch Mode (auto-recompile)
```bash
npm run watch
```

## Testing

### Run All Tests
```bash
npm test
```

### Interactive Test UI
```bash
npm run test:ui
```

### Watch Mode Tests
```bash
npm test -- --watch
```

## Linting & Formatting

### Type Check
```bash
npm run typecheck
```

### Lint All Files
```bash
npm run lint
```

### Fix Linting Issues
```bash
npm run lint:fix
```

### Format Code
```bash
npm run format
```

## Publishing to VS Code Marketplace

### Step 1: Prepare for Publication
```bash
npm run vscode:prepublish
```

### Step 2: Install vsce CLI (if not already installed)
```bash
npm install -g vsce
```

### Step 3: Create Package
```bash
vsce package
```

This generates `codepulse-1.0.0.vsix` file.

### Step 4: Test Installation Locally
```bash
# In VS Code, press Ctrl+Shift+P
# Run: Extensions: Install from VSIX...
# Select the .vsix file
```

### Step 5: Create Publisher Account
Go to https://marketplace.visualstudio.com and create a publisher account.

### Step 6: Create Personal Access Token (PAT)
1. Go to https://dev.azure.com
2. Create a Personal Access Token with scope: `Marketplace (Manage)`
3. Copy the token

### Step 7: Authenticate vsce
```bash
vsce login YOUR_PUBLISHER_NAME
# Paste your PAT when prompted
```

### Step 8: Publish
```bash
vsce publish
```

Or publish a specific version:
```bash
vsce publish 1.0.0
```

### Step 9: Unpublish (if needed)
```bash
vsce unpublish YOUR_PUBLISHER_NAME.codepulse
```

## Project Structure

```
codepulse/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── core/
│   │   ├── SessionEngine.ts      # Core session tracking
│   │   ├── DeltaCalculator.ts    # Text delta tracking
│   │   ├── StatsAggregator.ts    # Statistics aggregation
│   │   ├── StreakManager.ts      # Streak/freeze logic
│   │   └── RecordKeeper.ts       # Personal records
│   ├── storage/
│   │   └── StorageManager.ts     # Data persistence
│   ├── ui/
│   │   ├── StatusBarItem.ts      # Status bar display
│   │   ├── DashboardPanel.ts     # Dashboard controller
│   │   └── webview/              # Webview assets
│   ├── models/
│   │   └── types.ts              # TypeScript interfaces
│   └── utils/
│       ├── timeUtils.ts          # Date/time helpers
│       └── textUtils.ts          # Text analysis helpers
├── tests/
│   ├── SessionEngine.test.ts
│   ├── StreakManager.test.ts
│   ├── DeltaCalculator.test.ts
│   └── StatsAggregator.test.ts
├── dist/                         # Output (generated)
├── node_modules/                 # Dependencies
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
├── .gitignore
└── README.md
```

## Key Files & Responsibilities

### extension.ts
- Extension activation/deactivation
- Command registration
- Event listener setup
- Orchestrates all modules

### SessionEngine.ts
- Debounce timer logic
- Session start/stop
- State machine management

### StorageManager.ts
- globalState read/write
- Data schema validation
- Storage pruning (90-day retention)

### StatsAggregator.ts
- Aggregates sessions into daily/weekly stats
- Calculates goal progress
- Language breakdown

### StreakManager.ts
- Streak increment/reset logic
- Freeze consumption
- Midnight checks

### DashboardPanel.ts
- Webview panel lifecycle
- Message passing to webview
- Stats distribution

### StatusBarItem.ts
- Live status bar updates
- Real-time formatting
- Tooltips

## Debugging

### Enable Debug Logging
In `extension.ts`, logs are sent to the "CodePulse" output channel:
```typescript
outputChannel.appendLine('[SessionEngine] Message here');
```

View logs:
- `Ctrl+Shift+U` → Select "CodePulse" channel

### Debug Session
Press `F5` to start a debug session with full breakpoint support.

### Inspect globalState
Add this to `extension.ts` temporarily:
```typescript
console.log(JSON.stringify(storageManager.getStorage(), null, 2));
```

## Performance Targets

- Extension activation: < 100ms
- Status bar update latency: < 50ms
- Dashboard load: < 500ms
- Storage write: < 10ms per session
- Bundle size: < 500KB

## Code Style

- **Strict TypeScript**: No `any` types allowed
- **ESLint**: Enforced via CI (or manual `npm run lint`)
- **Prettier**: 100-char line width, 2-space tabs
- **File Structure**: One export per file, clear module boundaries

## Testing Strategy

- **Unit Tests**: SessionEngine, DeltaCalculator, StreakManager, StatsAggregator
- **Integration**: Tested manually via Debug Session (F5)
- **E2E**: Manual testing in real VS Code window

Test patterns:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('ModuleName', () => {
  let module: ModuleName;

  beforeEach(() => {
    module = new ModuleName();
  });

  it('does something', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Common Issues

### Extension doesn't activate
- Clear command palette cache: `Ctrl+Shift+P` → Close/Reopen
- Check output channel: "CodePulse"
- Ensure `package.json` activation condition is correct

### TypeScript errors in editor
- Run: `npm run typecheck`
- Check `tsconfig.json` `noUnusedLocals` setting

### Build fails
```bash
npm run clean       # Delete dist/
npm run esbuild     # Rebuild
```

### Tests fail
```bash
npm test -- --reporter=verbose
```

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Run `npm run typecheck` (no errors)
- [ ] Run `npm test` (all pass)
- [ ] Run `npm run lint` (no errors)
- [ ] Build: `npm run vscode:prepublish`
- [ ] Generate VSIX: `vsce package`
- [ ] Test VSIX locally: Install → Test all features
- [ ] Update `README.md` changelog (if applicable)
- [ ] Commit: `git commit -am "Release v1.0.1"`
- [ ] Tag: `git tag v1.0.1`
- [ ] Publish: `vsce publish`

## Support & Questions

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **VS Code Extension API**: https://code.visualstudio.com/api
- **Chart.js Docs**: https://www.chartjs.org/docs/latest/

---

**Happy coding!** 🔥
