import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { CustomDatabaseService } from '../services/CustomDatabaseService';
import { DatabasePicker } from '../components/DatabasePicker';
import { ConversationList } from '../components/ConversationList';
import { MessageThread } from '../components/MessageThread';
import { ChatDetails } from '../components/ChatDetails';
import { ProcessedChat, ProcessedMessage } from '../types/DatabaseTypes';

export const MainScreen: React.FC = () => {
  const [dbService] = useState(() => new CustomDatabaseService());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<ProcessedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ProcessedChat | null>(null);
  const [messages, setMessages] = useState<ProcessedMessage[]>([]);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messageOffset, setMessageOffset] = useState(0);
  const [searchResults, setSearchResults] = useState<ProcessedMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const systemColorScheme = useColorScheme();
  const [darkModeOverride, setDarkModeOverride] = useState<boolean | null>(null);
  const isDarkMode = darkModeOverride !== null ? darkModeOverride : systemColorScheme === 'dark';

  useEffect(() => {
    return () => {
      // Cleanup database connection on unmount
      if (dbService.isConnected()) {
        dbService.closeDatabase().catch(() => {}); // Ignore cleanup errors
      }
    };
  }, [dbService]);

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  const handleDatabaseSelected = async (path: string) => {
    setIsLoading(true);
    try {
      // Close existing connection if any
      if (dbService.isConnected()) {
        await dbService.closeDatabase();
      }

      console.log('Opening database...');
      // Open new connection with timeout (test database creation is handled automatically)
      await withTimeout(dbService.openDatabase(path), 30000); // 30 second timeout
      setIsConnected(true);

      // Load contacts/chats - much faster now with no message queries
      console.log('Loading contacts and conversations...');
      const loadedChats = await withTimeout(dbService.getChats(), 30000); // 30 second timeout, all chats
      setChats(loadedChats);

      console.log(`Loaded ${loadedChats.length} chats from database`);
      
      if (loadedChats.length === 0) {
        Alert.alert(
          'No Chats Found',
          'The database was opened successfully but no chats were found. This might be an empty or incompatible database.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Database Error',
        `Failed to open database: ${errorMessage}\n\nPlease check:\n• File path is correct\n• File exists and is readable\n• File is a valid Messages database\n• Database isn't too large or corrupt`,
        [{ text: 'OK' }]
      );
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSelected = async (chat: ProcessedChat) => {
    setSelectedChat(chat);
    setIsLoading(true);
    setMessages([]); // Clear previous messages immediately
    setMessageOffset(0); // Reset pagination
    setHasMoreMessages(true);
    
    try {
      console.log(`Loading messages for: ${chat.displayName}`);
      const chatMessages = await withTimeout(
        dbService.getMessagesForChat(chat.id, 100, 0), // Load first 100 messages
        10000 // 10 second timeout
      );
      setMessages(chatMessages);
      setMessageOffset(100); // Next batch starts at 100
      setHasMoreMessages(chatMessages.length === 100); // If we got less than 100, no more messages
      console.log(`Loaded ${chatMessages.length} messages for ${chat.displayName}`);
    } catch (error) {
      console.error('Error loading messages:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Message Loading Error', 
        `Failed to load messages for ${chat.displayName}: ${errorMessage}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedChat || isLoadingMoreMessages || !hasMoreMessages) {
      return;
    }

    setIsLoadingMoreMessages(true);
    
    try {
      console.log(`Loading more messages for: ${selectedChat.displayName} (offset: ${messageOffset})`);
      const moreMessages = await withTimeout(
        dbService.getMessagesForChat(selectedChat.id, 100, messageOffset),
        10000 // 10 second timeout
      );
      
      if (moreMessages.length > 0) {
        setMessages(prevMessages => [...prevMessages, ...moreMessages]);
        setMessageOffset(prevOffset => prevOffset + moreMessages.length);
        setHasMoreMessages(moreMessages.length === 100);
        console.log(`Loaded ${moreMessages.length} more messages (total: ${messages.length + moreMessages.length})`);
      } else {
        setHasMoreMessages(false);
        console.log('No more messages to load');
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      Alert.alert(
        'Error Loading More Messages',
        'Failed to load additional messages. Please try again.'
      );
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  const handleMessageSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log(`Searching messages for: "${query}"`);
      const results = await withTimeout(
        dbService.searchMessages(query, 100), // Search up to 100 results
        120000 // 2 minute timeout for historical search across all data
      );
      
      setSearchResults(results);
      console.log(`Found ${results.length} messages containing "${query}"`);
    } catch (error) {
      console.error('Error searching messages:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Search Error',
        `Failed to search messages: ${errorMessage}`
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelected = async (message: ProcessedMessage) => {
    // Find the chat that contains this message
    const chat = chats.find(c => c.id === message.chatId);
    if (!chat) {
      console.error('Chat not found for message:', message.chatId);
      return;
    }

    console.log(`🎯 Navigating to message ${message.id} in chat "${chat.displayName}"`);
    
    // Select the chat and clear search
    setSelectedChat(chat);
    setSearchQuery('');
    setSearchResults([]);
    setIsLoading(true);
    setHighlightedMessageId(message.id);
    
    try {
      // Load messages around the target message with context
      const result = await withTimeout(
        dbService.getMessagesAroundMessage(chat.id, message.id, 50), // 50 messages of context on each side
        30000 // 30 second timeout
      );
      
      setMessages(result.messages);
      setMessageOffset(result.messages.length); // Set offset for pagination
      setHasMoreMessages(true); // There might be more messages to load
      
      console.log(`✅ Loaded ${result.messages.length} messages with target at index ${result.targetIndex}`);
      
      // Clear highlight after a few seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error navigating to message context:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Navigation Error',
        `Failed to navigate to message: ${errorMessage}`
      );
      
      // Fallback: load chat normally
      await handleChatSelected(chat);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkModeOverride(prev => {
      if (prev === null) {
        // First toggle: opposite of system
        return systemColorScheme !== 'dark';
      } else {
        // Subsequent toggles: just flip the current state
        return !prev;
      }
    });
  };

  if (!isConnected) {
    return (
      <DatabasePicker
        onDatabaseSelected={handleDatabaseSelected}
        isLoading={isLoading}
      />
    );
  }

  // Main three-panel layout
  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Left Panel - Conversation List */}
      <View style={[styles.leftPanel, isDarkMode && styles.panelDark]}>
        <ConversationList
          chats={chats}
          selectedChat={selectedChat}
          onChatSelected={handleChatSelected}
          isDarkMode={isDarkMode}
          searchResults={searchResults}
          searchQuery={searchQuery}
          isSearching={isSearching}
          onMessageSearch={handleMessageSearch}
          onSearchResultSelected={handleSearchResultSelected}
          onToggleDarkMode={toggleDarkMode}
        />
      </View>
      
      {/* Middle Panel - Message Thread */}
      <View style={[styles.middlePanel, isDarkMode && styles.panelDark]}>
        <MessageThread
          chat={selectedChat}
          messages={messages}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          onLoadMore={loadMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
          hasMoreMessages={hasMoreMessages}
          highlightedMessageId={highlightedMessageId}
        />
      </View>
      
      {/* Right Panel - Details (optional, can be hidden) */}
      <View style={[styles.rightPanel, isDarkMode && styles.panelDark]}>
        <ChatDetails
          chat={selectedChat}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#1c1c1e',
  },
  leftPanel: {
    width: 300,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  middlePanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  rightPanel: {
    width: 250,
    backgroundColor: '#fff',
  },
  panelDark: {
    backgroundColor: '#2c2c2e',
    borderRightColor: '#38383a',
  },
});