# ChatViewer Development Guide

## Building the macOS App

This React Native macOS app requires special handling for the `butter/map.h` header issue in react-native-macos. We've created automated scripts to handle this.

### Quick Start

```bash
# Run pod install with automatic butter header fix
npm run pod-install

# Build and run the app
npm run macos
```

### Manual Steps (if needed)

If you need to run pod install manually:

```bash
# 1. Navigate to macos directory and run pod install
cd macos && pod install && cd ..

# 2. Fix the butter headers
npm run fix-butter

# 3. Build the app
npm run macos
```

### Available Scripts

- `npm run macos` - Build and run the macOS app
- `npm run pod-install` - Run pod install with automatic butter header fix
- `npm run fix-butter` - Fix butter headers manually (run after pod install)

### The Butter Header Issue

React Native macOS has a known issue where `butter/map.h` headers are missing from the Pods directory after `pod install`. Our scripts automatically:

1. Create the required directory: `macos/Pods/Headers/Public/ReactCommon/butter/`
2. Copy all butter headers from `node_modules/react-native-macos/ReactCommon/butter/`
3. Verify the copy was successful

### Files Created

- `scripts/fix-butter-headers.sh` - Fixes butter headers only
- `scripts/pod-install-with-fix.sh` - Runs pod install + fix in one command

### Database Options

The app supports multiple database options:

1. **Test DB** - Creates a test database with sample data (works immediately)
2. **Manual Path** - Enter path to Messages database (requires Full Disk Access permissions)
   - Default location: `~/Library/Messages/chat.db`
   - Requires: System Preferences > Security & Privacy > Privacy > Full Disk Access

### Troubleshooting

If you see `'butter/map.h' file not found` error:
```bash
npm run fix-butter
npm run macos
```

If build fails after adding new dependencies:
```bash
npm run pod-install
npm run macos
```