#!/bin/bash

# Script to add the ChatDatabaseManager native module to Xcode project
# This needs to be run manually in Xcode for now

echo "🔧 ChatDatabaseManager Native Module Setup"
echo "========================================="
echo ""
echo "The following files have been created:"
echo "📁 macos/ChatViewer-macOS/ChatDatabaseManager.swift"
echo "📁 macos/ChatViewer-macOS/ChatDatabaseManager.m"
echo ""
echo "To complete the setup, please:"
echo ""
echo "1. Open ChatViewer.xcworkspace in Xcode"
echo "2. Right-click on the 'ChatViewer-macOS' folder in the project navigator"
echo "3. Select 'Add Files to \"ChatViewer\"...'"
echo "4. Navigate to macos/ChatViewer-macOS/ and select both:"
echo "   - ChatDatabaseManager.swift"
echo "   - ChatDatabaseManager.m"
echo "5. Make sure 'Add to target: ChatViewer-macOS' is checked"
echo "6. Click 'Add'"
echo ""
echo "📝 The native module provides these methods:"
echo "   - openDatabase(path)"
echo "   - closeDatabase()"
echo "   - executeQuery(sql, params)"
echo "   - getChats(limit)"
echo "   - searchMessages(searchTerm, limit)"
echo "   - getMessagesForChat(chatId, limit, offset)"
echo ""
echo "🚀 After adding the files, rebuild the project:"
echo "   npm run macos"
echo ""

# Check if files exist
if [ -f "macos/ChatViewer-macOS/ChatDatabaseManager.swift" ] && [ -f "macos/ChatViewer-macOS/ChatDatabaseManager.m" ]; then
    echo "✅ Native module files are ready"
else
    echo "❌ Native module files not found"
    exit 1
fi

echo ""
echo "🔍 You can test the module using the CustomDatabaseTest component"
echo "   which is currently loaded in App.tsx"