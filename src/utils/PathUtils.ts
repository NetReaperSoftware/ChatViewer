// Utility functions for handling file paths in React Native macOS
import { Platform } from 'react-native';

export const expandPath = (path: string): string => {
  if (path.startsWith('~/')) {
    // Get the actual home directory
    const homeDir = getHomeDirectory();
    return path.replace('~', homeDir);
  }
  return path;
};

export const getHomeDirectory = (): string => {
  if (Platform.OS === 'macos') {
    // For macOS, we can use a more reliable method
    // This is a fallback - in production you'd want to use native modules
    return '/Users/daniel'; // Hardcoded for now, but could be improved
  }
  return '/Users/daniel';
};

export const getDefaultMessagesPath = (): string => {
  const homeDir = getHomeDirectory();
  return `${homeDir}/Library/Messages/chat.db`;
};

export const fileExists = async (path: string): Promise<boolean> => {
  // In React Native, we can't directly check file existence
  // This would typically require a native module or library
  // For now, we'll return true and let SQLite handle the error
  return true;
};