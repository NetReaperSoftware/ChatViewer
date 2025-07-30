#!/bin/bash

# Git cleanup script for ChatViewer
# This script helps clean up the repository and commit the gitignore changes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Git cleanup for ChatViewer...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: This script must be run from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Current git status:${NC}"
git status --short

echo -e "${YELLOW}🔍 Checking for large files...${NC}"
find . -type f -size +10M | grep -v node_modules | grep -v ".git" || echo "No large files found"

echo -e "${YELLOW}🗑️  Removing any remaining problematic files from git...${NC}"

# Remove any remaining large files or build artifacts
git rm --cached --ignore-unmatch macos/build/* 2>/dev/null || true
git rm --cached --ignore-unmatch macos/DerivedData/* 2>/dev/null || true
git rm --cached --ignore-unmatch macos/Pods/* 2>/dev/null || true

echo -e "${YELLOW}📦 Adding changes to git...${NC}"
git add .gitignore
git add scripts/
git add DEVELOPMENT.md
git add src/
git add -A  # Add all other changes

echo -e "${YELLOW}📊 Final git status:${NC}"
git status --short

echo -e "${GREEN}✅ Repository cleaned up successfully!${NC}"
echo -e "${GREEN}   Ready to commit. Run:${NC}"
echo -e "${GREEN}   git commit -m 'Fix .gitignore and add Messages Database Viewer implementation'${NC}"
echo -e "${GREEN}   git push origin main${NC}"