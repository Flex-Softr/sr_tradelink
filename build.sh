#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Installing dependencies..."
npm install

echo "Building the application..."
# Using 1024MB (1GB) for the Node.js max old space size to ensure it fits safely within 2GB of RAM
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo "Build completed successfully!"
