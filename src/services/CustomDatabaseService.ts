import RNFS from 'react-native-fs';
import { expandPath } from '../utils/PathUtils';
import ChatDatabaseModule, { ChatRow, MessageRow } from './ChatDatabaseModule';
import {
  ProcessedChat,
  ProcessedMessage,
  ProcessedAttachment,
} from '../types/DatabaseTypes';

export class CustomDatabaseService {
  private dbPath: string | null = null;
  private connected: boolean = false;

  async openDatabase(path: string): Promise<void> {
    const expandedPath = expandPath(path);
    console.log('🚀 Opening database with custom module at:', expandedPath);
    
    try {
      // Close existing database if any
      if (this.connected) {
        ChatDatabaseModule.closeDatabase();
        this.connected = false;
      }
      
      if (expandedPath.includes('/tmp/test_messages.db') || expandedPath === '/tmp/test_messages.db') {
        throw new Error('Test database not supported with custom module yet');
      } else if (expandedPath.includes('/Users/daniel/Downloads/Messages/chat.db') || expandedPath.includes('/Users/daniel/Documents/Messages/chat.db')) {
        // For the main chat.db file, try opening directly to preserve WAL relationship
        console.log('Opening main chat.db directly to preserve WAL relationship');
        
        const result = await ChatDatabaseModule.openDatabase(expandedPath);
        
        if (result.success) {
          this.dbPath = expandedPath;
          this.connected = true;
          console.log('✅ Database opened directly with custom module');
        } else {
          throw new Error('Failed to open database directly with custom module');
        }
      } else {
        // For external files, implement the same copying strategy as before
        console.log('Processing external database file:', expandedPath);
        
        // Check if source file exists
        const fileExists = await RNFS.exists(expandedPath);
        if (!fileExists) {
          throw new Error(`Database file does not exist: ${expandedPath}`);
        }
        
        // Get file stats to check size
        const fileStats = await RNFS.stat(expandedPath);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        console.log(`📊 Source file size: ${fileSizeMB.toFixed(2)} MB`);
        
        if (fileStats.size > 500 * 1024 * 1024) { // 500MB limit
          throw new Error('Database file is too large (>500MB). Please use a smaller database file.');
        }
        
        // Check if the database is very large and warn about potential issues
        if (fileStats.size > 50 * 1024 * 1024) { // 50MB+
          console.log(`⚠️  Large database detected (${fileSizeMB.toFixed(2)} MB)`);
        }
        
        // Extract base path for WAL and SHM files
        const basePath = expandedPath.replace('.db', '');
        // Try using temp directory instead of Documents for better permissions
        const tempPath = RNFS.TemporaryDirectoryPath;
        const dbName = 'chat.db';
        const targetDbPath = `${tempPath}/${dbName}`;
        
        console.log('📁 Copying database and sidecar files...');
        console.log(`From: ${basePath}`);
        console.log(`To: ${tempPath}`);
        
        // Verify the temp directory exists
        const tempExists = await RNFS.exists(tempPath);
        console.log(`Temp directory exists: ${tempExists}`);
        if (!tempExists) {
          console.log('Creating temp directory...');
          await RNFS.mkdir(tempPath);
        }
        
        // Remove existing files if they exist to avoid conflicts
        console.log('🧹 Cleaning up existing database files...');
        await RNFS.unlink(targetDbPath).catch(() => {}); // Ignore error if file doesn't exist
        await RNFS.unlink(`${tempPath}/chat.db-wal`).catch(() => {});
        await RNFS.unlink(`${tempPath}/chat.db-shm`).catch(() => {});
        
        // Copy main database file
        console.log('📋 Copying main database file...');
        await RNFS.copyFile(expandedPath, targetDbPath);
        
        // Verify the copied file is readable and has correct permissions
        console.log('🔍 Verifying copied file...');
        const copiedFileExists = await RNFS.exists(targetDbPath);
        console.log(`Copied file exists: ${copiedFileExists}`);
        
        if (copiedFileExists) {
          // Try to read a small portion to verify file integrity
          try {
            const testRead = await RNFS.read(targetDbPath, 16, 0, 'ascii');
            console.log(`File header: "${testRead}"`);
            if (!testRead.startsWith('SQLite format')) {
              throw new Error('Copied file does not have valid SQLite header');
            }
            console.log('✅ File header verification passed');
          } catch (readError) {
            console.error('❌ Failed to verify copied file:', readError);
            throw new Error(`Copied file verification failed: ${readError}`);
          }
        }
        
        // Copy WAL file if it exists
        const walPath = `${basePath}.db-wal`;
        const targetWalPath = `${tempPath}/chat.db-wal`;
        if (await RNFS.exists(walPath)) {
          console.log('📋 Copying WAL file...');
          await RNFS.copyFile(walPath, targetWalPath);
        } else {
          console.log('ℹ️  No WAL file found, skipping');
        }
        
        // Copy SHM file if it exists
        const shmPath = `${basePath}.db-shm`;
        const targetShmPath = `${tempPath}/chat.db-shm`;
        if (await RNFS.exists(shmPath)) {
          console.log('📋 Copying SHM file...');
          await RNFS.copyFile(shmPath, targetShmPath);
        } else {
          console.log('ℹ️  No SHM file found, skipping');
        }
        
        console.log('✅ All database files copied successfully');
        
        // Verify the copied database file
        const copiedExists = await RNFS.exists(targetDbPath);
        if (!copiedExists) {
          throw new Error('Database copy verification failed');
        }
        
        const copiedStats = await RNFS.stat(targetDbPath);
        console.log(`📊 Copied database size: ${(copiedStats.size / 1024 / 1024).toFixed(2)} MB`);
        
        // Open database using our custom native module
        console.log('🔓 Opening database with custom native module...');
        console.log(`Database path: ${targetDbPath}`);
        
        const result = await ChatDatabaseModule.openDatabase(targetDbPath);
        
        if (result.success) {
          this.dbPath = targetDbPath;
          this.connected = true;
          console.log('✅ Database opened successfully with custom module');
        } else {
          throw new Error('Failed to open database with custom module');
        }
      }
      
      // Test the connection with a simple query
      await this.testConnection();
      
    } catch (error: any) {
      console.error('❌ Error opening database:', error);
      this.connected = false;
      this.dbPath = null;
      
      // Write error details to a file for debugging
      try {
        const errorLog = `
ERROR at ${new Date().toISOString()}:
Message: ${error.message}
Stack: ${error.stack}
Path attempted: ${expandedPath}
`;
        await RNFS.writeFile(
          `${RNFS.TemporaryDirectoryPath}/custom_db_error.txt`,
          errorLog,
          'utf8'
        );
      } catch (logError) {
        console.error('Failed to write error log:', logError);
      }
      
      throw new Error(`Failed to open database: ${error.message}`);
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.connected) {
      throw new Error('No database connection');
    }
    
    console.log('🔍 Testing database connection with custom module...');
    
    try {
      // Test with a simple query to check if chat table exists
      const result = await ChatDatabaseModule.executeQuery(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="chat"', 
        []
      );
      
      if (result.rows.length > 0 && result.rows[0].count > 0) {
        console.log('✅ Chat table found - database appears valid');
        
        // Write success to file for verification
        await RNFS.writeFile(
          `${RNFS.TemporaryDirectoryPath}/custom_db_success.txt`,
          `SUCCESS: Custom database module working at ${new Date().toISOString()}`,
          'utf8'
        ).catch(() => {});
      } else {
        console.log('❌ Chat table not found - database may be empty or corrupted');
        throw new Error('Chat table not found in database');
      }
    } catch (error) {
      console.error('❌ Connection test error:', error);
      throw error;
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.connected) {
      ChatDatabaseModule.closeDatabase();
      this.connected = false;
    }
    this.dbPath = null;
  }

