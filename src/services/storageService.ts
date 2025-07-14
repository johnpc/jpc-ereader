import type { ReaderSettings } from '../types/reader';

export interface BookProgress {
  bookId: string;
  location: string; // CFI (Canonical Fragment Identifier)
  progress: number; // Percentage (0-1)
  lastRead: string; // ISO timestamp
  currentPage?: number;
  totalPages?: number;
  chapterTitle?: string;
}

export interface BookSettings {
  bookId: string;
  settings: ReaderSettings;
  lastUpdated: string; // ISO timestamp
}

export interface GlobalSettings {
  defaultSettings: ReaderSettings;
  lastUpdated: string;
}

const STORAGE_KEYS = {
  BOOK_PROGRESS: 'jpc-ereader-progress',
  BOOK_SETTINGS: 'jpc-ereader-book-settings',
  GLOBAL_SETTINGS: 'jpc-ereader-global-settings',
  READING_HISTORY: 'jpc-ereader-history'
} as const;

// Default settings with dark mode as default
const DEFAULT_READER_SETTINGS = {
  fontSize: 16,
  theme: 'dark' as const,
  fontFamily: 'serif' as const,
  lineHeight: 1.6,
  margin: 20,
};

export class StorageService {
  // Book Progress Management
  saveBookProgress(bookId: string, location: string, progress: number, additionalData?: Partial<BookProgress>): void {
    try {
      const progressData = this.getAllBookProgress();
      
      const bookProgress: BookProgress = {
        bookId,
        location,
        progress,
        lastRead: new Date().toISOString(),
        ...additionalData
      };

      progressData[bookId] = bookProgress;
      
      localStorage.setItem(STORAGE_KEYS.BOOK_PROGRESS, JSON.stringify(progressData));
      
      console.log('📚 StorageService: Saved progress for book:', bookId, `${Math.round(progress * 100)}%`);
    } catch (error) {
      console.error('❌ StorageService: Error saving book progress:', error);
    }
  }

  getBookProgress(bookId: string): BookProgress | null {
    try {
      const progressData = this.getAllBookProgress();
      const progress = progressData[bookId] || null;
      
      if (progress) {
        console.log('📖 StorageService: Retrieved progress for book:', bookId, `${Math.round(progress.progress * 100)}%`);
      }
      
      return progress;
    } catch (error) {
      console.error('❌ StorageService: Error getting book progress:', error);
      return null;
    }
  }

