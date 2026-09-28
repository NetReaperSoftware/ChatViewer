import AppKit
import Foundation
import SQLite3

@objc(ChatDatabaseManager)
class ChatDatabaseManager: NSObject {
    private var db: OpaquePointer?
    private var dbPath: String?

    // Serial queue to ensure all database operations happen on the same thread
    private let dbQueue = DispatchQueue(label: "com.chatviewer.database", qos: .userInitiated)

    // MARK: - Database Management
    
    @objc func openDatabase(_ path: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        dbQueue.async { [weak self] in
            guard let self = self else {
                reject("MANAGER_NIL", "Database manager is nil", nil)
                return
            }
            
            // Close existing database if open
            self.closeDatabase()
            
            // Verify file exists
            guard FileManager.default.fileExists(atPath: path) else {
                reject("FILE_NOT_FOUND", "Database file not found at path: \(path)", nil)
                return
            }
            
            // Check file permissions and attributes
            do {
                let attrs = try FileManager.default.attributesOfItem(atPath: path)
                let fileSize = attrs[.size] as? Int64 ?? 0
                let fileSizeMB = Double(fileSize) / (1024 * 1024)
                let permissions = attrs[.posixPermissions] as? NSNumber
                print("📁 Opening database file: \(fileSizeMB) MB")
                print("🔐 File permissions: \(permissions?.stringValue ?? "unknown")")
                
                // Test file readability
                let isReadable = FileManager.default.isReadableFile(atPath: path)
                print("📖 File is readable: \(isReadable)")
                
                if !isReadable {
                    reject("FILE_NOT_READABLE", "Database file exists but is not readable: \(path)", nil)
                    return
                }
            } catch {
                print("⚠️ Could not get file attributes: \(error)")
                reject("FILE_ATTRIBUTES_ERROR", "Could not get file attributes: \(error.localizedDescription)", nil)
                return
            }
            
            // Open database with SQLite3 in read-write mode for WAL checkpoint
            print("🔓 Attempting to open SQLite database...")
            let result = sqlite3_open_v2(path, &self.db, SQLITE_OPEN_READWRITE, nil)
            
            if result != SQLITE_OK {
                let errorMessage = String(cString: sqlite3_errmsg(self.db))
                let errorCode = result
                print("❌ SQLite error code: \(errorCode)")
                print("❌ SQLite error message: \(errorMessage)")
                
                // Check specific error codes
                switch result {
                case SQLITE_CANTOPEN:
                    print("🔒 SQLITE_CANTOPEN: Unable to open the database file")
                case SQLITE_PERM:
                    print("🔒 SQLITE_PERM: Access permission denied")
                case SQLITE_NOTADB:
                    print("🔒 SQLITE_NOTADB: File is not a database")
                default:
                    print("🔒 Other SQLite error: \(errorCode)")
                }
                
                sqlite3_close(self.db)
                self.db = nil
                reject("SQLITE_ERROR", "Failed to open database (code \(errorCode)): \(errorMessage)", nil)
                return
            }
            
            print("✅ SQLite database opened successfully")
            
            self.dbPath = path
            
            // Handle WAL mode - perform checkpoint to consolidate data
            self.handleWALMode()
            
            // Configure database for optimal performance
            self.configureDatabase()
            
            // Test the database immediately after opening
            print("🧪 Testing database immediately after opening...")
            var testStatement: OpaquePointer?
            let testSQL = "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
            let testResult = sqlite3_prepare_v2(self.db, testSQL, -1, &testStatement, nil)
            
            if testResult == SQLITE_OK {
                if sqlite3_step(testStatement) == SQLITE_ROW {
                    let tableCount = sqlite3_column_int(testStatement, 0)
                    print("✅ Immediate test successful: Found \(tableCount) tables")
                } else {
                    print("❌ Immediate test: Failed to execute test query")
                }
                sqlite3_finalize(testStatement)
            } else {
                let errorMessage = String(cString: sqlite3_errmsg(self.db))
                print("❌ Immediate test: Failed to prepare test query: \(errorMessage)")
            }
            
            DispatchQueue.main.async {
                resolve(["success": true, "path": path])
            }
        }
    }
    
