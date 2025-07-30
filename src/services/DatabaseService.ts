import SQLite from 'react-native-sqlite-2';
import { expandPath } from '../utils/PathUtils';
import type { WebsqlDatabase } from 'react-native-sqlite-2';
import {
  ProcessedChat,
  ProcessedMessage,
  ProcessedAttachment,
} from '../types/DatabaseTypes';

export class DatabaseService {
  private db: WebsqlDatabase | null = null;
  private dbPath: string | null = null;

  async openDatabase(path: string): Promise<void> {
    const expandedPath = expandPath(path);
    console.log('Attempting to open database at:', expandedPath);
    
    return new Promise((resolve, reject) => {
      try {
        // Close existing database if any
        if (this.db) {
          this.db = null;
        }
        
        // Determine database name based on path
        let dbName: string;
        if (expandedPath.includes('/tmp/test_messages.db') || expandedPath === '/tmp/test_messages.db') {
          // For test database, use a simple filename - it will be created in app's documents
          dbName = 'test_messages.db';
          console.log('Using test database mode with filename:', dbName);
        } else {
          // For actual files, try to use the full path
          dbName = expandedPath;
          console.log('Using full path mode:', dbName);
        }
        
        this.db = SQLite.openDatabase(dbName, '1.0', '', 1);
        this.dbPath = expandedPath;
        console.log('Database object created for:', dbName);
        
        // For test databases, create the test data first, then test connection
        if (expandedPath.includes('/tmp/test_messages.db') || expandedPath === '/tmp/test_messages.db') {
          console.log('Creating test database schema and data...');
          this.createTestDatabase()
            .then(() => {
              console.log('Test database created, testing connection...');
              return this.testConnection();
            })
            .then(() => {
              console.log('Database connection test successful');
              resolve();
            })
            .catch((error) => {
              console.error('Error creating test database or testing connection:', error);
              this.db = null;
              this.dbPath = null;
              reject(new Error(`Failed to create test database: ${error.message}`));
            });
        } else {
          // For existing databases, just test the connection
          this.testConnection()
            .then(() => {
              console.log('Database connection test successful');
              resolve();
            })
            .catch((testError) => {
              console.error('Database connection test failed:', testError);
              this.db = null;
              this.dbPath = null;
              reject(new Error(`Failed to connect to database: ${testError.message}`));
            });
        }
      } catch (error: any) {
        console.error('Error opening database:', error);
        this.db = null;
        this.dbPath = null;
        reject(new Error(`Unable to open database file: ${error.message}`));
      }
    });
  }
  
