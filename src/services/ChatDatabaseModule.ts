import { NativeModules } from 'react-native';

// Type definitions for our custom database module
interface ChatDatabaseModuleInterface {
  openDatabase(path: string): Promise<{success: boolean; path: string}>;
  closeDatabase(): void;
  executeQuery(sql: string, params: any[]): Promise<{rows: any[]; count: number}>;
  getChats(limit: number): Promise<{rows: any[]; count: number}>;
  searchMessages(searchTerm: string, limit: number): Promise<{rows: any[]; count: number}>;
  getMessagesForChat(chatId: number, limit: number, offset: number): Promise<{rows: any[]; count: number}>;
}

// Database result types matching Messages schema
export interface ChatRow {
  id: number;
  guid: string;
  display_name?: string;
  chat_identifier?: string;
  service_name?: string;
  style: number;
}

export interface MessageRow {
  id: number;
  text?: string;
  attributedBody?: any;
  is_from_me: number;
  date: number;
  handle_id?: number;
  handle_name?: string;
  cache_has_attachments?: number;
  chat_id?: number;
}

// Get the native module
const ChatDatabaseModule: ChatDatabaseModuleInterface = NativeModules.ChatDatabaseManager;

if (!ChatDatabaseModule) {
  throw new Error('ChatDatabaseManager native module is not available. Make sure it is linked properly.');
}

export default ChatDatabaseModule;