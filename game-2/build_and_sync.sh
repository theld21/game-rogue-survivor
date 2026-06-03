#!/bin/bash
# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Current directory: $SCRIPT_DIR"
echo "Starting build process for game-2..."
npm run build

if [ $? -eq 0 ]; then
    echo "Vite build successful. Syncing with Capacitor..."
    if [ ! -d "ios" ]; then
        echo "iOS native directory not found. Re-adding platform..."
        npx cap add ios
    fi
    npx cap sync
    if [ $? -eq 0 ]; then
        echo "Capacitor sync successful! Build is complete."
    else
        echo "Capacitor sync failed."
        exit 1
    fi
else
    echo "Vite build failed."
    exit 1
fi
