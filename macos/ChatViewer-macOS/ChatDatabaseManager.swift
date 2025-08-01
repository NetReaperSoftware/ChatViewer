import Foundation
import SQLite3

@objc(ChatDatabaseManager)
class ChatDatabaseManager: NSObject {
    private var db: OpaquePointer?
    private var dbPath: String?
    
    // MARK: - Database Management
    
    @objc func openDatabase(_ path: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
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
        
        print("🚀 Database configured for performance")
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
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
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
                    sqlite3_bind_text(statement, bindIndex, stringParam, -1, nil)
                } else if let intParam = param as? Int {
                    sqlite3_bind_int64(statement, bindIndex, Int64(intParam))
                } else if let doubleParam = param as? Double {
                    sqlite3_bind_double(statement, bindIndex, doubleParam)
                } else if param is NSNull {
                    sqlite3_bind_null(statement, bindIndex)
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
    
    @objc func searchMessages(_ searchTerm: String, limit: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        print("🔍 Searching for term: '\(searchTerm)' across ALL message history (no time limit)")
        
        let sql = """
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
            ORDER BY m.date DESC
        """
        
        let searchPattern = "%\(searchTerm)%"
        print("🔍 Executing historical search across all messages with pattern: '\(searchPattern)'")
        executeQuery(sql, params: [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern], resolver: resolve, rejecter: reject)
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
    
    // MARK: - React Native Module Requirements
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}