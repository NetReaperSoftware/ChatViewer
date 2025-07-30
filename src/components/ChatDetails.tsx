import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ProcessedChat } from '../types/DatabaseTypes';

interface ChatDetailsProps {
  chat: ProcessedChat | null;
  isDarkMode: boolean;
}

export const ChatDetails: React.FC<ChatDetailsProps> = ({
  chat,
  isDarkMode,
}) => {
  if (!chat) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          Select a conversation to view details
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Details
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          Conversation Info
        </Text>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Name:
          </Text>
          <Text style={[styles.value, isDarkMode && styles.valueDark]}>
            {chat.displayName}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Type:
          </Text>
          <Text style={[styles.value, isDarkMode && styles.valueDark]}>
            {chat.isGroupChat ? 'Group Chat' : 'Individual Chat'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Messages:
          </Text>
          <Text style={[styles.value, isDarkMode && styles.valueDark]}>
            {chat.messageCount.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            ID:
          </Text>
          <Text style={[styles.value, styles.monospace, isDarkMode && styles.valueDark]}>
            {chat.id}
          </Text>
        </View>
      </View>
      
      {chat.participants.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            Participants ({chat.participants.length})
          </Text>
          
          {chat.participants.map((participant, index) => (
            <View key={index} style={styles.participantRow}>
              <Text style={[styles.participantText, isDarkMode && styles.participantTextDark]}>
                {participant}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {chat.lastMessage && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            Last Message
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>
              From:
            </Text>
            <Text style={[styles.value, isDarkMode && styles.valueDark]}>
              {chat.lastMessage.isFromMe ? 'You' : (chat.lastMessage.handleName || 'Unknown')}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>
              Time:
            </Text>
            <Text style={[styles.value, isDarkMode && styles.valueDark]}>
              {chat.lastMessage.timestamp.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.messagePreview}>
            <Text style={[styles.messageText, isDarkMode && styles.messageTextDark]}>
              {chat.lastMessage.text}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#2c2c2e',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    borderBottomColor: '#38383a',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  titleDark: {
    color: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
    flexShrink: 0,
  },
  labelDark: {
    color: '#999',
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  valueDark: {
    color: '#fff',
  },
  monospace: {
    fontFamily: 'Menlo',
  },
  participantRow: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  participantText: {
    fontSize: 14,
    color: '#333',
  },
  participantTextDark: {
    color: '#fff',
  },
  messagePreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  messageTextDark: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyContainerDark: {
    backgroundColor: '#2c2c2e',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#999',
  },
});