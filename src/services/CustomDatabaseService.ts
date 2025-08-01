import RNFS from 'react-native-fs';
import { expandPath } from '../utils/PathUtils';
import ChatDatabaseModule, { ChatRow, MessageRow } from './ChatDatabaseModule';
import {
  ProcessedChat,
  ProcessedMessage,
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

  async getChats(limit?: number): Promise<ProcessedChat[]> {
    if (!this.connected) {
      throw new Error('Database is not open');
    }

    console.log('📱 Loading contacts/chats with custom module, limit:', limit || 'unlimited');
    
    try {
      // First, let's test with a simple count query
      console.log('🔍 Testing simple count query first...');
      const countResult = await ChatDatabaseModule.executeQuery('SELECT COUNT(*) as total FROM chat', []);
      console.log('📊 Count query result:', countResult);
      
      const result = await ChatDatabaseModule.getChats(limit || 0); // Pass 0 to indicate no limit
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
      
      // First time investigating - check database schema and other tables
      if (chatId === 130 && offset === 0) { // Only for austinmarie11@icloud.com investigation
        await this.investigateDatabaseSchema();
        await this.searchForMissingText('brainwashed');
      }
      
      // Debug messages that might have missing text data
      if (messages.length > 0) {
        messages.forEach((msg, index) => {
          const extractedText = this.extractMessageText(msg);
          if (extractedText === '[Empty Message]' || extractedText === '[Rich Text Message]') {
            console.log(`🔍 Investigating message ${msg.id} (index ${index}):`, {
              id: msg.id,
              hasText: !!msg.text,
              textValue: msg.text,
              textType: typeof msg.text,
              hasAttributedBody: !!msg.attributedBody,
              attributedBodyType: typeof msg.attributedBody,
              isFromMe: msg.is_from_me === 1,
              service: msg.message_service,
              extractedText,
              // Add more detailed BLOB inspection
              attributedBodyLength: msg.attributedBody ? JSON.stringify(msg.attributedBody).length : 0,
            });
            
            // Try to examine the attributedBody more thoroughly
            if (msg.attributedBody) {
              this.debugAttributedBody(msg.id, msg.attributedBody);
            }
          }
        });
      }
      
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
        isSMS: false, // No SMS messages will be processed now
      }));

      console.log(`✅ Processed ${processedMessages.length} messages for chat ${chatId}`);
      // Reverse to show oldest first (chronological order)
      return processedMessages.reverse();
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      throw error;
    }
  }

  async searchMessages(searchTerm: string, limit: number = 100): Promise<ProcessedMessage[]> {
    if (!this.connected) {
      throw new Error('Database is not open');
    }

    console.log(`🔍 Historical search for: "${searchTerm}" across ALL message history (${limit} results)`);
    
    try {
      console.log(`🔍 Phase 1: SQL search across ALL historical messages (no time limit)`);
      const result = await ChatDatabaseModule.searchMessages(searchTerm, limit);
      let messages: MessageRow[] = result.rows;
      
      console.log(`Found ${messages.length} direct SQL matches for "${searchTerm}" across all history`);
      
      // Log some details about the search results with timestamps
      messages.forEach((msg, index) => {
        if (index < 5) { // Log first 5 results for debugging
          const messageDate = this.convertAppleTimestamp(msg.date);
          console.log(`Direct match ${index + 1}:`, {
            id: msg.id,
            text: msg.text?.substring(0, 100) || '[no text]',
            hasAttributedBody: !!msg.attributedBody,
            handleName: msg.handle_name,
            chatDisplayName: msg.chat_display_name,
            service: msg.message_service,
            date: messageDate.toLocaleDateString() + ' ' + messageDate.toLocaleTimeString()
          });
        }
      });
      
      // ALWAYS search attributedBody content as well for historical messages
      console.log(`🔍 Phase 2: Searching attributedBody content across ALL historical messages...`);
      
      // Get ALL messages from entire database history to search through their extracted text
      const broadResult = await ChatDatabaseModule.executeQuery(
        `SELECT 
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
              m.cache_has_attachments
         FROM message m
         LEFT JOIN handle h ON m.handle_id = h.ROWID
         LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
         LEFT JOIN chat c ON c.ROWID = cmj.chat_id
         ORDER BY m.date DESC`,
        [] // NO LIMIT - search through ALL messages in entire database
      );
      
      console.log(`🕰️ Searching through ${broadResult.rows.length} messages from entire database history for attributedBody content`);
      
      // Filter by extracted text content
      const searchLower = searchTerm.toLowerCase();
      let processedCount = 0;
      const attributedBodyMatches = broadResult.rows.filter((msg: MessageRow) => {
        processedCount++;
        if (processedCount % 1000 === 0) {
          console.log(`🔍 Processed ${processedCount} messages...`);
        }
        
        // Skip if already in direct results
        if (messages.some(existing => existing.id === msg.id)) {
          return false;
        }
        
        const extractedText = this.extractMessageText(msg);
        const matches = extractedText.toLowerCase().includes(searchLower);
        if (matches) {
          const messageDate = this.convertAppleTimestamp(msg.date);
          console.log(`🎯 AttributedBody match for message ${msg.id} from ${messageDate.toLocaleDateString()}: "${extractedText.substring(0, 150)}"`);
        }
        return matches;
      });
      
      console.log(`Found ${attributedBodyMatches.length} additional matches in attributedBody content across all history`);
      
      // Combine all results
      const allMatches = [...messages, ...attributedBodyMatches];
      
      // Sort by date (most recent first) and limit to requested amount
      const sortedMatches = allMatches
        .sort((a, b) => b.date - a.date)
        .slice(0, limit);
      
      console.log(`📊 Total historical results: ${allMatches.length}, returning top ${sortedMatches.length}`);
      
      const processedMessages: ProcessedMessage[] = sortedMatches.map((msg) => ({
        id: msg.id,
        text: this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id || 0,
        handleName: this.formatPhoneNumber(msg.handle_name || ''),
        isGroupMessage: false,
        chatId: msg.chat_id || 0,
        isSMS: false,
      }));

      console.log(`✅ Processed ${processedMessages.length} final historical search results`);
      return processedMessages;
    } catch (error) {
      console.error('❌ Error searching historical messages:', error);
      throw error;
    }
  }

  async getMessagesAroundMessage(chatId: number, targetMessageId: number, contextSize: number = 50): Promise<{messages: ProcessedMessage[], targetIndex: number}> {
    if (!this.connected) {
      throw new Error('Database is not open');
    }

    console.log(`🎯 Loading messages around message ${targetMessageId} in chat ${chatId} (context: ${contextSize})`);
    
    try {
      // Get all messages for the chat to find the target message position
      const allMessagesResult = await ChatDatabaseModule.executeQuery(
        `SELECT 
              m.ROWID as id,
              m.text,
              m.attributedBody,
              m.is_from_me,
              m.date,
              m.handle_id,
              h.id as handle_name,
              m.service as message_service,
              m.subject,
              m.cache_has_attachments
         FROM message m
         LEFT JOIN handle h ON m.handle_id = h.ROWID
         JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
         WHERE cmj.chat_id = ?
         AND (m.service NOT IN ('SMS', 'RCS') OR m.service IS NULL)
         AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
         ORDER BY m.date ASC`,
        [chatId]
      );
      
      const allMessages: MessageRow[] = allMessagesResult.rows;
      console.log(`Found ${allMessages.length} total messages in chat ${chatId}`);
      
      // Find the target message index
      const targetIndex = allMessages.findIndex(msg => msg.id === targetMessageId);
      
      if (targetIndex === -1) {
        console.log(`❌ Target message ${targetMessageId} not found in chat ${chatId}`);
        // Fallback: load recent messages for this chat
        const fallbackMessages = await this.getMessagesForChat(chatId, 100, 0);
        return { messages: fallbackMessages, targetIndex: -1 };
      }
      
      console.log(`🎯 Found target message at index ${targetIndex} of ${allMessages.length}`);
      
      // Calculate the range around the target message
      const startIndex = Math.max(0, targetIndex - contextSize);
      const endIndex = Math.min(allMessages.length, targetIndex + contextSize + 1);
      
      console.log(`📝 Loading context from index ${startIndex} to ${endIndex} (${endIndex - startIndex} messages)`);
      
      // Get the messages in the range
      const contextMessages = allMessages.slice(startIndex, endIndex);
      
      const processedMessages: ProcessedMessage[] = contextMessages.map((msg) => ({
        id: msg.id,
        text: this.extractMessageText(msg),
        isFromMe: msg.is_from_me === 1,
        timestamp: this.convertAppleTimestamp(msg.date),
        handleId: msg.handle_id || 0,
        handleName: this.formatPhoneNumber(msg.handle_name || ''),
        attachments: [],
        isGroupMessage: false,
        chatId,
        isSMS: false,
      }));
      
      // The target message index in the context array
      const contextTargetIndex = targetIndex - startIndex;
      
      console.log(`✅ Loaded ${processedMessages.length} messages with target at index ${contextTargetIndex}`);
      
      return { 
        messages: processedMessages, 
        targetIndex: contextTargetIndex 
      };
      
    } catch (error) {
      console.error('❌ Error loading messages around target:', error);
      // Fallback: load recent messages for this chat
      const fallbackMessages = await this.getMessagesForChat(chatId, 100, 0);
      return { messages: fallbackMessages, targetIndex: -1 };
    }
  }

  private extractMessageText(message: MessageRow): string {
    // Handle plain text messages - check for both null/undefined and empty string
    if (message.text && typeof message.text === 'string' && message.text.trim()) {
      return message.text.trim();
    }
    
    // Handle newer attributedBody format
    if (message.attributedBody) {
      try {
        // attributedBody could be binary data or string
        let bodyStr: string;
        
        if (typeof message.attributedBody === 'string') {
          bodyStr = message.attributedBody;
        } else if (message.attributedBody && typeof message.attributedBody === 'object') {
          // In React Native, binary data comes as objects with specific structure
          if (message.attributedBody.data && Array.isArray(message.attributedBody.data)) {
            // Convert byte array to string
            const bytes = message.attributedBody.data;
            bodyStr = String.fromCharCode(...bytes);
          } else {
            bodyStr = String(message.attributedBody);
          }
        } else {
          bodyStr = message.attributedBody.toString();
        }
        
        // Enhanced BLOB parsing for missing messages
        
        // Method 1: Look for readable ASCII text patterns
        const readableTextMatches = bodyStr.match(/[\x20-\x7E]{4,}/g);
        if (readableTextMatches && readableTextMatches.length > 0) {
          // Filter out common binary/encoded patterns
          const filteredMatches = readableTextMatches.filter(match => {
            return !match.includes('NSString') && 
                   !match.includes('NSMutable') &&
                   !match.includes('CFString') &&
                   !match.includes('bplist') &&
                   !match.includes('__') &&
                   match.length > 4;
          });
          
          if (filteredMatches.length > 0) {
            // Return the longest meaningful text
            const longestMatch = filteredMatches.reduce((a: string, b: string) => a.length > b.length ? a : b);
            if (longestMatch.length > 4) {
              return longestMatch.trim();
            }
          }
        }
        
        // Method 2: Try to parse as Apple's NSAttributedString format
        if (message.attributedBody && typeof message.attributedBody === 'object' && message.attributedBody.data) {
          const bytes = message.attributedBody.data;
          if (Array.isArray(bytes)) {
            // Look for UTF-8 encoded text in the byte array
            let text = '';
            for (let i = 0; i < bytes.length - 3; i++) {
              // Look for sequences of printable characters
              if (bytes[i] >= 32 && bytes[i] <= 126) {
                let sequence = '';
                let j = i;
                while (j < bytes.length && bytes[j] >= 32 && bytes[j] <= 126) {
                  sequence += String.fromCharCode(bytes[j]);
                  j++;
                }
                if (sequence.length > text.length && sequence.length > 10) {
                  text = sequence;
                }
              }
            }
            
            if (text.length > 10 && !text.includes('NSString') && !text.includes('bplist')) {
              console.log(`🎯 Extracted text from BLOB: "${text}"`);
              return text.trim();
            }
          }
        }
        
        // Look for NSString patterns specifically
        const stringMatches = bodyStr.match(/NSString[^"]*"([^"]+)"/);
        if (stringMatches && stringMatches[1]) {
          return stringMatches[1];
        }
        
        // Try to extract text from plist-like structures
        const plistTextMatches = bodyStr.match(/<string>([^<]+)<\/string>/);
        if (plistTextMatches && plistTextMatches[1]) {
          return plistTextMatches[1];
        }
        
        return '[Rich Text Message]';
      } catch (error) {
        return '[Rich Text Message]';
      }
    }
    
    // Check if it's an attachment or special message type
    if (message.cache_has_attachments === 1) {
      return '[Attachment]';
    }
    
    return '[Empty Message]';
  }

  private convertAppleTimestamp(timestamp: number): Date {
    // Simplified logging for performance with full conversations

    // Handle invalid timestamps
    if (!timestamp || isNaN(timestamp) || !isFinite(timestamp)) {
      console.log('❌ Invalid timestamp, using current date');
      return new Date();
    }
    
    // Apple Messages database can store timestamps in different formats:
    // 1. Seconds since January 1, 2001 (Cocoa epoch)
    // 2. Nanoseconds since January 1, 2001 (newer format)
    
    let appleSeconds: number;
    
    // Detect if timestamp is in nanoseconds (very large number)
    // Nanosecond timestamps are typically > 1e15 (after ~2032 in seconds)
    if (timestamp > 1e15) {
      // Convert nanoseconds to seconds
      appleSeconds = timestamp / 1e9; // Divide by 1 billion
    } else {
      appleSeconds = timestamp;
    }
    
    // Convert Apple timestamp (seconds since 2001) to Unix timestamp (seconds since 1970)
    // Difference: 978307200 seconds (31 years)
    const unixTimestamp = appleSeconds + 978307200;
    const jsTimestamp = unixTimestamp * 1000; // Convert to milliseconds for JavaScript Date
    const resultDate = new Date(jsTimestamp);
    
    // Only log timestamp conversion errors for debugging
    if (isNaN(resultDate.getTime())) {
      console.log('❌ Timestamp conversion failed:', {
        originalTimestamp: timestamp,
        resultDate: resultDate.toString()
      });
    }
    
    return resultDate;
  }


  private debugAttributedBody(messageId: number, attributedBody: any): void {
    console.log(`🔍 Deep dive into attributedBody for message ${messageId}:`);
    
    try {
      // Log the raw object structure
      console.log('Raw attributedBody type:', typeof attributedBody);
      console.log('Raw attributedBody:', attributedBody);
      console.log('Object keys:', attributedBody ? Object.keys(attributedBody) : 'null');
      
      // Try different ways to extract the data
      if (attributedBody && typeof attributedBody === 'object') {
        // Check if it's a React Native bridge object with data property
        if (attributedBody.data && Array.isArray(attributedBody.data)) {
          console.log('Found data array, length:', attributedBody.data.length);
          console.log('First 100 bytes:', attributedBody.data.slice(0, 100));
          
          const bytes = attributedBody.data;
          
          // Convert entire byte array to hex for search
          const hexString = bytes.map((b: number) => b.toString(16).padStart(2, '0')).join('');
          console.log('Full hex representation length:', hexString.length);
          console.log('Hex (first 400 chars):', hexString.substring(0, 400));
          
          // Search for specific hex patterns
          const searchTermHex = 'brainwashed'.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
          console.log('Searching for hex pattern:', searchTermHex);
          
          if (hexString.includes(searchTermHex)) {
            console.log('🎯 Found "brainwashed" pattern in hex data!');
            
            // Find the position and extract surrounding context
            const position = hexString.indexOf(searchTermHex);
            const start = Math.max(0, position - 100);
            const end = Math.min(hexString.length, position + searchTermHex.length + 100);
            const context = hexString.substring(start, end);
            console.log('Context around found text (hex):', context);
            
            // Convert context back to ASCII where possible
            const contextBytes = [];
            for (let i = 0; i < context.length; i += 2) {
              const hexByte = context.substring(i, i + 2);
              const byte = parseInt(hexByte, 16);
              contextBytes.push(byte);
            }
            
            const asciiContext = contextBytes.map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('');
            console.log('Context as ASCII:', asciiContext);
          }
          
          // Try to extract all printable ASCII sequences
          let allText = '';
          for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] >= 32 && bytes[i] <= 126) { // Printable ASCII
              let sequence = '';
              let j = i;
              while (j < bytes.length && bytes[j] >= 32 && bytes[j] <= 126) {
                sequence += String.fromCharCode(bytes[j]);
                j++;
              }
              if (sequence.length > 4) { // Only show sequences of 4+ characters
                console.log(`ASCII sequence at position ${i}: "${sequence}"`);
                if (sequence.includes('brainwashed')) {
                  console.log('🎯 Found "brainwashed" in ASCII sequence!');
                }
                allText += sequence + ' ';
              }
              i = j - 1; // Skip ahead
            }
          }
          
          if (allText.length > 0) {
            console.log('All extracted ASCII text:', allText);
          }
        }
        
        // Check if it's a Data object (from Swift)
        if (attributedBody.constructor && attributedBody.constructor.name === 'Data') {
          console.log('Found Data object from Swift bridge');
        }
        
        // Check other possible properties
        for (const [key, value] of Object.entries(attributedBody)) {
          if (typeof value === 'string' && value.length > 0) {
            console.log(`String property ${key}:`, value);
            if (value.includes('brainwashed')) {
              console.log('🎯 Found "brainwashed" in string property!');
            }
          }
        }
      } else if (typeof attributedBody === 'string') {
        console.log('AttributedBody is a string:', attributedBody);
        if (attributedBody.includes('brainwashed')) {
          console.log('🎯 Found "brainwashed" in string attributedBody!');
        }
      }
      
      // Try to JSON stringify and search for patterns
      try {
        const jsonStr = JSON.stringify(attributedBody);
        console.log('JSON string length:', jsonStr.length);
        if (jsonStr.includes('brainwashed')) {
          console.log('🎯 Found "brainwashed" in JSON representation!');
        }
      } catch (e) {
        console.log('Failed to JSON stringify attributedBody');
      }
      
    } catch (error) {
      console.log('Error debugging attributedBody:', error);
    }
  }

  private async investigateDatabaseSchema(): Promise<void> {
    console.log('🔍 === DATABASE SCHEMA INVESTIGATION ===');
    
    try {
      // Get all tables in the database
      const tablesResult = await ChatDatabaseModule.executeQuery(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        []
      );
      
      console.log('📋 All database tables:', tablesResult.rows.map(r => r.name));
      
      // Get detailed schema for message table
      const messageSchemaResult = await ChatDatabaseModule.executeQuery(
        "PRAGMA table_info(message)",
        []
      );
      
      console.log('📋 Message table schema:', messageSchemaResult.rows);
      
      // Check for any message-related tables
      const messageTablesResult = await ChatDatabaseModule.executeQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%message%'",
        []
      );
      
      console.log('📋 Message-related tables:', messageTablesResult.rows);
      
    } catch (error) {
      console.error('❌ Schema investigation failed:', error);
    }
  }

  private async searchForMissingText(searchText: string): Promise<void> {
    console.log(`🔍 === SEARCHING FOR "${searchText}" IN ALL FIELDS ===`);
    
    try {
      // First, check the main message table more thoroughly
      console.log('🔍 === SEARCHING MAIN MESSAGE TABLE ===');
      const messageSearchResult = await ChatDatabaseModule.executeQuery(
        `SELECT ROWID, text, attributedBody, subject, message_summary_info, payload_data, 
                balloon_bundle_id, date, is_from_me, handle_id
         FROM message 
         WHERE ROWID IN (SELECT message_id FROM chat_message_join WHERE chat_id = 130)
         ORDER BY date DESC
         LIMIT 50`,
        []
      );
      
      console.log(`📋 Found ${messageSearchResult.rows.length} recent messages for chat 130`);
      
      // Check each message for the search text in any form
      let foundText = false;
      messageSearchResult.rows.forEach((row, index) => {
        if (row.text && row.text.includes(searchText)) {
          console.log(`🎯 Found "${searchText}" in text field of message ${row.ROWID}:`, row.text);
          foundText = true;
        }
        if (row.subject && row.subject.includes(searchText)) {
          console.log(`🎯 Found "${searchText}" in subject field of message ${row.ROWID}:`, row.subject);
          foundText = true;
        }
        if (row.attributedBody) {
          const bodyStr = JSON.stringify(row.attributedBody);
          if (bodyStr.includes(searchText)) {
            console.log(`🎯 Found "${searchText}" in attributedBody of message ${row.ROWID}`);
            foundText = true;
            this.debugAttributedBody(row.ROWID, row.attributedBody);
          }
        }
      });
      
      if (!foundText) {
        console.log(`❌ Text "${searchText}" not found in standard message fields`);
      }
      
      // Check deleted_messages table
      console.log('🔍 === CHECKING DELETED_MESSAGES TABLE ===');
      try {
        // First get the schema
        const deletedSchemaResult = await ChatDatabaseModule.executeQuery(
          `PRAGMA table_info(deleted_messages)`,
          []
        );
        console.log('📋 Deleted messages schema:', deletedSchemaResult.rows);
        
        // Get all deleted messages to see what's there
        const allDeletedResult = await ChatDatabaseModule.executeQuery(
          `SELECT * FROM deleted_messages LIMIT 50`,
          []
        );
        console.log(`🗑️ Found ${allDeletedResult.rows.length} total deleted messages`);
        
        // Search in deleted messages
        allDeletedResult.rows.forEach((row, index) => {
          const rowStr = JSON.stringify(row);
          if (rowStr.includes(searchText)) {
            console.log(`🎯 Found "${searchText}" in deleted message:`, row);
          }
        });
        
      } catch (e) {
        console.log('❌ Deleted messages table access failed:', e);
      }
      
      // Check recoverable_message_part table
      console.log('🔍 === CHECKING RECOVERABLE_MESSAGE_PART TABLE ===');
      try {
        // First get the schema
        const recoverableSchemaResult = await ChatDatabaseModule.executeQuery(
          `PRAGMA table_info(recoverable_message_part)`,
          []
        );
        console.log('📋 Recoverable message part schema:', recoverableSchemaResult.rows);
        
        // Get all recoverable parts
        const allRecoverableResult = await ChatDatabaseModule.executeQuery(
          `SELECT * FROM recoverable_message_part LIMIT 50`,
          []
        );
        console.log(`🔄 Found ${allRecoverableResult.rows.length} total recoverable message parts`);
        
        // Search in recoverable parts
        allRecoverableResult.rows.forEach((row, index) => {
          const rowStr = JSON.stringify(row);
          if (rowStr.includes(searchText)) {
            console.log(`🎯 Found "${searchText}" in recoverable message part:`, row);
          }
        });
        
      } catch (e) {
        console.log('❌ Recoverable message parts table access failed:', e);
      }
      
      // Check message_processing_task table
      console.log('🔍 === CHECKING MESSAGE_PROCESSING_TASK TABLE ===');
      try {
        const taskSchemaResult = await ChatDatabaseModule.executeQuery(
          `PRAGMA table_info(message_processing_task)`,
          []
        );
        console.log('📋 Message processing task schema:', taskSchemaResult.rows);
        
        const allTasksResult = await ChatDatabaseModule.executeQuery(
          `SELECT * FROM message_processing_task LIMIT 50`,
          []
        );
        console.log(`📋 Found ${allTasksResult.rows.length} message processing tasks`);
        
        // Search in tasks
        allTasksResult.rows.forEach((row, index) => {
          const rowStr = JSON.stringify(row);
          if (rowStr.includes(searchText)) {
            console.log(`🎯 Found "${searchText}" in message processing task:`, row);
          }
        });
        
      } catch (e) {
        console.log('❌ Message processing task table access failed:', e);
      }
      
    } catch (error) {
      console.error('❌ Text search failed:', error);
    }
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