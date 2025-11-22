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

export interface DateFilter {
  type: 'all' | 'month' | 'day';
  year?: number;
  month?: number; // 0-11
  day?: number;
}

export interface BlacklistFilter {
  numbers: string[]; // Array of normalized phone numbers to exclude
}

interface ConversationListProps {
  chats: ProcessedChat[];
  selectedChat: ProcessedChat | null;
  onChatSelected: (chat: ProcessedChat) => void;
  isDarkMode: boolean;
  searchResults: ProcessedMessage[];
  searchQuery: string;
  isSearching: boolean;
  onMessageSearch: (query: string, dateFilter?: DateFilter | null, phoneFilter?: string, blacklist?: BlacklistFilter) => void;
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
  const [dateFilter, setDateFilter] = React.useState<DateFilter>({ type: 'all' });
  const [blacklistText, setBlacklistText] = React.useState('');
  const [showBlacklist, setShowBlacklist] = React.useState(false);

  // Helper function to normalize phone numbers (remove all non-digits)
  const normalizePhoneNumber = (input: string): string => {
    return input.replace(/\D/g, ''); // Remove all non-digit characters
  };

  // Parse blacklist numbers
  const blacklist: BlacklistFilter = React.useMemo(() => ({
    numbers: blacklistText
      .split(/[,\n]/)
      .map(num => normalizePhoneNumber(num.trim()))
      .filter(num => num.length > 0)
  }), [blacklistText]);

  const filteredChats = React.useMemo(() => {
    if (!contactSearchText.trim()) return chats;

    const searchLower = contactSearchText.toLowerCase();
    const searchDigits = normalizePhoneNumber(contactSearchText);
    const isPhoneSearch = searchDigits.length >= 3; // At least 3 digits indicates phone search

    return chats.filter(chat => {
      // Search by display name
      if (chat.displayName.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Phone number search
      if (isPhoneSearch) {
        // Search in chat identifier (e.g., "+18633972188")
        const chatIdentifier = chat.guid || '';
        const chatDigits = normalizePhoneNumber(chatIdentifier);
        if (chatDigits.includes(searchDigits)) {
          return true;
        }

        // Search in participants phone numbers
        const matchesParticipant = chat.participants.some(participant => {
          const participantDigits = normalizePhoneNumber(participant);
          return participantDigits.includes(searchDigits);
        });
        if (matchesParticipant) {
          return true;
        }
      }

      // Text search in participants (for non-phone searches)
      return chat.participants.some(participant =>
        participant.toLowerCase().includes(searchLower)
      );
    });
  }, [chats, contactSearchText]);

  // Trigger search manually
  const handleSearch = () => {
    if (messageSearchText.trim()) {
      const filter = dateFilter.type === 'all' ? null : dateFilter;
      const phoneFilter = contactSearchText.trim() ? normalizePhoneNumber(contactSearchText) : undefined;

      console.log('🔍 ConversationList: Triggering search with:', {
        messageSearchText,
        contactSearchText,
        phoneFilter,
        hasDateFilter: filter !== null,
        blacklistCount: blacklist.numbers.length,
        blacklistNumbers: blacklist.numbers
      });
      onMessageSearch(messageSearchText, filter, phoneFilter, blacklist);
    } else {
      // Clear search results if search text is cleared
      onMessageSearch('', null, undefined, { numbers: [] });
    }
  };

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
        <View style={styles.messageSearchRow}>
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
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchButton, isDarkMode && styles.searchButtonDark]}
            onPress={handleSearch}
          >
            <Text style={[styles.searchButtonText, isDarkMode && styles.searchButtonTextDark]}>
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Controls */}
        <View style={[styles.dateFilterRow, isDarkMode && styles.dateFilterRowDark]}>
          <TouchableOpacity
            style={[styles.filterButton, isDarkMode && styles.filterButtonDark, dateFilter.type === 'all' && styles.filterButtonActive]}
            onPress={() => setDateFilter({ type: 'all' })}
          >
            <Text style={[styles.filterButtonText, isDarkMode && styles.filterButtonTextDark, dateFilter.type === 'all' && styles.filterButtonTextActive]}>
              All time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, isDarkMode && styles.filterButtonDark, dateFilter.type === 'month' && styles.filterButtonActive]}
            onPress={() => setDateFilter({ type: 'month', month: new Date().getMonth(), year: new Date().getFullYear() })}
          >
            <Text style={[styles.filterButtonText, isDarkMode && styles.filterButtonTextDark, dateFilter.type === 'month' && styles.filterButtonTextActive]}>
              {dateFilter.type === 'month' ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateFilter.month ?? 0]} ${dateFilter.year}` : 'Month'}
            </Text>
          </TouchableOpacity>

          {dateFilter.type === 'month' && (
            <View style={styles.monthYearSelector}>
              <TouchableOpacity
                style={[styles.arrowButton, isDarkMode && styles.arrowButtonDark]}
                onPress={() => {
                  const currentMonth = dateFilter.month ?? 0;
                  const currentYear = dateFilter.year ?? new Date().getFullYear();
                  const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                  const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                  setDateFilter({ ...dateFilter, month: newMonth, year: newYear });
                }}
              >
                <Text style={styles.arrowText}>◀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.arrowButton, isDarkMode && styles.arrowButtonDark]}
                onPress={() => {
                  const currentMonth = dateFilter.month ?? 0;
                  const currentYear = dateFilter.year ?? new Date().getFullYear();
                  const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
                  const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
                  setDateFilter({ ...dateFilter, month: newMonth, year: newYear });
                }}
              >
                <Text style={styles.arrowText}>▶</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Blacklist Toggle and Input */}
        <View style={[styles.blacklistContainer, isDarkMode && styles.blacklistContainerDark]}>
          <TouchableOpacity
            style={[styles.blacklistButton, isDarkMode && styles.blacklistButtonDark, showBlacklist && styles.blacklistButtonActive]}
            onPress={() => setShowBlacklist(!showBlacklist)}
          >
            <Text style={[styles.blacklistButtonText, isDarkMode && styles.blacklistButtonTextDark]}>
              {showBlacklist ? '▼' : '▶'} Blacklist {blacklistText.trim() ? `(${blacklist.numbers.length})` : ''}
            </Text>
          </TouchableOpacity>

          {showBlacklist && (
            <TextInput
              style={[styles.blacklistInput, isDarkMode && styles.blacklistInputDark]}
              placeholder="Enter phone numbers to exclude (comma or newline separated)..."
              placeholderTextColor={isDarkMode ? '#999' : '#666'}
              value={blacklistText}
              onChangeText={setBlacklistText}
              multiline
            />
          )}
        </View>

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
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  messageSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  searchButton: {
    height: 40,
    paddingHorizontal: 20,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDark: {
    backgroundColor: '#0a84ff',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchButtonTextDark: {
    color: '#fff',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  dateFilterRowDark: {
    backgroundColor: 'transparent',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  filterButtonTextDark: {
    color: '#fff',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  monthYearSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  arrowButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  arrowText: {
    fontSize: 14,
    color: '#333',
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
  blacklistContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  blacklistContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  blacklistButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  blacklistButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  blacklistButtonActive: {
    backgroundColor: '#007bff',
  },
  blacklistButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  blacklistButtonTextDark: {
    color: '#fff',
  },
  blacklistInput: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 13,
    minHeight: 60,
    maxHeight: 120,
    color: '#333',
  },
  blacklistInputDark: {
    backgroundColor: '#2c2c2e',
    borderColor: '#38383a',
    color: '#fff',
  },
});