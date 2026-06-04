#!/usr/bin/env bash

# Colors for premium look
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}       Unified Game iOS Builder         ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Get workspace root directory
WORKSPACE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$WORKSPACE_DIR"

GAME_DIR="$1"

# If no game directory is provided, list options and ask the user
if [ -z "$GAME_DIR" ]; then
    echo -e "${YELLOW}Available game directories:${NC}"
    # List all game directories
    find . -maxdepth 1 -type d -name "game-*" | sed 's|./||' | sort
    echo ""
    read -p "Enter the game directory name to build (e.g., game-8): " GAME_DIR
fi

# Trim whitespace
GAME_DIR=$(echo "$GAME_DIR" | xargs)

if [ -z "$GAME_DIR" ]; then
    echo -e "${RED}Error: Game directory name cannot be empty.${NC}"
    exit 1
fi

TARGET_PATH="$WORKSPACE_DIR/$GAME_DIR"

if [ ! -d "$TARGET_PATH" ]; then
    echo -e "${RED}Error: Directory '$TARGET_PATH' does not exist.${NC}"
    exit 1
fi

echo -e "${BLUE}Entering directory: $TARGET_PATH${NC}"
cd "$TARGET_PATH"

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: 'package.json' not found in $GAME_DIR.${NC}"
    exit 1
fi

# Step 1: Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: 'npm install' failed.${NC}"
        exit 1
    fi
fi

# Step 2: Auto-generate capacitor.config.ts if missing
if [ ! -f "capacitor.config.ts" ] && [ ! -f "capacitor.config.json" ]; then
    echo -e "${YELLOW}Capacitor configuration not found. Generating capacitor.config.ts...${NC}"
    node -e "
const fs = require('fs');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const slug = pkg.name || '$GAME_DIR';
  const cleanSlug = slug.replace(/[^a-zA-Z0-9]/g, '');
  const appName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  const config = \`import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.theld21.\${cleanSlug}',
  appName: '\${appName}',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false
    }
  }
};

export default config;
\`;
  fs.writeFileSync('capacitor.config.ts', config);
  console.log('Successfully generated capacitor.config.ts');
} catch (err) {
  console.error('Failed to generate capacitor.config.ts:', err.message);
  process.exit(1);
}
"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to auto-generate capacitor.config.ts.${NC}"
        exit 1
    fi
fi

# Step 3: Build Web Assets
echo -e "${BLUE}Building web assets using 'npm run build'...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed.${NC}"
    exit 1
fi

# Step 4: Setup/Sync Capacitor iOS
if [ ! -d "ios" ]; then
    echo -e "${YELLOW}iOS native platform not found. Adding platform...${NC}"
    npx cap add ios
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to add iOS platform via Capacitor.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Syncing with Capacitor...${NC}"
npx cap sync
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Capacitor sync failed.${NC}"
    exit 1
fi

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN} iOS Build & Sync Complete for $GAME_DIR!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "You can now open the workspace in Xcode to build/run the app."
