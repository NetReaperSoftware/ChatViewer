#!/bin/bash

# Fix butter/map.h header issue for react-native-macos
# This script should be run after each 'pod install' to copy the missing butter headers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Fixing butter headers for react-native-macos...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

# Define paths
SOURCE_DIR="node_modules/react-native-macos/ReactCommon/butter"
TARGET_DIR="macos/Pods/Headers/Public/ReactCommon/butter"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Error: Source directory not found: $SOURCE_DIR${NC}"
    echo -e "${RED}   Make sure react-native-macos is installed${NC}"
    exit 1
fi

# Create target directory if it doesn't exist
echo -e "${YELLOW}📁 Creating target directory: $TARGET_DIR${NC}"
mkdir -p "$TARGET_DIR"

# Copy all header files
echo -e "${YELLOW}📋 Copying butter header files...${NC}"
cp "$SOURCE_DIR"/*.h "$TARGET_DIR/"

# Verify the copy was successful
if [ -f "$TARGET_DIR/map.h" ]; then
    echo -e "${GREEN}✅ Successfully copied butter headers!${NC}"
    echo -e "${GREEN}   Files copied:${NC}"
    ls -la "$TARGET_DIR"
else
    echo -e "${RED}❌ Error: Failed to copy butter headers${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Butter header fix complete! You can now build the project.${NC}"