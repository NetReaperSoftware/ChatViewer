import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { DatabasePicker } from '../components/DatabasePicker';
import { ConversationList } from '../components/ConversationList';
import { MessageThread } from '../components/MessageThread';
import { ChatDetails } from '../components/ChatDetails';
import { ProcessedChat, ProcessedMessage } from '../types/DatabaseTypes';

export const MainScreen: React.FC = () => {
  const [dbService] = useState(() => new DatabaseService());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<ProcessedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ProcessedChat | null>(null);
  const [messages, setMessages] = useState<ProcessedMessage[]>([]);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    return () => {
      // Cleanup database connection on unmount
      if (dbService.isConnected()) {
        dbService.closeDatabase();
      }
    };
  }, [dbService]);

  const handleDatabaseSelected = async (path: string) => {
    setIsLoading(true);
    try {
      // Close existing connection if any
      if (dbService.isConnected()) {
        await dbService.closeDatabase();
      }

      // Open new connection (test database creation is handled automatically)
      await dbService.openDatabase(path);
      setIsConnected(true);

      // Load chats
      const loadedChats = await dbService.getChats();
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
      Alert.alert(
        'Database Error',
        `Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n• File path is correct\n• File exists and is readable\n• File is a valid Messages database`,
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
    
    try {
      const chatMessages = await dbService.getMessagesForChat(chat.id, 100);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages for this chat');
    } finally {
      setIsLoading(false);
    }
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
        />
      </View>
      
      {/* Middle Panel - Message Thread */}
      <View style={[styles.middlePanel, isDarkMode && styles.panelDark]}>
        <MessageThread
          chat={selectedChat}
          messages={messages}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
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