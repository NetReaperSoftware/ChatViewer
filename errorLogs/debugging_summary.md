# ChatViewer Missing Message Investigation Summary

## Problem Statement
Messages showing as "[Empty Message]" in the ChatViewer app despite containing actual text content. Specifically, a message containing "brainwashed" exists in the database hex dump but cannot be retrieved via standard SQL queries.

## Evidence
- Hex dump command `xxd chat.db | grep 'brainwashed'` returns: `03abd680: 2062 7261 696e 7761 7368 6564 2061 6e64   brainwashed and`
- Message appears as "[Empty Message]" in the app interface
- Standard SQL queries return 0 results for the search term
- Investigation shows 19 database tables including `deleted_messages` and `recoverable_message_part`

## Investigation Approach
Enhanced the database investigation system in `CustomDatabaseService.ts` with:

### 1. Comprehensive Table Search
- `deleted_messages` table analysis
- `recoverable_message_part` table analysis  
- `message_processing_task` table analysis
- Main `message` table deep dive with all BLOB fields

### 2. Enhanced Binary Data Analysis
- Full hex conversion of attributedBody BLOB data
- ASCII sequence extraction from binary data
- Hex pattern matching for specific search terms
- Context extraction around found patterns

### 3. Multiple Search Strategies  
- Standard text field searches
- JSON representation searches
- Hex pattern searches in binary data
- ASCII extraction from byte arrays

## Code Changes Made

### `searchForMissingText()` Method
- Removed broken LIKE queries that were failing
- Added comprehensive table schema investigation
- Implemented row-by-row JSON search for text patterns
- Added structured logging for each table investigation

### `debugAttributedBody()` Method
- Added full hex representation conversion
- Implemented hex pattern searching for specific terms
- Added ASCII sequence extraction from binary data
- Enhanced context extraction around found patterns
- Added multiple data format handling (arrays, Data objects, strings)

## Current Status
- Enhanced investigation code deployed
- Ready to test by opening the austinmarie11@icloud.com conversation
- Investigation will trigger automatically for chat ID 130 on first load
- Detailed logging will show exactly where missing text is stored

## Next Steps
1. Run the app and open austinmarie11@icloud.com conversation
2. Review investigation logs to locate the "brainwashed" text
3. Implement extraction logic based on findings
4. Apply same logic to all "[Empty Message]" entries

## Key Files Modified
- `src/services/CustomDatabaseService.ts` - Lines 631-762 (searchForMissingText)
- `src/services/CustomDatabaseService.ts` - Lines 539-649 (debugAttributedBody)

## Technical Notes
- Investigation triggers only for chat ID 130 (austinmarie11@icloud.com) 
- Only runs on first message load (offset === 0) to avoid spam
- Hex pattern for "brainwashed": `627261696e776173686564`
- Message likely stored in attributedBody BLOB field in Apple's NSAttributedString format