import SQLite from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';
import { expandPath } from '../utils/PathUtils';
import {
  ProcessedChat,
  ProcessedMessage,
  ProcessedAttachment,
} from '../types/DatabaseTypes';

// Enable debugging and promise-based API
SQLite.DEBUG(true);
SQLite.enablePromise(true);

export class DatabaseService {
  private db: any = null;
  private dbPath: string | null = null;

  async openDatabase(path: string): Promise<void> {
    const expandedPath = expandPath(path);
    console.log('Attempting to open database at:', expandedPath);
    
    try {
      // Close existing database if any
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      
      if (expandedPath.includes('/tmp/test_messages.db') || expandedPath === '/tmp/test_messages.db') {
        // For test database, create an empty database
        console.log('Creating test database...');
        this.db = await SQLite.openDatabase({
          name: 'test_messages.db',
          location: 'default',
        });
        console.log('Test database opened successfully');
        this.dbPath = expandedPath;
        
        // Create test data
        await this.createTestDatabase();
        console.log('Test database created successfully');
      } else {
        // For external files, implement plan1.txt solution
        console.log('Processing external database file:', expandedPath);
        
        // Check if source file exists
        const fileExists = await RNFS.exists(expandedPath);
        if (!fileExists) {
          throw new Error(`Database file does not exist: ${expandedPath}`);
        }
        
        // Get file stats to check size
        const fileStats = await RNFS.stat(expandedPath);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        console.log(`Source file size: ${fileSizeMB.toFixed(2)} MB`);
        
        if (fileStats.size > 500 * 1024 * 1024) { // 500MB limit
          throw new Error('Database file is too large (>500MB). Please use a smaller database file.');
        }
        
        // Check if the database is very large and warn about potential timeout issues
        if (fileStats.size > 50 * 1024 * 1024) { // 50MB+
          console.log(`⚠️  Large database detected (${fileSizeMB.toFixed(2)} MB) - may experience timeout issues`);
          console.log('Consider using a smaller Messages database file for testing');
        }
        
        // Extract base path for WAL and SHM files
        const basePath = expandedPath.replace('.db', '');
        const documentsPath = RNFS.DocumentDirectoryPath;
        const dbName = 'chat.db';
        const targetDbPath = `${documentsPath}/${dbName}`;
        
        console.log('Copying database and sidecar files...');
        console.log(`From: ${basePath}`);
        console.log(`To: ${documentsPath}`);
        console.log(`DocumentDirectoryPath resolved to: ${documentsPath}`);
        console.log(`Target database path: ${targetDbPath}`);
        
        // Verify the Documents directory exists
        const documentsExists = await RNFS.exists(documentsPath);
        console.log(`Documents directory exists: ${documentsExists}`);
        if (!documentsExists) {
          console.log('Creating Documents directory...');
          await RNFS.mkdir(documentsPath);
        }
        
        // Remove existing files if they exist to avoid conflicts
        console.log('Cleaning up existing database files...');
        await RNFS.unlink(targetDbPath).catch(() => {}); // Ignore error if file doesn't exist
        await RNFS.unlink(`${documentsPath}/chat.db-wal`).catch(() => {});
        await RNFS.unlink(`${documentsPath}/chat.db-shm`).catch(() => {});
        
        // Copy main database file
        console.log('Copying main database file...');
        await RNFS.copyFile(expandedPath, targetDbPath);
        
        // Copy WAL file if it exists
        const walPath = `${basePath}.db-wal`;
        const targetWalPath = `${documentsPath}/chat.db-wal`;
        if (await RNFS.exists(walPath)) {
          console.log('Copying WAL file...');
          await RNFS.copyFile(walPath, targetWalPath);
        } else {
          console.log('No WAL file found, skipping');
        }
        
        // Copy SHM file if it exists
        const shmPath = `${basePath}.db-shm`;
        const targetShmPath = `${documentsPath}/chat.db-shm`;
        if (await RNFS.exists(shmPath)) {
          console.log('Copying SHM file...');
          await RNFS.copyFile(shmPath, targetShmPath);
        } else {
          console.log('No SHM file found, skipping');
        }
        
        console.log('All database files copied successfully');
        
        // Verify the copied database file
        const copiedExists = await RNFS.exists(targetDbPath);
        if (!copiedExists) {
          throw new Error('Database copy verification failed');
        }
        
        const copiedStats = await RNFS.stat(targetDbPath);
        console.log(`Copied database size: ${(copiedStats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Open database using absolute path with location: 'default'
        console.log('Opening database with absolute path...');
        console.log(`Database path: ${targetDbPath}`);
        
        // Try opening without readOnly first to see if that helps with timeouts
        console.log('Attempting to open database without readOnly flag...');
        this.db = await SQLite.openDatabase({
          name: targetDbPath,  // Use full absolute path
          location: 'default',
          // Remove readOnly to see if it helps with the timeout issue
        });
        
        // Skip database configuration to avoid timeout issues
        console.log('Skipping database configuration to avoid timeouts');
        
        this.dbPath = targetDbPath;
        console.log('External database opened successfully with absolute path');
      }
      
      // Skip connection test for large databases - proceed directly
      console.log('Skipping connection test for large database - proceeding directly to data loading');
      
    } catch (error: any) {
      console.error('Error opening database:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Write error details to a file for debugging
      try {
        const errorLog = `
ERROR at ${new Date().toISOString()}:
Message: ${error.message}
Stack: ${error.stack}
Full Error: ${JSON.stringify(error, null, 2)}
Path attempted: ${expandedPath}
`;
        await RNFS.writeFile(
          `${RNFS.DocumentDirectoryPath}/db_error.txt`,
          errorLog,
          'utf8'
        );
      } catch (logError) {
        console.error('Failed to write error log:', logError);
      }
      
      this.db = null;
      this.dbPath = null;
      throw new Error(`Failed to open database: ${error.message}`);
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('No database connection');
    }
    
    console.log('Running simple connection test...');
    
    try {
      // Use a much simpler and faster connection test
      await new Promise<void>((resolve, reject) => {
        // Set a longer timeout for large databases
        const timeoutId = setTimeout(() => {
          reject(new Error('Connection test timed out after 60 seconds'));
        }, 60000);
        
        this.db.transaction((tx: any) => {
          // Just check if we can execute a simple query
          tx.executeSql(
            'SELECT 1 as test',
            [],
            (_: any, results: any) => {
              clearTimeout(timeoutId);
              if (results.rows.length > 0) {
                console.log('✅ Database connection test successful');
                
                // Quick check for chat table existence without listing all tables
                tx.executeSql(
                  'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="chat"',
                  [],
                  (_: any, chatResults: any) => {
                    const hasChat = chatResults.rows.item(0).count > 0;
                    if (hasChat) {
                      console.log('✅ Chat table found - database appears valid');
                      RNFS.writeFile(
                        `${RNFS.DocumentDirectoryPath}/db_success.txt`,
                        `SUCCESS: Database connection and chat table verified at ${new Date().toISOString()}`,
                        'utf8'
                      ).catch(() => {});
                    } else {
                      console.log('❌ Chat table not found');
                      RNFS.writeFile(
                        `${RNFS.DocumentDirectoryPath}/db_failure.txt`,
                        `FAILURE: Chat table not found at ${new Date().toISOString()}`,
                        'utf8'
                      ).catch(() => {});
                    }
                    resolve();
                  },
                  (_: any, error: any) => {
                    console.error('Chat table check failed:', error);
                    resolve(); // Still resolve since basic connection worked
                    return false;
                  }
                );
              } else {
                clearTimeout(timeoutId);
                reject(new Error('Connection test returned no results'));
              }
            },
            (_: any, error: any) => {
              clearTimeout(timeoutId);
              console.error('Connection test failed:', error);
              reject(error);
              return false;
            }
          );
        }, (error: any) => {
          clearTimeout(timeoutId);
          console.error('Transaction failed:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Connection test error:', error);
      throw error;
    }
  }

  async createTestDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('No database connection');
    }

    return new Promise((resolve, reject) => {
      console.log('Creating test database schema and data...');
      
      this.db.transaction((tx: any) => {
        // Drop existing tables to ensure clean schema
        const dropTables = [
          'DROP TABLE IF EXISTS chat_handle_join',
          'DROP TABLE IF EXISTS chat_message_join', 
          'DROP TABLE IF EXISTS message_attachment_join',
          'DROP TABLE IF EXISTS message',
          'DROP TABLE IF EXISTS attachment',
          'DROP TABLE IF EXISTS handle',
          'DROP TABLE IF EXISTS chat'
        ];

        // Execute drop statements
        dropTables.forEach(sql => {
          tx.executeSql(sql, [], null, (tx: any, error: any) => {
            console.log('Error dropping table:', error);
          });
        });

        // Create test tables with correct Messages schema
        const createTables = [
          `CREATE TABLE chat (
            ROWID INTEGER PRIMARY KEY,
            guid TEXT,
            display_name TEXT,
            chat_identifier TEXT,
            service_name TEXT,
            style INTEGER
          )`,
          `CREATE TABLE handle (
            ROWID INTEGER PRIMARY KEY,
            id TEXT,
            service TEXT
          )`,
          `CREATE TABLE message (
            ROWID INTEGER PRIMARY KEY,
            text TEXT,
            attributedBody BLOB,
            is_from_me INTEGER,
            date INTEGER,
            handle_id INTEGER,
            cache_has_attachments INTEGER
          )`,
          `CREATE TABLE chat_message_join (
            chat_id INTEGER,
            message_id INTEGER
          )`,
          `CREATE TABLE chat_handle_join (
            chat_id INTEGER,
            handle_id INTEGER  
          )`,
          `CREATE TABLE attachment (
            ROWID INTEGER PRIMARY KEY,
            filename TEXT,
            mime_type TEXT,
            total_bytes INTEGER,
            is_sticker INTEGER
          )`,
          `CREATE TABLE message_attachment_join (
            message_id INTEGER,
            attachment_id INTEGER
          )`
        ];

        // Execute create table statements
        createTables.forEach(sql => {
          tx.executeSql(sql, [], null, (tx: any, error: any) => {
            console.error('Error creating table:', error);
          });
        });

        // Insert sample data
        const insertStatements = [
          `INSERT INTO chat (ROWID, guid, display_name, chat_identifier, service_name, style) 
           VALUES (1, 'test-chat-1', 'Test Chat', '+1234567890', 'iMessage', 45)`,
          `INSERT INTO handle (ROWID, id, service) 
           VALUES (1, '+1234567890', 'iMessage')`,
          `INSERT INTO message (ROWID, text, attributedBody, is_from_me, date, handle_id, cache_has_attachments) 
           VALUES (1, 'Hello, this is a test message!', NULL, 0, 0, 1, 0)`,
          `INSERT INTO message (ROWID, text, attributedBody, is_from_me, date, handle_id, cache_has_attachments) 
           VALUES (2, 'This is my reply', NULL, 1, 1, 1, 0)`,
          `INSERT INTO chat_message_join (chat_id, message_id) 
           VALUES (1, 1)`,
          `INSERT INTO chat_message_join (chat_id, message_id) 
           VALUES (1, 2)`,
          `INSERT INTO chat_handle_join (chat_id, handle_id) 
           VALUES (1, 1)`
        ];

        // Execute insert statements
        insertStatements.forEach(sql => {
          tx.executeSql(sql, [], null, (tx: any, error: any) => {
            console.error('Error inserting data:', error);
          });
        });

      }, (error: any) => {
        console.error('Error creating test database:', error);
        reject(error);
      }, () => {
        console.log('Test database created successfully');
        resolve();
      });
    });
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    this.dbPath = null;
  }

  private async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database is not open');
    }

    console.log('Executing query:', query.substring(0, 100) + '...', 'with params:', params);

    // Try direct executeSql instead of transaction-based approach
    if (typeof this.db.executeSql === 'function') {
      console.log('Using direct executeSql method...');
      return new Promise((resolve, reject) => {
        this.db.executeSql(
          query,
          params,
          (result: any) => {
            const results: T[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              results.push(result.rows.item(i) as T);
            }
            console.log('Direct query executed successfully, found', results.length, 'rows');
            resolve(results);
          },
          (error: any) => {
            console.error('Direct query error:', error, 'Query:', query, 'Params:', params);
            reject(error);
          }
        );
      });
    }

    // Fallback to transaction approach if direct executeSql not available
    console.log('Falling back to transaction-based query...');
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          query,
          params,
          (tx: any, result: any) => {
            const results: T[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              results.push(result.rows.item(i) as T);
            }
            console.log('Transaction query executed successfully, found', results.length, 'rows');
            resolve(results);
          },
          (tx: any, error: any) => {
            console.error('Transaction query error:', error, 'Query:', query, 'Params:', params);
            reject(error);
            return false;
          }
        );
      }, (error: any) => {
        console.error('Transaction failed:', error);
        reject(error);
      });
    });
  }

  async getChats(limit: number = 100): Promise<ProcessedChat[]> {
    console.log('Loading contacts/chats with limit:', limit);
    
    // Try the simplest possible query first - just check if we can access the table
    console.log('Testing database with ultra-simple query...');
    try {
      const testQuery = 'SELECT 1 FROM chat LIMIT 1';
      const testResult = await this.executeQuery<{1: number}>(testQuery, []);
      console.log(`Database is accessible, got ${testResult.length} test result(s)`);
    } catch (testError) {
      console.error('Simple test query failed:', testError);
      console.log('Attempting to continue despite test failure...');
      // Don't throw here - let's try to continue
    }
    
    // Ultra-lightweight query - just get basic chat info with smaller limit first
    const actualLimit = Math.min(limit, 10); // Start with just 10 rows for testing
    console.log(`Loading first ${actualLimit} chats...`);
    
    const query = `
      SELECT 
        c.ROWID as id,
        c.display_name,
        c.chat_identifier
      FROM chat c
      ORDER BY c.ROWID DESC
      LIMIT ?
    `;

    const chats = await this.executeQuery<any>(query, [actualLimit]);
    console.log(`Found ${chats.length} chats/contacts from database`);

    // Process chats with zero additional queries - maximum speed
    const processedChats: ProcessedChat[] = chats.map((chat) => {
      // Determine display name efficiently
      let displayName: string;
      
      if (chat.display_name) {
        displayName = chat.display_name;
      } else if (chat.chat_identifier) {
        // Clean up phone numbers and email addresses for display
        if (chat.chat_identifier.includes('@')) {
          displayName = chat.chat_identifier; // Email address
        } else {
          // Format phone number
          const cleaned = chat.chat_identifier.replace(/\D/g, '');
          if (cleaned.length === 10) {
            displayName = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
          } else if (cleaned.length === 11 && cleaned[0] === '1') {
            displayName = `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
          } else {
            displayName = chat.chat_identifier;
          }
        }
      } else {
        displayName = `Contact ${chat.id}`;
      }

      return {
        id: chat.id,
        guid: chat.guid,
        displayName,
        isGroupChat: chat.style === 45,
        participants: [], // Will be loaded only when conversation is selected
        lastMessage: undefined, // Will be loaded only when conversation is selected
        messageCount: 0, // Will be loaded only when conversation is selected
      };
    });

    console.log(`Processed ${processedChats.length} contacts/chats instantly`);
    return processedChats;
  }

  async getChatParticipants(chatId: number): Promise<string[]> {
    const query = `
      SELECT h.id
      FROM handle h
      JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
      WHERE chj.chat_id = ?
    `;

    const handles = await this.executeQuery<{id: string}>(query, [chatId]);
    return handles.map(h => this.formatPhoneNumber(h.id));
  }

  async getLastMessageForChat(chatId: number): Promise<ProcessedMessage | undefined> {
    const query = `
      SELECT 
        m.ROWID as id,
        m.text,
        m.attributedBody,
        m.is_from_me,
        m.date,
        m.handle_id,
        h.id as handle_name
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ?
      ORDER BY m.date DESC
      LIMIT 1
    `;

    const messages = await this.executeQuery<any>(query, [chatId]);
    if (messages.length === 0) return undefined;

    const msg = messages[0];
    return {
      id: msg.id,
      text: await this.extractMessageText(msg),
      isFromMe: msg.is_from_me === 1,
      timestamp: this.convertAppleTimestamp(msg.date),
      handleId: msg.handle_id,
      handleName: this.formatPhoneNumber(msg.handle_name),
      isGroupMessage: false, // Will be set by caller
      chatId,
    };
  }

  async getMessagesForChat(chatId: number, limit: number = 100, offset: number = 0): Promise<ProcessedMessage[]> {
    console.log(`Loading messages for chat ${chatId} (limit: ${limit}, offset: ${offset})`);
    
    const query = `
      SELECT 
        m.ROWID as id,
        m.text,
        m.attributedBody,
        m.is_from_me,
        m.date,
        m.handle_id,
        h.id as handle_name,
        m.cache_has_attachments
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ?
      ORDER BY m.date DESC
      LIMIT ? OFFSET ?
    `;

    const messages = await this.executeQuery<any>(query, [chatId, limit, offset]);
    console.log(`Found ${messages.length} messages for chat ${chatId}`);
    
    const processedMessages: ProcessedMessage[] = [];

    for (const msg of messages) {
      // Only load attachments if they exist to save time
      const attachments = msg.cache_has_attachments === 1 ? await this.getAttachmentsForMessage(msg.id) : [];
      
      processedMessages.push({
        id: msg.id,
        text: await this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id,
        handleName: this.formatPhoneNumber(msg.handle_name),
        attachments,
        isGroupMessage: false, // Will be determined by the caller based on chat type
        chatId,
      });
    }

    console.log(`Processed ${processedMessages.length} messages for chat ${chatId}`);
    // Reverse to show oldest first (chronological order)
    return processedMessages.reverse();
  }

  // New method to get chat metadata on-demand
  async getChatInfo(chatId: number): Promise<{messageCount: number, lastMessageDate?: Date}> {
    const query = `
      SELECT 
        COUNT(m.ROWID) as message_count,
        MAX(m.date) as last_message_date
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE cmj.chat_id = ?
    `;

    const result = await this.executeQuery<any>(query, [chatId]);
    if (result.length > 0) {
      const row = result[0];
      return {
        messageCount: row.message_count || 0,
        lastMessageDate: row.last_message_date ? this.convertAppleTimestamp(row.last_message_date) : undefined
      };
    }
    
    return { messageCount: 0 };
  }

  async getAttachmentsForMessage(messageId: number): Promise<ProcessedAttachment[]> {
    const query = `
      SELECT 
        a.ROWID as id,
        a.filename,
        a.mime_type,
        a.total_bytes,
        a.is_sticker
      FROM attachment a
      JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
      WHERE maj.message_id = ?
    `;

    const attachments = await this.executeQuery<any>(query, [messageId]);
    return attachments.map(att => ({
      id: att.id,
      filename: att.filename || 'Unknown',
      mimeType: att.mime_type || 'application/octet-stream',
      totalBytes: att.total_bytes || 0,
      isSticker: att.is_sticker === 1,
    }));
  }

  async searchMessages(searchTerm: string, limit: number = 50): Promise<ProcessedMessage[]> {
    const query = `
      SELECT 
        m.ROWID as id,
        m.text,
        m.attributedBody,
        m.is_from_me,
        m.date,
        m.handle_id,
        h.id as handle_name,
        cmj.chat_id
      FROM message m
      LEFT JOIN handle h ON m.handle_id = h.ROWID
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      WHERE m.text LIKE ?
      ORDER BY m.date DESC
      LIMIT ?
    `;

    const messages = await this.executeQuery<any>(query, [`%${searchTerm}%`, limit]);
    const processedMessages: ProcessedMessage[] = [];

    for (const msg of messages) {
      processedMessages.push({
        id: msg.id,
        text: await this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id,
        handleName: this.formatPhoneNumber(msg.handle_name),
        isGroupMessage: false,
        chatId: msg.chat_id,
      });
    }

    return processedMessages;
  }

  private async extractMessageText(message: any): Promise<string> {
    // Handle legacy plain text messages
    if (message.text) {
      return message.text;
    }
    
    // Handle newer attributedBody format
    if (message.attributedBody) {
      // For now, we'll return a placeholder. In a full implementation,
      // you'd need to parse the Apple typedstream format
      return '[Rich Text Message]';
    }
    
    return '[Empty Message]';
  }

  private convertAppleTimestamp(timestamp: number): Date {
    // Apple timestamps are seconds since January 1, 2001, UTC
    // JavaScript timestamps are milliseconds since January 1, 1970, UTC
    const appleEpochStart = new Date('2001-01-01T00:00:00Z').getTime();
    return new Date(appleEpochStart + (timestamp * 1000));
  }

  private formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return 'Unknown';
    
    // Basic phone number formatting
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phoneNumber; // Return as-is if not a standard format
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  getCurrentDatabasePath(): string | null {
    return this.dbPath;
  }
}