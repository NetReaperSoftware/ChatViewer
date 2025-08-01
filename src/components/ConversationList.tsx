import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { ProcessedChat, ProcessedMessage } from '../types/DatabaseTypes';

interface ConversationListProps {
  chats: ProcessedChat[];
  selectedChat: ProcessedChat | null;
  onChatSelected: (chat: ProcessedChat) => void;
  isDarkMode: boolean;
  searchResults: ProcessedMessage[];
  searchQuery: string;
  isSearching: boolean;
  onMessageSearch: (query: string) => void;
  onSearchResultSelected: (message: ProcessedMessage) => void;
  onToggleDarkMode: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  chats,
  selectedChat,
  onChatSelected,
  isDarkMode,
  searchResults,
  searchQuery,
  isSearching,
  onMessageSearch,
  onSearchResultSelected,
  onToggleDarkMode,
}) => {
  const [contactSearchText, setContactSearchText] = React.useState('');
  const [messageSearchText, setMessageSearchText] = React.useState('');

  const filteredChats = React.useMemo(() => {
    if (!contactSearchText.trim()) return chats;
    
    return chats.filter(chat =>
      chat.displayName.toLowerCase().includes(contactSearchText.toLowerCase()) ||
      chat.participants.some(participant =>
        participant.toLowerCase().includes(contactSearchText.toLowerCase())
      )
    );
  }, [chats, contactSearchText]);

  // Handle message search with debouncing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (messageSearchText.trim() !== searchQuery) {
        onMessageSearch(messageSearchText);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [messageSearchText, searchQuery, onMessageSearch]);

  const renderChatItem = ({ item }: { item: ProcessedChat }) => {
    const isSelected = selectedChat?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          isDarkMode && styles.chatItemDark,
          isSelected && styles.chatItemSelected,
          isSelected && isDarkMode && styles.chatItemSelectedDark,
        ]}
        onPress={() => onChatSelected(item)}
      >
        <View style={styles.chatHeader}>
          <Text
            style={[
              styles.chatName,
              isDarkMode && styles.chatNameDark,
              isSelected && styles.chatNameSelected,
            ]}
            numberOfLines={1}
          >
            {item.displayName}
          </Text>
          <Text
            style={[
              styles.messageCount,
              isDarkMode && styles.messageCountDark,
            ]}
          >
            {item.messageCount}
          </Text>
        </View>
        
        {item.isGroupChat && (
          <Text
            style={[
              styles.participants,
              isDarkMode && styles.participantsDark,
            ]}
            numberOfLines={1}
          >
            {item.participants.join(', ')}
          </Text>
        )}
        
        {item.lastMessage && (
          <View style={styles.lastMessageContainer}>
            <Text
              style={[
                styles.lastMessage,
                isDarkMode && styles.lastMessageDark,
              ]}
              numberOfLines={2}
            >
              {item.lastMessage.isFromMe ? 'You: ' : ''}
              {item.lastMessage.text}
            </Text>
            <Text
              style={[
                styles.timestamp,
                isDarkMode && styles.timestampDark,
              ]}
            >
              {formatTimestamp(item.lastMessage.timestamp)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSearchResultItem = ({ item }: { item: ProcessedMessage }) => {
    return (
      <TouchableOpacity
        style={[
          styles.searchResultItem,
          isDarkMode && styles.searchResultItemDark,
        ]}
        onPress={() => onSearchResultSelected(item)}
      >
        <Text
          style={[
            styles.searchResultText,
            isDarkMode && styles.searchResultTextDark,
          ]}
          numberOfLines={2}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.searchResultMeta,
            isDarkMode && styles.searchResultMetaDark,
          ]}
        >
          {item.handleName} • {formatTimestamp(item.timestamp)}
        </Text>
      </TouchableOpacity>
    );
  };

  const showSearchResults = messageSearchText.trim().length > 0;
  const displayData = showSearchResults ? searchResults : filteredChats;
  const renderItem = showSearchResults ? renderSearchResultItem : renderChatItem;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            Messages
          </Text>
          <View style={styles.darkModeToggle}>
            <Text style={[styles.toggleLabel, isDarkMode && styles.toggleLabelDark]}>
              {isDarkMode ? '🌙' : '☀️'}
            </Text>
            <Switch
              value={isDarkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: '#e0e0e0', true: '#007bff' }}
              thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="#e0e0e0"
            />
          </View>
        </View>
        <TextInput
          style={[
            styles.searchInput,
            isDarkMode && styles.searchInputDark,
          ]}
          placeholder="Search conversations..."
          placeholderTextColor={isDarkMode ? '#999' : '#666'}
          value={contactSearchText}
          onChangeText={setContactSearchText}
        />
        <TextInput
          style={[
            styles.searchInput,
            styles.messageSearchInput,
            isDarkMode && styles.searchInputDark,
          ]}
          placeholder="Search message content..."
          placeholderTextColor={isDarkMode ? '#999' : '#666'}
          value={messageSearchText}
          onChangeText={setMessageSearchText}
        />
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="small" 
              color={isDarkMode ? '#007bff' : '#007bff'} 
            />
            <Text style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
              Searching...
            </Text>
          </View>
        )}
      </View>
      
      <FlatList
        data={displayData}
        keyExtractor={(item) => showSearchResults ? `msg-${item.id}` : `chat-${item.id}`}
        renderItem={renderItem}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              isDarkMode && styles.separatorDark,
            ]}
          />
        )}
        ListEmptyComponent={() => (
          showSearchResults && !isSearching ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                {messageSearchText.trim() ? 'No messages found' : 'Start typing to search messages...'}
              </Text>
            </View>
          ) : null
        )}
      />
    </View>
  );
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 24 * 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  titleDark: {
    color: '#fff',
  },
  darkModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  toggleLabelDark: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  searchInputDark: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
  },
  messageSearchInput: {
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadingTextDark: {
    color: '#999',
  },
  searchResultItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  searchResultItemDark: {
    backgroundColor: '#2c2c2e',
    borderLeftColor: '#0066cc',
  },
  searchResultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  searchResultTextDark: {
    color: '#fff',
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#666',
  },
  searchResultMetaDark: {
    color: '#999',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#999',
  },
  list: {
    flex: 1,
  },
  chatItem: {
    padding: 16,
    backgroundColor: '#fff',
  },
  chatItemDark: {
    backgroundColor: '#2c2c2e',
  },
  chatItemSelected: {
    backgroundColor: '#007bff',
  },
  chatItemSelectedDark: {
    backgroundColor: '#0066cc',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  chatNameDark: {
    color: '#fff',
  },
  chatNameSelected: {
    color: '#fff',
  },
  messageCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  messageCountDark: {
    color: '#999',
    backgroundColor: '#1c1c1e',
  },
  participants: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  participantsDark: {
    color: '#999',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  lastMessageDark: {
    color: '#999',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  timestampDark: {
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 16,
  },
  separatorDark: {
    backgroundColor: '#38383a',
  },
});