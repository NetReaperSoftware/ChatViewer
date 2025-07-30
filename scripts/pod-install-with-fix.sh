#!/bin/bash

# Complete pod install with butter header fix for react-native-macos
# This script runs pod install and automatically fixes the butter header issue

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting pod install with butter header fix...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

# Check if macos directory exists
if [ ! -d "macos" ]; then
    echo -e "${RED}❌ Error: macos directory not found${NC}"
    exit 1
fi

# Run pod install
echo -e "${YELLOW}📦 Running pod install in macos directory...${NC}"
cd macos
pod install
cd ..

# Run the butter header fix
echo -e "${YELLOW}🔧 Applying butter header fix...${NC}"
./scripts/fix-butter-headers.sh

echo -e "${GREEN}🎉 Complete! Pod install finished and butter headers fixed.${NC}"
echo -e "${GREEN}   You can now run: npx react-native run-macos${NC}"