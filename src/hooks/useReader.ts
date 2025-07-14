import { useState, useEffect, useCallback } from 'react';
import type { ReaderState, ReaderSettings, Bookmark } from '../types/reader';
import type { Book } from '../types/book';
import { epubService } from '../services/epubService';
import { storageService } from '../services/storageService';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  theme: 'dark',
  fontFamily: 'serif',
  lineHeight: 1.6,
  margin: 20,
};

export const useReader = () => {
  const [readerState, setReaderState] = useState<ReaderState>({
    currentBook: null,
    isReaderOpen: false,
    settings: DEFAULT_SETTINGS,
    progress: {},
    bookmarks: [],
    tableOfContents: [],
  });

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      console.log('📚 useReader: Loading saved data from localStorage...');
      
      // Load global settings (now always returns settings, with dark mode as default)
      const settings = storageService.getGlobalSettings();
      
      console.log('⚙️ useReader: Loaded settings:', settings);
      
      setReaderState(prev => ({
        ...prev,
        settings
      }));
    } catch (error) {
      console.error('❌ useReader: Error loading reader data from localStorage:', error);
    }
  }, []);

  // Open book in reader
  const openBook = useCallback(async (book: Book) => {
    try {
      console.log('📖 useReader: Starting to open book:', book.title);
      
      // Add to reading history
      storageService.addToReadingHistory(book.id, book.title, book.author);
      
      // Load the book
      await epubService.loadBook(book);
      console.log('📖 useReader: Book loaded successfully, getting TOC...');
      
      const toc = await epubService.getTableOfContents(book.id);
      console.log('📖 useReader: TOC retrieved, length:', toc.length);
      
      // Get book-specific settings or use global settings
      const bookSettings = storageService.getBookSettings(book.id);
      const settingsToUse = bookSettings || readerState.settings;
      
      console.log('📖 useReader: Using settings for book:', settingsToUse);
      
      console.log('📖 useReader: Setting reader state...');
      setReaderState(prev => {
        const newState = {
          ...prev,
          currentBook: book.id,
          isReaderOpen: true,
          tableOfContents: toc,
          settings: settingsToUse
        };
        console.log('📖 useReader: New reader state:', newState);
        return newState;
      });
      
      console.log('📖 useReader: Book opened successfully!');
    } catch (error) {
      console.error('❌ useReader: Error opening book:', error);
      throw error;
    }
  }, [readerState.settings]);

  // Close reader
  const closeReader = useCallback(() => {
    console.log('📖 useReader: Closing reader');
    setReaderState(prev => ({
      ...prev,
      currentBook: null,
      isReaderOpen: false,
      tableOfContents: [],
    }));
  }, []);

  // Update reader settings
  const updateSettings = useCallback((newSettings: Partial<ReaderSettings>) => {
    const updatedSettings = { ...readerState.settings, ...newSettings };
    
    console.log('⚙️ useReader: Updating settings:', newSettings);
    
    // Save as global settings
    storageService.saveGlobalSettings(updatedSettings);
    
    // If we have a current book, also save book-specific settings
    if (readerState.currentBook) {
      storageService.saveBookSettings(readerState.currentBook, updatedSettings);
    }
    
    setReaderState(prev => ({ ...prev, settings: updatedSettings }));
  }, [readerState.settings, readerState.currentBook]);

  // Update reading progress
  const updateProgress = useCallback((location: string, progress: number) => {
    if (!readerState.currentBook) return;
    
    console.log('📊 useReader: Updating progress:', Math.round(progress * 100) + '%');
    
    // Save progress to storage service
    storageService.saveBookProgress(readerState.currentBook, location, progress);
    
    // Update local state for immediate UI feedback
    setReaderState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        [readerState.currentBook!]: {
          bookId: readerState.currentBook!,
          currentLocation: location,
          progress,
          lastRead: new Date(),
        }
      }
    }));
  }, [readerState.currentBook]);

  // Get saved progress for a book
  const getBookProgress = useCallback((bookId: string) => {
    return storageService.getBookProgress(bookId);
  }, []);

  // Get current book progress
  const getCurrentBookProgress = useCallback(() => {
    if (!readerState.currentBook) return null;
    return storageService.getBookProgress(readerState.currentBook);
  }, [readerState.currentBook]);

  // Add bookmark (keeping existing functionality)
  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    
    const updatedBookmarks = [...readerState.bookmarks, newBookmark];
    setReaderState(prev => ({ ...prev, bookmarks: updatedBookmarks }));
    
    // TODO: Integrate bookmarks with storage service in future update
    console.log('🔖 useReader: Added bookmark:', newBookmark);
  }, [readerState.bookmarks]);

  // Remove bookmark (keeping existing functionality)
  const removeBookmark = useCallback((bookmarkId: string) => {
    const updatedBookmarks = readerState.bookmarks.filter(b => b.id !== bookmarkId);
    setReaderState(prev => ({ ...prev, bookmarks: updatedBookmarks }));
    
    console.log('🗑️ useReader: Removed bookmark:', bookmarkId);
  }, [readerState.bookmarks]);

  // Get bookmarks for current book
  const getCurrentBookBookmarks = useCallback(() => {
    if (!readerState.currentBook) return [];
    return readerState.bookmarks.filter(b => b.bookId === readerState.currentBook);
  }, [readerState.currentBook, readerState.bookmarks]);

  // Get reading history
  const getReadingHistory = useCallback(() => {
    return storageService.getReadingHistory();
  }, []);

  // Clear progress for a book
  const clearBookProgress = useCallback((bookId: string) => {
    storageService.removeBookProgress(bookId);
    console.log('🧹 useReader: Cleared progress for book:', bookId);
  }, []);

  return {
    readerState,
    openBook,
    closeReader,
    updateSettings,
    updateProgress,
    getBookProgress,
    getCurrentBookProgress,
    addBookmark,
    removeBookmark,
    getCurrentBookBookmarks,
    getReadingHistory,
    clearBookProgress,
  };
};