  getAllBookProgress(): Record<string, BookProgress> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BOOK_PROGRESS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ StorageService: Error parsing book progress data:', error);
      return {};
    }
  }

  removeBookProgress(bookId: string): void {
    try {
      const progressData = this.getAllBookProgress();
      delete progressData[bookId];
      localStorage.setItem(STORAGE_KEYS.BOOK_PROGRESS, JSON.stringify(progressData));
      console.log('🗑️ StorageService: Removed progress for book:', bookId);
    } catch (error) {
      console.error('❌ StorageService: Error removing book progress:', error);
    }
  }

  // Book-Specific Settings Management
  saveBookSettings(bookId: string, settings: ReaderSettings): void {
    try {
      const bookSettingsData = this.getAllBookSettings();
      
      const bookSettings: BookSettings = {
        bookId,
        settings,
        lastUpdated: new Date().toISOString()
      };

      bookSettingsData[bookId] = bookSettings;
      
      localStorage.setItem(STORAGE_KEYS.BOOK_SETTINGS, JSON.stringify(bookSettingsData));
      
      console.log('⚙️ StorageService: Saved settings for book:', bookId);
    } catch (error) {
      console.error('❌ StorageService: Error saving book settings:', error);
    }
  }

  getBookSettings(bookId: string): ReaderSettings | null {
    try {
      const bookSettingsData = this.getAllBookSettings();
      const bookSettings = bookSettingsData[bookId];
      
      if (bookSettings) {
        console.log('⚙️ StorageService: Retrieved settings for book:', bookId);
        return bookSettings.settings;
      }
      
      return null;
    } catch (error) {
      console.error('❌ StorageService: Error getting book settings:', error);
      return null;
    }
  }

  getAllBookSettings(): Record<string, BookSettings> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BOOK_SETTINGS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ StorageService: Error parsing book settings data:', error);
      return {};
    }
  }

  // Global Settings Management
  saveGlobalSettings(settings: ReaderSettings): void {
    try {
      const globalSettings: GlobalSettings = {
        defaultSettings: settings,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(globalSettings));
      console.log('🌐 StorageService: Saved global settings');
    } catch (error) {
      console.error('❌ StorageService: Error saving global settings:', error);
    }
  }

  getGlobalSettings(): ReaderSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
      if (stored) {
        const globalSettings: GlobalSettings = JSON.parse(stored);
        console.log('🌐 StorageService: Retrieved global settings');
        return globalSettings.defaultSettings;
      }
      console.log('🌐 StorageService: No saved settings, using defaults with dark mode');
      return DEFAULT_READER_SETTINGS;
    } catch (error) {
      console.error('❌ StorageService: Error getting global settings:', error);
      return DEFAULT_READER_SETTINGS;
    }
  }

  getDefaultSettings(): ReaderSettings {
    return { ...DEFAULT_READER_SETTINGS };
  }

  // Reading History Management
  addToReadingHistory(bookId: string, bookTitle: string, bookAuthor: string): void {
    try {
      const history = this.getReadingHistory();
      
      // Remove existing entry if present
      const filteredHistory = history.filter(item => item.bookId !== bookId);
      
      // Add to beginning of array
      const newEntry = {
        bookId,
        bookTitle,
        bookAuthor,
        lastRead: new Date().toISOString()
      };
      
      filteredHistory.unshift(newEntry);
      
      // Keep only last 50 books
      const trimmedHistory = filteredHistory.slice(0, 50);
      
      localStorage.setItem(STORAGE_KEYS.READING_HISTORY, JSON.stringify(trimmedHistory));
      console.log('📚 StorageService: Added to reading history:', bookTitle);
    } catch (error) {
      console.error('❌ StorageService: Error adding to reading history:', error);
    }
  }

  getReadingHistory(): Array<{bookId: string, bookTitle: string, bookAuthor: string, lastRead: string}> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.READING_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ StorageService: Error getting reading history:', error);
      return [];
    }
  }

  // Utility Methods
  getStorageUsage(): {used: number, available: number, percentage: number} {
    try {
      let totalSize = 0;
      
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      // Rough estimate of localStorage limit (usually 5-10MB)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      
      return {
        used: totalSize,
        available: estimatedLimit - totalSize,
        percentage: (totalSize / estimatedLimit) * 100
      };
    } catch (error) {
      console.error('❌ StorageService: Error calculating storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  clearAllData(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🧹 StorageService: Cleared all app data');
    } catch (error) {
      console.error('❌ StorageService: Error clearing data:', error);
    }
  }

  exportData(): string {
    try {
      const data = {
        progress: this.getAllBookProgress(),
        bookSettings: this.getAllBookSettings(),
        globalSettings: this.getGlobalSettings(),
        history: this.getReadingHistory(),
        exportDate: new Date().toISOString()
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('❌ StorageService: Error exporting data:', error);
      return '{}';
    }
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.progress) {
        localStorage.setItem(STORAGE_KEYS.BOOK_PROGRESS, JSON.stringify(data.progress));
      }
      
      if (data.bookSettings) {
        localStorage.setItem(STORAGE_KEYS.BOOK_SETTINGS, JSON.stringify(data.bookSettings));
      }
      
      if (data.globalSettings) {
        localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify({
          defaultSettings: data.globalSettings,
          lastUpdated: new Date().toISOString()
        }));
      }
      
      if (data.history) {
        localStorage.setItem(STORAGE_KEYS.READING_HISTORY, JSON.stringify(data.history));
      }
      
      console.log('📥 StorageService: Successfully imported data');
      return true;
    } catch (error) {
      console.error('❌ StorageService: Error importing data:', error);
      return false;
    }
  }
}

export const storageService = new StorageService();