  private async testConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('No database connection'));
        return;
      }
      
      // Test with a simple query to verify the database is accessible
      this.db.readTransaction((tx) => {
        tx.executeSql(
          'SELECT name FROM sqlite_master WHERE type="table" LIMIT 1',
          [],
          (_, results) => {
            console.log('Database connection test passed');
            resolve();
          },
          (_, error) => {
            console.error('Database connection test failed:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async createTestDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('No database connection');
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        // Drop existing tables to ensure clean schema
        tx.executeSql(`DROP TABLE IF EXISTS chat_handle_join`);
        tx.executeSql(`DROP TABLE IF EXISTS chat_message_join`);
        tx.executeSql(`DROP TABLE IF EXISTS message_attachment_join`);
        tx.executeSql(`DROP TABLE IF EXISTS message`);
        tx.executeSql(`DROP TABLE IF EXISTS attachment`);
        tx.executeSql(`DROP TABLE IF EXISTS handle`);
        tx.executeSql(`DROP TABLE IF EXISTS chat`);

        // Create test tables with correct Messages schema
        tx.executeSql(`
          CREATE TABLE chat (
            ROWID INTEGER PRIMARY KEY,
            guid TEXT,
            display_name TEXT,
            chat_identifier TEXT,
            service_name TEXT,
            style INTEGER
          )
        `);

        tx.executeSql(`
          CREATE TABLE handle (
            ROWID INTEGER PRIMARY KEY,
            id TEXT,
            service TEXT
          )
        `);

        tx.executeSql(`
          CREATE TABLE message (
            ROWID INTEGER PRIMARY KEY,
            text TEXT,
            attributedBody BLOB,
            is_from_me INTEGER,
            date INTEGER,
            handle_id INTEGER,
            cache_has_attachments INTEGER
          )
        `);

        tx.executeSql(`
          CREATE TABLE chat_message_join (
            chat_id INTEGER,
            message_id INTEGER
          )
        `);

        tx.executeSql(`
          CREATE TABLE chat_handle_join (
            chat_id INTEGER,
            handle_id INTEGER
          )
        `);

        tx.executeSql(`
          CREATE TABLE attachment (
            ROWID INTEGER PRIMARY KEY,
            filename TEXT,
            mime_type TEXT,
            total_bytes INTEGER,
            is_sticker INTEGER
          )
        `);

        tx.executeSql(`
          CREATE TABLE message_attachment_join (
            message_id INTEGER,
            attachment_id INTEGER
          )
        `);

        // Insert sample data
        tx.executeSql(`
          INSERT INTO chat (ROWID, guid, display_name, chat_identifier, service_name, style) 
          VALUES (1, 'test-chat-1', 'Test Chat', '+1234567890', 'iMessage', 45)
        `);

        tx.executeSql(`
          INSERT INTO handle (ROWID, id, service) 
          VALUES (1, '+1234567890', 'iMessage')
        `);

        tx.executeSql(`
          INSERT INTO message (ROWID, text, attributedBody, is_from_me, date, handle_id, cache_has_attachments) 
          VALUES (1, 'Hello, this is a test message!', NULL, 0, 0, 1, 0)
        `);

        tx.executeSql(`
          INSERT INTO message (ROWID, text, attributedBody, is_from_me, date, handle_id, cache_has_attachments) 
          VALUES (2, 'This is my reply', NULL, 1, 1, 1, 0)
        `);

        tx.executeSql(`
          INSERT INTO chat_message_join (chat_id, message_id) 
          VALUES (1, 1), (1, 2)
        `);

        tx.executeSql(`
          INSERT INTO chat_handle_join (chat_id, handle_id) 
          VALUES (1, 1)
        `);
      }, 
      (error) => {
        console.error('Error creating test database:', error);
        reject(error);
      },
      () => {
        console.log('Test database created successfully');
        resolve();
      });
    });
  }

  async closeDatabase(): Promise<void> {
    return new Promise((resolve) => {
      // WebSQL databases don't have explicit close method
      // Just null out our references
      this.db = null;
      this.dbPath = null;
      resolve();
    });
  }

  private async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database is not open'));
        return;
      }

      this.db.readTransaction((tx) => {
        tx.executeSql(
          query,
          params,
          (_, results) => {
            const rows: T[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve(rows);
          },
          (_, error) => {
            console.error('Query error:', error, 'Query:', query);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  async getChats(): Promise<ProcessedChat[]> {
    const query = `
      SELECT 
        c.ROWID as id,
        c.guid,
        c.display_name,
        c.chat_identifier,
        c.service_name,
        c.style,
        COUNT(DISTINCT m.ROWID) as message_count,
        MAX(m.date) as last_message_date
      FROM chat c
      LEFT JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
      LEFT JOIN message m ON cmj.message_id = m.ROWID
      GROUP BY c.ROWID
      ORDER BY last_message_date DESC
    `;

    const chats = await this.executeQuery<any>(query);
    const processedChats: ProcessedChat[] = [];

    for (const chat of chats) {
      const participants = await this.getChatParticipants(chat.id);
      const lastMessage = await this.getLastMessageForChat(chat.id);
      
      // Determine display name
      let displayName = chat.display_name;
      if (!displayName) {
        if (chat.style === 45) { // Group chat
          displayName = participants.join(', ') || 'Group Chat';
        } else {
          displayName = participants[0] || chat.chat_identifier || 'Unknown';
        }
      }

      processedChats.push({
        id: chat.id,
        guid: chat.guid,
        displayName,
        isGroupChat: chat.style === 45,
        participants,
        lastMessage,
        messageCount: chat.message_count || 0,
      });
    }

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
      ORDER BY m.date ASC
      LIMIT ? OFFSET ?
    `;

    const messages = await this.executeQuery<any>(query, [chatId, limit, offset]);
    const processedMessages: ProcessedMessage[] = [];

    for (const msg of messages) {
      const attachments = msg.cache_has_attachments ? await this.getAttachmentsForMessage(msg.id) : [];
      
      processedMessages.push({
        id: msg.id,
        text: await this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id,
        handleName: this.formatPhoneNumber(msg.handle_name),
        attachments,
        isGroupMessage: true, // Assume group for now
        chatId,
      });
    }

    return processedMessages;
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