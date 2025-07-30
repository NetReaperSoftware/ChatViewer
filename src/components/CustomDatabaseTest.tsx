import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { CustomDatabaseService } from '../services/CustomDatabaseService';
import { ProcessedChat } from '../types/DatabaseTypes';

export const CustomDatabaseTest: React.FC = () => {
  const [customDbService] = useState(() => new CustomDatabaseService());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState<ProcessedChat[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);
  const isDarkMode = useColorScheme() === 'dark';

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCustomModule = async () => {
    try {
      setIsLoading(true);
      addTestResult('🚀 Starting custom database module test...');
      
      // Test opening the non-corrupted chat database
      const dbPath = '/Users/daniel/Documents/Messages/chat.db';
      addTestResult(`📁 Attempting to open: ${dbPath}`);
      
      await customDbService.openDatabase(dbPath);
      setIsConnected(true);
      addTestResult('✅ Database opened successfully with custom module!');
      
      // Test loading chats
      addTestResult('📱 Loading chats...');
      const loadedChats = await customDbService.getChats(10);
      setChats(loadedChats);
      addTestResult(`✅ Loaded ${loadedChats.length} chats successfully!`);
      
      // Display first few chats
      loadedChats.slice(0, 3).forEach((chat, index) => {
        addTestResult(`📞 Chat ${index + 1}: ${chat.displayName} (ID: ${chat.id})`);
      });
      
      // Test search if we have chats
      if (loadedChats.length > 0) {
        addTestResult('🔍 Testing search functionality...');
        const searchResults = await customDbService.searchMessages('test', 5);
        addTestResult(`🔍 Search returned ${searchResults.length} results`);
      }
      
      addTestResult('🎉 All tests passed! Custom module is working!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(`❌ Test failed: ${errorMessage}`);
      Alert.alert('Test Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const closeDatabase = async () => {
    try {
      await customDbService.closeDatabase();
      setIsConnected(false);
      setChats([]);
      addTestResult('🔒 Database closed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addTestResult(`❌ Error closing database: ${errorMessage}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>
        Custom Database Module Test
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={testCustomModule}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Custom Module'}
          </Text>
        </TouchableOpacity>
        
        {isConnected && (
          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={closeDatabase}
          >
            <Text style={styles.buttonText}>Close Database</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.status, isDarkMode && styles.darkText]}>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
        Chats: {chats.length}
      </Text>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={[styles.resultText, isDarkMode && styles.darkText]}>
            {result}
          </Text>
        ))}
      </ScrollView>

      {chats.length > 0 && (
        <ScrollView style={styles.chatsContainer}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
            Loaded Chats:
          </Text>
          {chats.map((chat, index) => (
            <View key={chat.id} style={[styles.chatItem, isDarkMode && styles.darkChatItem]}>
              <Text style={[styles.chatText, isDarkMode && styles.darkText]}>
                {index + 1}. {chat.displayName}
              </Text>
              <Text style={[styles.chatId, isDarkMode && styles.darkText]}>
                ID: {chat.id} | GUID: {chat.guid?.substring(0, 20)}...
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
  },
  clearButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  chatsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  chatItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  darkChatItem: {
    borderBottomColor: '#333',
  },
  chatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});