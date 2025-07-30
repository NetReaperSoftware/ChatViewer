import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { ProcessedChat } from '../types/DatabaseTypes';

interface ConversationListProps {
  chats: ProcessedChat[];
  selectedChat: ProcessedChat | null;
  onChatSelected: (chat: ProcessedChat) => void;
  isDarkMode: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  chats,
  selectedChat,
  onChatSelected,
  isDarkMode,
}) => {
  const [searchText, setSearchText] = React.useState('');

  const filteredChats = React.useMemo(() => {
    if (!searchText.trim()) return chats;
    
    return chats.filter(chat =>
      chat.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
      chat.participants.some(participant =>
        participant.toLowerCase().includes(searchText.toLowerCase())
      )
    );
  }, [chats, searchText]);

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

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Messages
        </Text>
        <TextInput
          style={[
            styles.searchInput,
            isDarkMode && styles.searchInputDark,
          ]}
          placeholder="Search conversations..."
          placeholderTextColor={isDarkMode ? '#999' : '#666'}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  titleDark: {
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