    private func handleWALMode() {
        guard let db = self.db else { return }
        
        print("🔄 Checking WAL mode and performing checkpoint...")
        
        // Check if database is in WAL mode
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, "PRAGMA journal_mode", -1, &statement, nil) == SQLITE_OK {
            if sqlite3_step(statement) == SQLITE_ROW {
                if let journalMode = sqlite3_column_text(statement, 0) {
                    let mode = String(cString: journalMode)
                    print("📝 Journal mode: \(mode)")
                    
                    if mode.lowercased() == "wal" {
                        print("🔄 Database is in WAL mode, performing checkpoint...")
                        
                        // Perform WAL checkpoint to merge WAL file into main database
                        sqlite3_finalize(statement)
                        
                        if sqlite3_prepare_v2(db, "PRAGMA wal_checkpoint(FULL)", -1, &statement, nil) == SQLITE_OK {
                            let result = sqlite3_step(statement)
                            if result == SQLITE_ROW {
                                let busy = sqlite3_column_int(statement, 0)
                                let log = sqlite3_column_int(statement, 1)
                                let checkpointed = sqlite3_column_int(statement, 2)
                                print("✅ WAL checkpoint completed: busy=\(busy), log=\(log), checkpointed=\(checkpointed)")
                            } else {
                                print("⚠️ WAL checkpoint returned: \(result)")
                            }
                        } else {
                            print("❌ Failed to prepare WAL checkpoint")
                        }
                    }
                }
            }
        }
        sqlite3_finalize(statement)
    }
    
    private func configureDatabase() {
        guard let db = self.db else { return }

        // Set pragmas for better performance with large databases
        let pragmas = [
            "PRAGMA synchronous = OFF",
            "PRAGMA cache_size = 10000",
            "PRAGMA temp_store = memory",
            "PRAGMA mmap_size = 268435456" // 256MB
        ]

        for pragma in pragmas {
            var statement: OpaquePointer?
            if sqlite3_prepare_v2(db, pragma, -1, &statement, nil) == SQLITE_OK {
                sqlite3_step(statement)
            }
            sqlite3_finalize(statement)
        }

        // Create search performance indices if they don't exist
        print("🔍 Creating search performance indices...")
        createSearchIndices()

        print("🚀 Database configured for performance")
    }

    private func createSearchIndices() {
        guard let db = self.db else { return }

        // Indices to improve search performance
        // Using IF NOT EXISTS to safely create indices on existing databases
        let indices = [
            // Index on message.date for ORDER BY date DESC
            "CREATE INDEX IF NOT EXISTS idx_message_date ON message(date DESC)",

            // Index on message.text for LIKE searches (partial match from beginning)
            // Note: SQLite can use indices for LIKE 'term%' but not '%term%'
            // This helps with prefix searches and general query optimization
            "CREATE INDEX IF NOT EXISTS idx_message_text ON message(text)",

            // Index on message.handle_id for joins
            "CREATE INDEX IF NOT EXISTS idx_message_handle ON message(handle_id)",

            // Index on chat_message_join for joins
            "CREATE INDEX IF NOT EXISTS idx_chat_message_chat ON chat_message_join(chat_id)",
            "CREATE INDEX IF NOT EXISTS idx_chat_message_msg ON chat_message_join(message_id)",

            // Index on handle.id for searches and joins
            "CREATE INDEX IF NOT EXISTS idx_handle_id ON handle(id)",

            // Index on chat fields for searches
            "CREATE INDEX IF NOT EXISTS idx_chat_identifier ON chat(chat_identifier)",
            "CREATE INDEX IF NOT EXISTS idx_chat_display_name ON chat(display_name)",

            // Composite index for common search pattern: date + text
            "CREATE INDEX IF NOT EXISTS idx_message_date_text ON message(date DESC, text)"
        ]

        for indexSQL in indices {
            var statement: OpaquePointer?
            if sqlite3_prepare_v2(db, indexSQL, -1, &statement, nil) == SQLITE_OK {
                let result = sqlite3_step(statement)
                if result == SQLITE_DONE {
                    // Extract index name from SQL for logging
                    if let indexName = indexSQL.components(separatedBy: "idx_").last?.components(separatedBy: " ").first {
                        print("✅ Index idx_\(indexName) ready")
                    }
                } else if result != SQLITE_OK {
                    let errorMessage = String(cString: sqlite3_errmsg(db))
                    print("⚠️ Index creation returned \(result): \(errorMessage)")
                }
            } else {
                let errorMessage = String(cString: sqlite3_errmsg(db))
                print("❌ Failed to prepare index: \(errorMessage)")
            }
            sqlite3_finalize(statement)
        }

        print("✅ Search indices configured")
    }

    @objc func closeDatabase() {
        if let db = self.db {
            sqlite3_close(db)
            self.db = nil
            self.dbPath = nil
            print("🔒 Database closed")
        }
    }
    
    // MARK: - Query Execution
    
    @objc func executeQuery(_ sql: String, params: [Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        dbQueue.async { [weak self] in
            guard let self = self else {
                reject("MANAGER_NIL", "Database manager is nil", nil)
                return
            }
            
            guard let db = self.db else {
                reject("DATABASE_CLOSED", "Database is not open", nil)
                return
            }
            
            print("🔍 Executing query: \(sql)")
            print("📊 Parameters: \(params)")
            print("🗃️ Database handle valid: \(db != nil)")
            print("🗂️ Database path: \(self.dbPath ?? "nil")")
            
            var statement: OpaquePointer?
            
            // Prepare statement
            print("🔧 Preparing SQL statement...")
            let prepareResult = sqlite3_prepare_v2(db, sql, -1, &statement, nil)
            
            if prepareResult != SQLITE_OK {
                let errorMessage = String(cString: sqlite3_errmsg(db))
                let errorCode = prepareResult
                print("❌ Prepare failed with code: \(errorCode)")
                print("❌ Prepare error message: \(errorMessage)")
                
                // Check specific error codes
                switch prepareResult {
                case SQLITE_CANTOPEN:
                    print("🔒 SQLITE_CANTOPEN during prepare: Unable to open the database file")
                case SQLITE_PERM:
                    print("🔒 SQLITE_PERM during prepare: Access permission denied")
                case SQLITE_NOTADB:
                    print("🔒 SQLITE_NOTADB during prepare: File is not a database")
                case SQLITE_CORRUPT:
                    print("🔒 SQLITE_CORRUPT during prepare: Database is corrupted")
                default:
                    print("🔒 Other SQLite prepare error: \(errorCode)")
                }
                
                reject("PREPARE_ERROR", "Failed to prepare statement (code \(errorCode)): \(errorMessage)", nil)
                return
            }
            
            print("✅ Statement prepared successfully")
            
            // Bind parameters
            for (index, param) in params.enumerated() {
                let bindIndex = Int32(index + 1)

                if let stringParam = param as? String {
                    print("🔗 Binding param \(bindIndex) as STRING: '\(stringParam)'")
                    sqlite3_bind_text(statement, bindIndex, (stringParam as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                } else if let intParam = param as? Int {
                    print("🔗 Binding param \(bindIndex) as INT: \(intParam)")
                    sqlite3_bind_int64(statement, bindIndex, Int64(intParam))
                } else if let doubleParam = param as? Double {
                    print("🔗 Binding param \(bindIndex) as DOUBLE: \(doubleParam)")
                    sqlite3_bind_double(statement, bindIndex, doubleParam)
                } else if param is NSNull {
                    print("🔗 Binding param \(bindIndex) as NULL")
                    sqlite3_bind_null(statement, bindIndex)
                } else {
                    print("⚠️ Unknown param type at \(bindIndex): \(type(of: param))")
                }
            }
            
            // Execute query and collect results
            var results: [[String: Any]] = []
            let columnCount = sqlite3_column_count(statement)
            
            print("🔍 Query has \(columnCount) columns")
            var rowCount = 0
            
            while sqlite3_step(statement) == SQLITE_ROW {
                rowCount += 1
                var row: [String: Any] = [:]
                
                for i in 0..<columnCount {
                    let columnName = String(cString: sqlite3_column_name(statement, i))
                    let columnType = sqlite3_column_type(statement, i)
                    
                    switch columnType {
                    case SQLITE_INTEGER:
                        row[columnName] = sqlite3_column_int64(statement, i)
                    case SQLITE_FLOAT:
                        row[columnName] = sqlite3_column_double(statement, i)
                    case SQLITE_TEXT:
                        if let text = sqlite3_column_text(statement, i) {
                            let textValue = String(cString: text)
                            row[columnName] = textValue
                            if columnName == "text" {
                                print("📝 Text column for message: '\(textValue)'")
                            }
                            if columnName == "message_service" {
                                print("🔧 Service column: '\(textValue)'")
                            }
                        } else {
                            if columnName == "text" {
                                print("📝 Text column is NULL")
                            }
                        }
                    case SQLITE_BLOB:
                        let bytes = sqlite3_column_blob(statement, i)
                        let size = sqlite3_column_bytes(statement, i)
                        if let bytes = bytes {
                            row[columnName] = Data(bytes: bytes, count: Int(size))
                        }
                    default:
                        row[columnName] = NSNull()
                    }
                }
                
                results.append(row)
            }
            
            sqlite3_finalize(statement)
            
            print("🔍 Query returned \(rowCount) rows, results array has \(results.count) items")
            
            DispatchQueue.main.async {
                resolve(["rows": results, "count": results.count])
            }
        }
    }
    
    // MARK: - Messages-Specific Queries
    
    @objc func getChats(_ limit: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("🔍 getChats called with limit: \(limit)")
        
        let sql: String
        let params: [Any]
        
        if limit > 0 {
            sql = """
                SELECT 
                    c.ROWID as id,
                    c.guid,
                    c.display_name,
                    c.chat_identifier,
                    c.service_name,
                    c.style
                FROM chat c
                WHERE EXISTS (
                    SELECT 1 FROM chat_message_join cmj 
                    JOIN message m ON cmj.message_id = m.ROWID 
                    WHERE cmj.chat_id = c.ROWID 
                    AND (m.service NOT IN ('SMS', 'RCS') OR m.service IS NULL)
                    AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
                )
                ORDER BY c.ROWID DESC
                LIMIT ?
            """
            params = [limit]
        } else {
            // No limit - get all chats
            sql = """
                SELECT 
                    c.ROWID as id,
                    c.guid,
                    c.display_name,
                    c.chat_identifier,
                    c.service_name,
                    c.style
                FROM chat c
                WHERE EXISTS (
                    SELECT 1 FROM chat_message_join cmj 
                    JOIN message m ON cmj.message_id = m.ROWID 
                    WHERE cmj.chat_id = c.ROWID 
                    AND (m.service NOT IN ('SMS', 'RCS') OR m.service IS NULL)
                    AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
                )
                ORDER BY c.ROWID DESC
            """
            params = []
        }
        
        print("🔍 Executing getChats query: \(sql)")
        executeQuery(sql, params: params, resolver: resolve, rejecter: reject)
    }
    
    @objc func searchMessages(_ searchTerm: String, limit: Int, startDate: NSNumber, endDate: NSNumber, phoneFilter: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let hasDateFilter = startDate.intValue != -1 && endDate.intValue != -1
        let hasPhoneFilter = !phoneFilter.isEmpty
        NSLog("🔍🔍🔍 SEARCHMESSAGES CALLED - searchTerm: '\(searchTerm)', limit: \(limit), hasDateFilter: \(hasDateFilter), phoneFilter: '\(phoneFilter)'")
        print("🔍 Searching for term: '\(searchTerm)' with date filter: \(hasDateFilter), phone filter: \(hasPhoneFilter)")

        var sql = """
            SELECT
                m.ROWID as id,
                m.text,
                m.attributedBody,
                m.is_from_me,
                m.date,
                m.handle_id,
                h.id as handle_name,
                c.ROWID as chat_id,
                c.display_name as chat_display_name,
                c.chat_identifier,
                m.service as message_service,
                m.subject,
                m.cache_has_attachments,
                m.associated_message_guid,
                m.balloon_bundle_id
            FROM message m
            LEFT JOIN handle h ON m.handle_id = h.ROWID
            LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            LEFT JOIN chat c ON c.ROWID = cmj.chat_id
            WHERE (
                m.text LIKE ? OR
                m.subject LIKE ? OR
                m.associated_message_guid LIKE ? OR
                h.id LIKE ? OR
                c.chat_identifier LIKE ? OR
                c.display_name LIKE ?
            )
        """

        var params: [Any] = []
        let searchPattern = "%\(searchTerm)%"

        // Add search pattern parameters (6 total)
        for _ in 0..<6 {
            params.append(searchPattern)
        }

        // Add phone number filtering if provided
        if hasPhoneFilter {
            // Remove all non-digits for comparison - search in handle.id and chat.chat_identifier
            // Use REPLACE to strip out non-digit characters from database values
            sql += " AND (REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(h.id, '+', ''), '-', ''), '(', ''), ')', ''), ' ', '') LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.chat_identifier, '+', ''), '-', ''), '(', ''), ')', ''), ' ', '') LIKE ?)"
            let phonePattern = "%\(phoneFilter)%"
            params.append(phonePattern)
            params.append(phonePattern)
            print("🔍 Phone filter applied: \(phoneFilter)")
        }

        // Add date filtering if provided (check for sentinel value -1)
        if hasDateFilter {
            sql += " AND m.date >= ? AND m.date <= ?"
            params.append(startDate)
            params.append(endDate)
            print("🔍 Date filter applied: \(startDate) to \(endDate)")
        }

        sql += " ORDER BY m.date DESC LIMIT ?"
        params.append(limit)

        print("🔍 Executing search with \(params.count) parameters")
        executeQuery(sql, params: params, resolver: resolve, rejecter: reject)
    }
    
    @objc func getMessagesForChat(_ chatId: Int, limit: Int, offset: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("🔍 getMessagesForChat called with chatId: \(chatId), limit: \(limit), offset: \(offset)")
        
        let sql = """
            SELECT 
                m.ROWID as id,
                m.text,
                m.attributedBody,
                m.is_from_me,
                m.date,
                m.handle_id,
                h.id as handle_name,
                m.cache_has_attachments,
                m.service as message_service,
                m.subject,
                m.is_empty,
                m.is_system_message
            FROM message m
            LEFT JOIN handle h ON m.handle_id = h.ROWID
            JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            WHERE cmj.chat_id = ?
            AND (m.service NOT IN ('SMS', 'RCS') OR m.service IS NULL)
            AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
            ORDER BY m.date DESC
            LIMIT ? OFFSET ?
        """
        
        print("🔍 Executing getMessagesForChat query: \(sql)")
        executeQuery(sql, params: [chatId, limit, offset], resolver: resolve, rejecter: reject)
    }
    
    // MARK: - File Picker

    /// Shows a Finder open panel. The user can pick a database file directly, or a folder
    /// containing chat.db. Resolves with the database path, or nil if the user cancels.
    @objc func pickDatabase(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // RN promise blocks are safe to call from any thread; box them so they can cross into the main actor
        let promise = PromiseBox(resolve: resolve, reject: reject)
        DispatchQueue.main.async {
            let panel = NSOpenPanel()
            panel.title = "Select Messages Database"
            panel.message = "Choose a chat.db file, or a folder that contains one."
            panel.prompt = "Open"
            panel.canChooseFiles = true
            panel.canChooseDirectories = true
            panel.allowsMultipleSelection = false
            panel.canCreateDirectories = false
            panel.showsHiddenFiles = false

            let home = FileManager.default.homeDirectoryForCurrentUser
            let startDir = home.appendingPathComponent("Library/Messages")
            panel.directoryURL = FileManager.default.fileExists(atPath: startDir.path) ? startDir : home

            let handleResponse: (NSApplication.ModalResponse) -> Void = { response in
                guard response == .OK, let url = panel.url else {
                    promise.resolve(nil)
                    return
                }

                var isDir: ObjCBool = false
                FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)

                if isDir.boolValue {
                    let dbURL = url.appendingPathComponent("chat.db")
                    guard FileManager.default.fileExists(atPath: dbURL.path) else {
                        promise.reject("NO_CHAT_DB", "No chat.db found in folder: \(url.path)", nil)
                        return
                    }
                    print("📂 Selected folder, using database: \(dbURL.path)")
                    promise.resolve(dbURL.path)
                } else {
                    print("📄 Selected database file: \(url.path)")
                    promise.resolve(url.path)
                }
            }

            if let window = NSApp.keyWindow ?? NSApp.mainWindow {
                panel.beginSheetModal(for: window, completionHandler: handleResponse)
            } else {
                handleResponse(panel.runModal())
            }
        }
    }

    // MARK: - React Native Module Requirements
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}

private final class PromiseBox: @unchecked Sendable {
    let resolve: RCTPromiseResolveBlock
    let reject: RCTPromiseRejectBlock

    init(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        self.resolve = resolve
        self.reject = reject
    }
}
