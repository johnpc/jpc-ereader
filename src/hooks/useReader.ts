import { useState, useEffect, useCallback } from 'react';
import type { ReaderState, ReaderSettings, BookProgress, Bookmark } from '../types/reader';
import type { Book } from '../types/book';
import { epubService } from '../services/epubService';

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  theme: 'light',
  fontFamily: 'serif',
  lineHeight: 1.6,
  margin: 20,
};

const STORAGE_KEYS = {
  SETTINGS: 'ereader-settings',
  PROGRESS: 'ereader-progress',
  BOOKMARKS: 'ereader-bookmarks',
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

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const savedBookmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);

      setReaderState(prev => ({
        ...prev,
        settings: savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS,
        progress: savedProgress ? JSON.parse(savedProgress) : {},
        bookmarks: savedBookmarks ? JSON.parse(savedBookmarks) : [],
      }));
    } catch (error) {
      console.error('Error loading reader data from localStorage:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: ReaderSettings) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      setReaderState(prev => ({ ...prev, settings }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((bookId: string, progress: Omit<BookProgress, 'bookId'>) => {
    try {
      const newProgress = {
        ...readerState.progress,
        [bookId]: { ...progress, bookId },
      };
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(newProgress));
      setReaderState(prev => ({ ...prev, progress: newProgress }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [readerState.progress]);

  // Save bookmarks to localStorage
  const saveBookmarks = useCallback((bookmarks: Bookmark[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      setReaderState(prev => ({ ...prev, bookmarks }));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }, []);

  // Open book in reader
  const openBook = useCallback(async (book: Book) => {
    try {
      console.log('📖 useReader: Starting to open book:', book.title);
      
      await epubService.loadBook(book);
      console.log('📖 useReader: Book loaded successfully, getting TOC...');
      
      const toc = await epubService.getTableOfContents(book.id);
      console.log('📖 useReader: TOC retrieved, length:', toc.length);
      
      console.log('📖 useReader: Setting reader state...');
      setReaderState(prev => {
        const newState = {
          ...prev,
          currentBook: book.id,
          isReaderOpen: true,
          tableOfContents: toc,
        };
        console.log('📖 useReader: New reader state:', newState);
        return newState;
      });
      
      console.log('📖 useReader: Book opened successfully!');
    } catch (error) {
      console.error('❌ useReader: Error opening book:', error);
      throw error;
    }
  }, []);

  // Close reader
  const closeReader = useCallback(() => {
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
    saveSettings(updatedSettings);
  }, [readerState.settings, saveSettings]);

  // Add bookmark
  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    
    const updatedBookmarks = [...readerState.bookmarks, newBookmark];
    saveBookmarks(updatedBookmarks);
  }, [readerState.bookmarks, saveBookmarks]);

  // Remove bookmark
  const removeBookmark = useCallback((bookmarkId: string) => {
    const updatedBookmarks = readerState.bookmarks.filter(b => b.id !== bookmarkId);
    saveBookmarks(updatedBookmarks);
  }, [readerState.bookmarks, saveBookmarks]);

  // Get bookmarks for current book
  const getCurrentBookBookmarks = useCallback(() => {
    if (!readerState.currentBook) return [];
    return readerState.bookmarks.filter(b => b.bookId === readerState.currentBook);
  }, [readerState.currentBook, readerState.bookmarks]);

  // Get progress for current book
  const getCurrentBookProgress = useCallback(() => {
    if (!readerState.currentBook) return null;
    return readerState.progress[readerState.currentBook] || null;
  }, [readerState.currentBook, readerState.progress]);

  // Update reading progress
  const updateProgress = useCallback((location: string, progress: number) => {
    if (!readerState.currentBook) return;
    
    saveProgress(readerState.currentBook, {
      currentLocation: location,
      progress,
      lastRead: new Date(),
    });
  }, [readerState.currentBook, saveProgress]);

  return {
    readerState,
    openBook,
    closeReader,
    updateSettings,
    addBookmark,
    removeBookmark,
    getCurrentBookBookmarks,
    getCurrentBookProgress,
    updateProgress,
  };
};