  async getChats(limit: number = 100): Promise<ProcessedChat[]> {
    if (!this.connected) {
      throw new Error('Database is not open');
    }

    console.log('📱 Loading contacts/chats with custom module, limit:', limit);
    
    try {
      // First, let's test with a simple count query
      console.log('🔍 Testing simple count query first...');
      const countResult = await ChatDatabaseModule.executeQuery('SELECT COUNT(*) as total FROM chat', []);
      console.log('📊 Count query result:', countResult);
      
      const result = await ChatDatabaseModule.getChats(limit);
      const chats: ChatRow[] = result.rows;
      
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

      console.log(`✅ Processed ${processedChats.length} contacts/chats with custom module`);
      return processedChats;
    } catch (error) {
      console.error('❌ Error loading chats:', error);
      throw error;
    }
  }

  async getMessagesForChat(chatId: number, limit: number = 100, offset: number = 0): Promise<ProcessedMessage[]> {
    if (!this.connected) {
      throw new Error('Database is not open');
    }

    console.log(`📨 Loading messages for chat ${chatId} (limit: ${limit}, offset: ${offset})`);
    
    try {
      const result = await ChatDatabaseModule.getMessagesForChat(chatId, limit, offset);
      const messages: MessageRow[] = result.rows;
      
      console.log(`Found ${messages.length} messages for chat ${chatId}`);
      
      const processedMessages: ProcessedMessage[] = messages.map((msg) => ({
        id: msg.id,
        text: this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id || 0,
        handleName: this.formatPhoneNumber(msg.handle_name || ''),
        attachments: [], // TODO: Implement attachment loading
        isGroupMessage: false, // Will be determined by the caller based on chat type
        chatId,
      }));

      console.log(`✅ Processed ${processedMessages.length} messages for chat ${chatId}`);
      // Reverse to show oldest first (chronological order)
      return processedMessages.reverse();
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      throw error;
    }
  }

  async searchMessages(searchTerm: string, limit: number = 50): Promise<ProcessedMessage[]> {
    if (!this.connected) {
      throw new Error('Database is not open');
    }

    console.log(`🔍 Searching messages for: "${searchTerm}" (limit: ${limit})`);
    
    try {
      const result = await ChatDatabaseModule.searchMessages(searchTerm, limit);
      const messages: MessageRow[] = result.rows;
      
      console.log(`Found ${messages.length} matching messages`);
      
      const processedMessages: ProcessedMessage[] = messages.map((msg) => ({
        id: msg.id,
        text: this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id || 0,
        handleName: this.formatPhoneNumber(msg.handle_name || ''),
        isGroupMessage: false,
        chatId: msg.chat_id || 0,
      }));

      console.log(`✅ Processed ${processedMessages.length} search results`);
      return processedMessages;
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      throw error;
    }
  }

  private extractMessageText(message: MessageRow): string {
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
    return this.connected;
  }

  getCurrentDatabasePath(): string | null {
    return this.dbPath;
  }
}