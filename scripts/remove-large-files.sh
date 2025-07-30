#!/bin/bash

# Script to remove large files from Git history
# This is a reference script - use with caution as it rewrites Git history

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: This script rewrites Git history!${NC}"
echo -e "${RED}    Only use this on branches that haven't been shared with others.${NC}"
echo -e "${YELLOW}    This script is for reference only.${NC}"
echo ""

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 <file-path>"
    echo ""
    echo "Example: $0 macos/local-deps/boost_1_76_0.tar.bz2"
    echo ""
    echo "This script will:"
    echo "1. Remove the specified file from all Git history"
    echo "2. Clean up Git references"
    echo "3. Force garbage collection"
    echo "4. Require force push to remote"
    exit 0
fi

if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please specify a file path to remove${NC}"
    echo "Run with --help for usage information"
    exit 1
fi

FILE_PATH="$1"

echo -e "${YELLOW}🗑️  Removing '$FILE_PATH' from Git history...${NC}"

# Step 1: Rewrite history
echo -e "${YELLOW}   Step 1: Rewriting Git history...${NC}"
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch '$FILE_PATH'" \
    --prune-empty --tag-name-filter cat -- --all

# Step 2: Clean up refs
echo -e "${YELLOW}   Step 2: Cleaning up references...${NC}"
rm -rf .git/refs/original/
git reflog expire --expire=now --all

# Step 3: Garbage collection
echo -e "${YELLOW}   Step 3: Running garbage collection...${NC}"
git gc --prune=now --aggressive

echo -e "${GREEN}✅ File removed from Git history!${NC}"
echo -e "${GREEN}   Repository size: $(du -sh .git | cut -f1)${NC}"
echo ""
echo -e "${YELLOW}📤 Next steps:${NC}"
echo -e "${YELLOW}   1. Verify the file is gone: git log --name-only | grep '$FILE_PATH'${NC}"
echo -e "${YELLOW}   2. Force push: git push --force-with-lease origin main${NC}"
echo ""
echo -e "${RED}⚠️  Remember: Anyone who has cloned this repo will need to re-clone!${NC}"