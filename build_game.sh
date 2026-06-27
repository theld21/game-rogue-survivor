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

git pull

build_one_game() {
    local GAME_DIR="$1"
    local TARGET_PATH="$WORKSPACE_DIR/$GAME_DIR"
    
    echo -e "${BLUE}-----------------------------------------${NC}"
    echo -e "${BLUE} Starting build for: $GAME_DIR${NC}"
    echo -e "${BLUE}-----------------------------------------${NC}"
    
    if [ ! -d "$TARGET_PATH" ]; then
        echo -e "${RED}Error: Directory '$TARGET_PATH' does not exist.${NC}"
        return 1
    fi
    
    cd "$TARGET_PATH"
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: 'package.json' not found in $GAME_DIR.${NC}"
        cd "$WORKSPACE_DIR"
        return 1
    fi
    
    # Step 1: Install dependencies if node_modules is missing
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error: 'npm install' failed in $GAME_DIR.${NC}"
            cd "$WORKSPACE_DIR"
            return 1
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
  const cleanSlug = slug.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
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
        if [ $? -eq 0 ]; then
            echo -e "${RED}=====================================================================${NC}"
            echo -e "${RED}Error: Capacitor configuration was missing for $GAME_DIR!${NC}"
            echo -e "${YELLOW}A template has been generated at: $GAME_DIR/capacitor.config.ts${NC}"
            echo -e "${YELLOW}Please review/modify the App Name and Bundle ID, then rerun the script.${NC}"
            echo -e "${RED}=====================================================================${NC}"
            cd "$WORKSPACE_DIR"
            return 1
        else
            echo -e "${RED}Error: Failed to auto-generate template capacitor.config.ts.${NC}"
            cd "$WORKSPACE_DIR"
            return 1
        fi
    fi
    
    # Step 3: Build Web Assets
    echo -e "${BLUE}Building web assets using 'npm run build'...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Build failed in $GAME_DIR.${NC}"
        cd "$WORKSPACE_DIR"
        return 1
    fi
    
    # Step 4: Setup/Sync Capacitor iOS
    if [ ! -d "ios" ]; then
        echo -e "${YELLOW}iOS native platform not found. Adding platform...${NC}"
        npx cap add ios
        if [ $? -ne 0 ]; then
            echo -e "${RED}Error: Failed to add iOS platform in $GAME_DIR.${NC}"
            cd "$WORKSPACE_DIR"
            return 1
        fi
    fi
    
    echo -e "${BLUE}Syncing with Capacitor...${NC}"
    npx cap sync
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Capacitor sync failed in $GAME_DIR.${NC}"
        cd "$WORKSPACE_DIR"
        return 1
    fi
    
    echo -e "${GREEN}Success: iOS Build & Sync Complete for $GAME_DIR!${NC}"
    cd "$WORKSPACE_DIR"
    return 0
}

INPUT_ARG="$1"

# If no argument is provided, prompt the user
if [ -z "$INPUT_ARG" ]; then
    echo -e "${YELLOW}Options:${NC}"
    echo "  all      - Build all game directories"
    find . -maxdepth 1 -type d -name "game-*" | sed 's|./||' | sort | awk '{print "  " $1}'
    echo ""
    read -p "Enter the choice (e.g. all, game-2): " INPUT_ARG
fi

INPUT_ARG=$(echo "$INPUT_ARG" | xargs)

if [ "$INPUT_ARG" = "all" ]; then
    echo -e "${YELLOW}Building all games...${NC}"
    GAMES=$(find . -maxdepth 1 -type d -name "game-*" | sed 's|./||' | sort)
    FAILED_GAMES=""
    for game in $GAMES; do
        build_one_game "$game"
        if [ $? -ne 0 ]; then
            FAILED_GAMES="$FAILED_GAMES $game"
        fi
    done
    
    echo -e "${BLUE}=========================================${NC}"
    if [ -z "$FAILED_GAMES" ]; then
        echo -e "${GREEN}All games built successfully!${NC}"
    else
        echo -e "${RED}The following games failed to build:$FAILED_GAMES${NC}"
        exit 1
    fi
    echo -e "${BLUE}=========================================${NC}"
else
    build_one_game "$INPUT_ARG"
    exit $?
fi
