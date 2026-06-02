#!/bin/bash
# Script to build the Phaser project and sync with Capacitor iOS workspace

echo "Starting build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "Vite build successful. Syncing with Capacitor..."
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
