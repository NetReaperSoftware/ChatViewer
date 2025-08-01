Console was cleared
debuggerWorker.js:69 RCTBridge required dispatch_sync to load RCTPlatform. This may lead to deadlocks
registerWarning @ LogBox.js:148
console.warn @ LogBox.js:71
logToConsole @ RCTLog.js:47
logIfNoNativeHook @ RCTLog.js:30
__callFunction @ MessageQueue.js:427
(anonymous) @ MessageQueue.js:113
__guard @ MessageQueue.js:368
callFunctionReturnFlushedQueue @ MessageQueue.js:112
(anonymous) @ debuggerWorker.js:69
debuggerWorker.js:69 Required dispatch_sync to load constants for RCTPlatform. This may lead to deadlocks
registerWarning @ LogBox.js:148
console.warn @ LogBox.js:71
logToConsole @ RCTLog.js:47
logIfNoNativeHook @ RCTLog.js:30
__callFunction @ MessageQueue.js:427
(anonymous) @ MessageQueue.js:113
__guard @ MessageQueue.js:368
callFunctionReturnFlushedQueue @ MessageQueue.js:112
(anonymous) @ debuggerWorker.js:69
debuggerWorker.js:69 Initializing SQLitePlugin
debuggerWorker.js:69 Detected docs path: /Users/daniel/Documents
debuggerWorker.js:69 Detected Library path: /Users/daniel/Library
debuggerWorker.js:69 no cloud sync at path: /Users/daniel/Library/LocalDatabase
debuggerWorker.js:69 Running application ChatViewer ({
    initialProps =     {
    };
    rootTag = 21;
})
debuggerWorker.js:69 Running "ChatViewer" with {"rootTag":21,"initialProps":{}}
MainScreen.tsx:53 Opening database...
CustomDatabaseService.ts:15 🚀 Opening database with custom module at: /Users/daniel/Documents/Messages/chat.db
CustomDatabaseService.ts:28 Opening main chat.db directly to preserve WAL relationship
CustomDatabaseService.ts:35 ✅ Database opened directly with custom module
CustomDatabaseService.ts:192 🔍 Testing database connection with custom module...
CustomDatabaseService.ts:202 ✅ Chat table found - database appears valid
MainScreen.tsx:59 Loading contacts and conversations...
CustomDatabaseService.ts:233 📱 Loading contacts/chats with custom module, limit: unlimited
CustomDatabaseService.ts:237 🔍 Testing simple count query first...
CustomDatabaseService.ts:239 📊 Count query result: {count: 1, rows: Array(1)}
CustomDatabaseService.ts:244 Found 345 chats/contacts from database
CustomDatabaseService.ts:283 ✅ Processed 345 contacts/chats with custom module
MainScreen.tsx:63 Loaded 345 chats from database
MainScreen.tsx:94 Loading messages for: austinmarie11@icloud.com
CustomDatabaseService.ts:296 📨 Loading messages for chat 130 (limit: 100, offset: 0)
CustomDatabaseService.ts:302 Found 100 messages for chat 130
CustomDatabaseService.ts:599 🔍 === DATABASE SCHEMA INVESTIGATION ===
CustomDatabaseService.ts:608 📋 All database tables: (19) ['_SqliteDatabaseProperties', 'attachment', 'chat', 'chat_handle_join', 'chat_message_join', 'chat_recoverable_message_join', 'deleted_messages', 'handle', 'kvtable', 'message', 'message_attachment_join', 'message_processing_task', 'recoverable_message_part', 'sqlite_sequence', 'sqlite_stat1', 'sync_deleted_attachments', 'sync_deleted_chats', 'sync_deleted_messages', 'unsynced_removed_recoverable_messages']
CustomDatabaseService.ts:616 📋 Message table schema: (85) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
CustomDatabaseService.ts:624 📋 Message-related tables: (9) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
CustomDatabaseService.ts:632 🔍 === SEARCHING FOR "brainwashed" IN ALL FIELDS ===
CustomDatabaseService.ts:649 🎯 Found 0 messages containing "brainwashed": []
CustomDatabaseService.ts:661 ✅ Table chat exists
CustomDatabaseService.ts:674 ❌ Table chat doesn't exist or search failed
CustomDatabaseService.ts:661 ✅ Table handle exists
CustomDatabaseService.ts:674 ❌ Table handle doesn't exist or search failed
CustomDatabaseService.ts:661 ✅ Table attachment exists
CustomDatabaseService.ts:674 ❌ Table attachment doesn't exist or search failed
CustomDatabaseService.ts:661 ✅ Table deleted_messages exists
CustomDatabaseService.ts:674 ❌ Table deleted_messages doesn't exist or search failed
CustomDatabaseService.ts:315 🔍 Investigating message 67689 (index 0): {id: 67689, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 67686 (index 2): {id: 67686, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 67616 (index 3): {id: 67616, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 65828 (index 4): {id: 65828, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 65437 (index 5): {id: 65437, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 65423 (index 7): {id: 65423, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 59155 (index 42): {id: 59155, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 59151 (index 43): {id: 59151, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 59116 (index 44): {id: 59116, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 59076 (index 46): {id: 59076, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56223 (index 50): {id: 56223, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56205 (index 67): {id: 56205, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56155 (index 77): {id: 56155, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56124 (index 78): {id: 56124, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56121 (index 81): {id: 56121, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56120 (index 82): {id: 56120, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56119 (index 83): {id: 56119, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56117 (index 85): {id: 56117, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56116 (index 86): {id: 56116, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56104 (index 96): {id: 56104, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:315 🔍 Investigating message 56089 (index 99): {id: 56089, hasText: false, textValue: null, textType: 'object', hasAttributedBody: false, …}
CustomDatabaseService.ts:350 ✅ Processed 100 messages for chat 130
MainScreen.tsx:102 Loaded 100 messages for austinmarie11@icloud.com