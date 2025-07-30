import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ProcessedChat, ProcessedMessage } from '../types/DatabaseTypes';

interface MessageThreadProps {
  chat: ProcessedChat | null;
  messages: ProcessedMessage[];
  isLoading: boolean;
  isDarkMode: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  chat,
  messages,
  isLoading,
  isDarkMode,
}) => {
  const renderMessage = ({ item }: { item: ProcessedMessage }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isFromMe ? styles.messageFromMe : styles.messageFromOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            item.isFromMe
              ? [styles.bubbleFromMe, isDarkMode && styles.bubbleFromMeDark]
              : [styles.bubbleFromOther, isDarkMode && styles.bubbleFromOtherDark],
          ]}
        >
          {!item.isFromMe && chat?.isGroupChat && (
            <Text
              style={[
                styles.senderName,
                isDarkMode && styles.senderNameDark,
              ]}
            >
              {item.handleName || 'Unknown'}
            </Text>
          )}
          
          <Text
            style={[
              styles.messageText,
              item.isFromMe
                ? styles.messageTextFromMe
                : [styles.messageTextFromOther, isDarkMode && styles.messageTextFromOtherDark],
            ]}
          >
            {item.text}
          </Text>
          
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {item.attachments.map((attachment, index) => (
                <View
                  key={attachment.id}
                  style={[
                    styles.attachmentBadge,
                    isDarkMode && styles.attachmentBadgeDark,
                  ]}
                >
                  <Text
                    style={[
                      styles.attachmentText,
                      isDarkMode && styles.attachmentTextDark,
                    ]}
                  >
                    📎 {attachment.filename}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          <Text
            style={[
              styles.timestamp,
              item.isFromMe
                ? styles.timestampFromMe
                : [styles.timestampFromOther, isDarkMode && styles.timestampFromOtherDark],
            ]}
          >
            {formatMessageTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (!chat) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          Select a conversation to view messages
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#007bff'} />
        <Text style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
          Loading messages...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.chatTitle, isDarkMode && styles.chatTitleDark]}>
          {chat.displayName}
        </Text>
        {chat.isGroupChat && (
          <Text style={[styles.participantCount, isDarkMode && styles.participantCountDark]}>
            {chat.participants.length} participants
          </Text>
        )}
      </View>
      
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        inverted={false} // Messages should be in chronological order
      />
    </View>
  );
};

const formatMessageTimestamp = (date: Date): string => {
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes === 0 ? 'now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 24 * 7) {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } else {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#1c1c1e',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  headerDark: {
    backgroundColor: '#2c2c2e',
    borderBottomColor: '#38383a',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  chatTitleDark: {
    color: '#fff',
  },
  participantCount: {
    fontSize: 14,
    color: '#666',
  },
  participantCountDark: {
    color: '#999',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageFromMe: {
    justifyContent: 'flex-end',
  },
  messageFromOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleFromMe: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
  },
  bubbleFromMeDark: {
    backgroundColor: '#0066cc',
  },
  bubbleFromOther: {
    backgroundColor: '#e9ecef',
    borderBottomLeftRadius: 4,
  },
  bubbleFromOtherDark: {
    backgroundColor: '#38383a',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  senderNameDark: {
    color: '#999',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextFromMe: {
    color: '#fff',
  },
  messageTextFromOther: {
    color: '#333',
  },
  messageTextFromOtherDark: {
    color: '#fff',
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  attachmentBadgeDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  attachmentText: {
    fontSize: 14,
    color: '#fff',
  },
  attachmentTextDark: {
    color: '#ccc',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  timestampFromMe: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  timestampFromOther: {
    color: '#999',
  },
  timestampFromOtherDark: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingTextDark: {
    color: '#999',
  },
});