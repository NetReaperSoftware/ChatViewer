import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
// import { pickFile } from 'react-native-document-picker-macos';
import { getDefaultMessagesPath } from '../utils/PathUtils';

interface DatabasePickerProps {
  onDatabaseSelected: (path: string) => void;
  isLoading: boolean;
}

export const DatabasePicker: React.FC<DatabasePickerProps> = ({
  onDatabaseSelected,
  isLoading,
}) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleFilePicker = () => {
    Alert.alert(
      'File Picker Not Available',
      'Native file picker is not available in this build. Please use "Manual Path" to enter the path to your chat.db file.\n\nDefault location: ~/Library/Messages/chat.db',
      [
        { text: 'OK', style: 'default' },
        {
          text: 'Use Manual Path',
          onPress: () => {
            const defaultPath = getDefaultMessagesPath();
            Alert.prompt(
              'Enter Database Path',
              'Enter the full path to your chat.db file:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open',
                  onPress: (customPath) => {
                    if (customPath && customPath.trim()) {
                      setSelectedPath(customPath.trim());
                      onDatabaseSelected(customPath.trim());
                    }
                  },
                },
              ],
              'plain-text',
              defaultPath
            );
          },
        },
      ]
    );
  };

  const handleSelectDatabase = () => {
    Alert.alert(
      'Select Database',
      'Choose a database option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Browse Files',
          onPress: handleFilePicker,
        },
        {
          text: 'Test DB',
          onPress: () => {
            const testPath = '/tmp/test_messages.db';
            setSelectedPath(testPath);
            onDatabaseSelected(testPath);
          },
        },
        {
          text: 'Working DB',
          onPress: () => {
            const workingPath = '/Users/daniel/Documents/Messages/chat.db';
            setSelectedPath(workingPath);
            onDatabaseSelected(workingPath);
          },
        },
        {
          text: 'Manual Path',
          onPress: () => {
            const defaultPath = getDefaultMessagesPath();
            Alert.prompt(
              'Enter Database Path',
              'Enter the full path to your chat.db file:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open',
                  onPress: (customPath) => {
                    if (customPath && customPath.trim()) {
                      setSelectedPath(customPath.trim());
                      onDatabaseSelected(customPath.trim());
                    }
                  },
                },
              ],
              'plain-text',
              defaultPath
            );
          },
        },
      ]
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages Database Viewer</Text>
        <Text style={styles.subtitle}>
          Select your Messages database to view your chat history
        </Text>
        
        {selectedPath && (
          <View style={styles.pathContainer}>
            <Text style={styles.pathLabel}>Selected Database:</Text>
            <Text style={styles.pathText}>{selectedPath}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSelectDatabase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {selectedPath ? 'Change Database' : 'Select Database'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Usage Instructions:</Text>
          <Text style={styles.infoText}>
            • Browse Files: Shows manual path dialog (file picker not available)
          </Text>
          <Text style={styles.infoText}>
            • Test DB: Create a sample database for testing
          </Text>
          <Text style={styles.infoText}>
            • Working DB: Use the known working database (643 chats)
          </Text>
          <Text style={styles.infoText}>
            • Manual Path: Enter path directly (~/Library/Messages/chat.db)
          </Text>
          <Text style={styles.warningText}>
            ⚠️ This app only reads your messages and does not modify them.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  pathContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  pathLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 5,
  },
  pathText: {
    fontSize: 13,
    color: '#6c757d',
    fontFamily: 'Menlo', // Monospace font for paths
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    fontFamily: 'Menlo',
    marginBottom: 15,
  },
  warningText: {
    fontSize: 12,
    color: '#fd7e14',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});