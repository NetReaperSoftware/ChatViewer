import SQLite from 'react-native-sqlite-2';
import RNFS from 'react-native-fs';
import { expandPath } from '../utils/PathUtils';
import {
  ProcessedChat,
  ProcessedMessage,
  ProcessedAttachment,
} from '../types/DatabaseTypes';

export class DatabaseService {
  private db: any = null;
  private dbPath: string | null = null;

  async openDatabase(path: string): Promise<void> {
    const expandedPath = expandPath(path);
    console.log('Attempting to open database at:', expandedPath);
    
    try {
      // Close existing database if any
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      if (expandedPath.includes('/tmp/test_messages.db') || expandedPath === '/tmp/test_messages.db') {
        // For test database, create an empty database
        console.log('Creating test database...');
        this.db = SQLite.openDatabase({
          name: 'test_messages.db',
          location: 'default',
        });
        this.dbPath = expandedPath;
        
        // Create test data
        await this.createTestDatabase();
        console.log('Test database created successfully');
      } else {
        // For external files, copy to app's document directory first
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
        
        // Create a unique filename in the documents directory
        const documentsPath = RNFS.DocumentDirectoryPath;
        const fileName = `messages_${Date.now()}.db`;
        const localDbPath = `${documentsPath}/${fileName}`;
        
        console.log('Copying database to app directory:', localDbPath);
        
        // Copy the external file to our app's documents directory
        console.log(`Copying from: ${expandedPath}`);
        console.log(`Copying to: ${localDbPath}`);
        await RNFS.copyFile(expandedPath, localDbPath);
        console.log('Database file copied successfully');
        
        // Verify the copied file exists and check its size
        const copiedFileExists = await RNFS.exists(localDbPath);
        console.log(`Copied file exists: ${copiedFileExists}`);
        
        if (copiedFileExists) {
          const copiedStats = await RNFS.stat(localDbPath);
          console.log(`Copied file size: ${(copiedStats.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`Copied file permissions: ${copiedStats.mode}`);
          
          // Check if the file is readable
          try {
            const testRead = await RNFS.readFile(localDbPath, 'base64');
            console.log(`Copied file is readable, first 100 chars: ${testRead.substring(0, 100)}`);
          } catch (readError) {
            console.error('Cannot read copied file:', readError);
          }
        } else {
          throw new Error('File copy verification failed - copied file does not exist');
        }
        
        // Open the copied database with SQLite
        console.log('Opening copied database with SQLite...');
        console.log(`Attempting to open: ${localDbPath}`);
        
        try {
          // Try a simpler approach first - just the filename since it's in Documents
          const justFileName = fileName;
          console.log(`Trying to open with filename: ${justFileName}`);
          
          this.db = SQLite.openDatabase({
            name: justFileName,
            location: 'Documents',
          });
          this.dbPath = localDbPath;
          console.log('External database opened successfully');
        } catch (openError) {
          console.error('Failed to open database with filename, trying full path:', openError);
          
          // Try with full path as backup
          try {
            this.db = SQLite.openDatabase({
              name: localDbPath,
              location: 'default',
            });
            this.dbPath = localDbPath;
            console.log('External database opened successfully with full path');
          } catch (fullPathError) {
            console.error('Failed to open database with full path:', fullPathError);
            
            // Try the legacy API as a last resort
            try {
              console.log('Trying legacy SQLite API...');
              this.db = SQLite.openDatabase(justFileName, '1.0', '', 0);
              this.dbPath = localDbPath;
              console.log('External database opened successfully with legacy API');
            } catch (legacyError) {
              console.error('Failed to open database with legacy API:', legacyError);
              throw new Error(`Failed to open copied database with all methods: ${legacyError.message}`);
            }
          }
        }
        
        // Test the connection
        await this.testConnection();
      }
      
    } catch (error: any) {
      console.error('Error opening database:', error);
      this.db = null;
      this.dbPath = null;
      throw new Error(`Failed to open database: ${error.message}`);
    }
  }
  

  private async testConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('No database connection');
    }
    
    return new Promise((resolve, reject) => {
      console.log('Running basic connection test with SQLite...');
      
      // Add timeout for the test connection
      const timeoutId = setTimeout(() => {
        reject(new Error('Database connection test timed out'));
      }, 5000);
      
      // Test with a simple query
      this.db.transaction(
        (tx: any) => {
          tx.executeSql('SELECT 1 as test', [], (tx: any, result: any) => {
            console.log('Basic connection test passed');
            
            // Then check for Messages database tables
            tx.executeSql(
              'SELECT name FROM sqlite_master WHERE type="table" AND name="chat" LIMIT 1',
              [],
              (tx: any, tableResult: any) => {
                clearTimeout(timeoutId);
                if (tableResult.rows.length > 0) {
                  console.log('Confirmed this is a Messages database (found chat table)');
                } else {
                  console.log('Warning: This might not be a Messages database (no chat table found)');
                }
                resolve();
              },
              (tx: any, error: any) => {
                clearTimeout(timeoutId);
                console.error('Database table check failed:', error);
                resolve(); // Don't fail on table check, might be a different database
              }
            );
          }, (tx: any, error: any) => {
            clearTimeout(timeoutId);
            console.error('Database connection test failed:', error);
            reject(error);
          });
        },
        (error: any) => {
          clearTimeout(timeoutId);
          console.error('Transaction failed:', error);
          reject(error);
        },
        () => {
          console.log('Transaction completed successfully');
        }
      );
    });
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
      this.db.close();
      this.db = null;
    }
    this.dbPath = null;
  }

  private async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database is not open');
    }

    return new Promise((resolve, reject) => {
      console.log('Executing query:', query.substring(0, 100) + '...', 'with params:', params);

      this.db.transaction((tx: any) => {
        tx.executeSql(
          query,
          params,
          (tx: any, result: any) => {
            const results: T[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              results.push(result.rows.item(i) as T);
            }
            console.log('Query executed successfully, found', results.length, 'rows');
            resolve(results);
          },
          (tx: any, error: any) => {
            console.error('Query error:', error, 'Query:', query, 'Params:', params);
            reject(error);
          }
        );
      });
    });
  }

  async getChats(limit: number = 100): Promise<ProcessedChat[]> {
    console.log('Loading contacts/chats with limit:', limit);
    
    // Ultra-lightweight query - just get chat info, no message data at all
    const query = `
      SELECT 
        c.ROWID as id,
        c.guid,
        c.display_name,
        c.chat_identifier,
        c.service_name,
        c.style
      FROM chat c
      ORDER BY c.ROWID DESC
      LIMIT ?
    `;

    const chats = await this.executeQuery<any>(query, [limit]);
    console.log(`Found ${chats.length} chats/contacts from database`);

    // Process chats with zero additional queries - maximum speed
    const processedChats: ProcessedChat[] = chats.map((chat, index) => {
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