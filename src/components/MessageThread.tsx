import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ProcessedChat, ProcessedMessage } from '../types/DatabaseTypes';

interface MessageThreadProps {
  chat: ProcessedChat | null;
  messages: ProcessedMessage[];
  isLoading: boolean;
  isDarkMode: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  highlightedMessageId?: number | null;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  chat,
  messages,
  isLoading,
  isDarkMode,
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = false,
  highlightedMessageId = null,
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to highlighted message when it changes
  useEffect(() => {
    if (highlightedMessageId && messages.length > 0) {
      const messageIndex = messages.findIndex(msg => msg.id === highlightedMessageId);
      if (messageIndex !== -1) {
        console.log(`📍 Scrolling to message at index ${messageIndex}/${messages.length} (id: ${highlightedMessageId})`);

        // With focused loading, the list is small so scrolling should be reliable
        // Use a shorter delay since we only have ~40 items max
        requestAnimationFrame(() => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: messageIndex,
              animated: true,
              viewPosition: 0.5, // Center the highlighted message
            });
          }, 150); // Shorter delay for small lists
        });
      } else {
        console.warn(`⚠️ Highlighted message ${highlightedMessageId} not found in current message list`);
      }
    }
  }, [highlightedMessageId, messages]);
  const renderMessage = ({ item }: { item: ProcessedMessage }) => {
    const isHighlighted = highlightedMessageId === item.id;
    
    return (
      <View
        style={[
          styles.messageContainer,
          item.isFromMe ? styles.messageFromMe : styles.messageFromOther,
          isHighlighted && styles.highlightedMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            item.isFromMe
              ? [
                  item.isSMS ? styles.bubbleFromMeSMS : styles.bubbleFromMe,
                  isDarkMode && (item.isSMS ? styles.bubbleFromMeSMSDark : styles.bubbleFromMeDark)
                ]
              : [styles.bubbleFromOther, isDarkMode && styles.bubbleFromOtherDark],
            isHighlighted && (isDarkMode ? styles.highlightedBubbleDark : styles.highlightedBubble),
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

  const handleScroll = (event: any) => {
    // Scroll loading disabled - using static context window only
    // No pagination to prevent duplicates and crashes
  };

  const renderFooter = () => {
    // Show context window message if this is a search result view
    if (highlightedMessageId) {
      if (isLoadingMore) {
        return (
          <View style={[styles.loadMoreContainer, isDarkMode && styles.loadMoreContainerDark]}>
            <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#007bff'} />
            <Text style={[styles.loadMoreText, isDarkMode && styles.loadMoreTextDark]}>
              Expanding context window...
            </Text>
          </View>
        );
      }

      if (hasMoreMessages && onLoadMore) {
        return (
          <View style={[styles.loadMoreContainer, isDarkMode && styles.loadMoreContainerDark]}>
            <Text style={[styles.contextWindowText, isDarkMode && styles.contextWindowTextDark]}>
              • Showing context around search result •
            </Text>
            <TouchableOpacity
              style={[styles.loadMoreButton, isDarkMode && styles.loadMoreButtonDark]}
              onPress={onLoadMore}
            >
              <Text style={[styles.loadMoreButtonText, isDarkMode && styles.loadMoreButtonTextDark]}>
                Load More Context (±100 messages)
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={[styles.endOfMessagesContainer, isDarkMode && styles.endOfMessagesContainerDark]}>
          <Text style={[styles.endOfMessagesText, isDarkMode && styles.endOfMessagesTextDark]}>
            • Showing full conversation •
          </Text>
        </View>
      );
    }

    if (!hasMoreMessages) {
      return (
        <View style={[styles.endOfMessagesContainer, isDarkMode && styles.endOfMessagesContainerDark]}>
          <Text style={[styles.endOfMessagesText, isDarkMode && styles.endOfMessagesTextDark]}>
            • Beginning of conversation •
          </Text>
        </View>
      );
    }

    return null;
  };

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
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        inverted={false} // Messages should be in chronological order
        onScroll={handleScroll}
        scrollEventThrottle={400} // Throttle scroll events for performance
        ListFooterComponent={renderFooter}
        maxToRenderPerBatch={20} // Render more items per batch for better scrollToIndex
        updateCellsBatchingPeriod={100} // Give more time for batching
        initialNumToRender={20} // Render more items initially
        windowSize={21} // Keep more items in memory
        onScrollToIndexFailed={(info) => {
          // Fallback if scrollToIndex fails - retry with scrollToOffset
          console.warn('ScrollToIndex failed:', info);
          console.log(`⚠️ Retrying scroll: target index ${info.index}, measured up to ${info.highestMeasuredFrameIndex}`);

          // Wait for more items to be rendered and measured, then retry
          const retryDelay = 500;
          setTimeout(() => {
            // Try scrollToIndex again first
            try {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false, // Use non-animated to be more reliable
                viewPosition: 0.5,
              });
              console.log(`✅ Retry scrollToIndex succeeded for index ${info.index}`);
            } catch (error) {
              // If still failing, use scrollToOffset as last resort
              console.log(`⚠️ ScrollToIndex retry failed, using scrollToOffset`);
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }
          }, retryDelay);
        }}
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
  bubbleFromMeSMS: {
    backgroundColor: '#34c759', // Green color for SMS messages
    borderBottomRightRadius: 4,
  },
  bubbleFromMeSMSDark: {
    backgroundColor: '#2d9d47', // Darker green for dark mode
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
  loadMoreContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    gap: 12,
  },
  loadMoreContainerDark: {
    backgroundColor: '#2c2c2e',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  loadMoreTextDark: {
    color: '#999',
  },
  contextWindowText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  contextWindowTextDark: {
    color: '#666',
  },
  loadMoreButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  loadMoreButtonDark: {
    backgroundColor: '#0a84ff',
  },
  loadMoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButtonTextDark: {
    color: '#fff',
  },
  endOfMessagesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  endOfMessagesContainerDark: {
    backgroundColor: '#2c2c2e',
  },
  endOfMessagesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  endOfMessagesTextDark: {
    color: '#666',
  },
  highlightedMessageContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)', // Light yellow highlight
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  highlightedBubble: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  highlightedBubbleDark: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
});