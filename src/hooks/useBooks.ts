import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BookLibrary } from '../types/book';
import { opdsService } from '../services/opdsService';
import { fuzzySearchBooks } from '../utils/fuzzySearch';
import { sortBooksByPriority, getBookSortingStats } from '../utils/bookSorting';

export const useBooks = () => {
  const [library, setLibrary] = useState<BookLibrary>({
    books: [],
    loading: false,
    error: null,
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Use useMemo to efficiently filter and sort books when search query or library changes
  const filteredBooks = useMemo(() => {
    console.log('🔍 useBooks: Filtering and sorting books with query:', searchQuery);
    console.log('🔍 useBooks: Total books to search:', library.books.length);
    
    let results;
    
    if (!searchQuery.trim()) {
      console.log('🔍 useBooks: No search query, using all books');
      results = library.books;
    } else {
      results = fuzzySearchBooks(library.books, searchQuery);
      console.log('🔍 useBooks: Fuzzy search returned', results.length, 'books');
    }
    
    // Apply sorting: recently read → most progress → alphabetical
    const sortedResults = sortBooksByPriority(results);
    console.log('📊 useBooks: Applied priority sorting to', sortedResults.length, 'books');
    
    // Log sorting statistics for debugging
    const stats = getBookSortingStats(sortedResults);
    console.log('📊 useBooks: Sorting stats:', {
      totalBooks: stats.totalBooks,
      withProgress: stats.withProgress,
      withLastRead: stats.withLastRead,
      mostRecentRead: stats.mostRecentRead,
      highestProgress: `${stats.highestProgress}%`
    });
    
    return sortedResults;
  }, [library.books, searchQuery]);

  const fetchBooks = useCallback(async () => {
    console.log('🚀 useBooks: Starting fetchBooks...');
    
    setLibrary(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }));
    
    try {
      console.log('📡 useBooks: Calling opdsService.fetchBooks()...');
      const books = await opdsService.fetchBooks();
      
      console.log('📚 useBooks: Received books from service:', books.length);
      console.log('📚 useBooks: Books data:', books.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        downloadUrl: book.downloadUrl,
        coverUrl: book.coverUrl
      })));

      setLibrary({
        books,
        loading: false,
        error: null,
      });
      
      console.log('✅ useBooks: Successfully updated library state with', books.length, 'books');
    } catch (error) {
      console.error('❌ useBooks: Error fetching books:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch books';
      
      setLibrary(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      console.log('❌ useBooks: Set error state:', errorMessage);
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    console.log('🔍 useBooks: handleSearch called with query:', query);
    console.log('🚫 useBooks: NO NETWORK CALLS - Using local fuzzy search only');
    setSearchQuery(query);
    // No need to call any async function - useMemo will handle the filtering
  }, []);

  const clearSearch = useCallback(() => {
    console.log('🧹 useBooks: Clearing search...');
    setSearchQuery('');
    console.log('🧹 useBooks: Search cleared');
  }, []);

  // Initial load
  useEffect(() => {
    console.log('🎬 useBooks: Component mounted, starting initial fetch...');
    fetchBooks();
  }, [fetchBooks]);

  // Log state changes
  useEffect(() => {
    console.log('📊 useBooks: State updated:', {
      libraryBooksCount: library.books.length,
      filteredBooksCount: filteredBooks.length,
      loading: library.loading,
      error: library.error,
      searchQuery: searchQuery,
      isSearching: !!searchQuery
    });
  }, [library, filteredBooks, searchQuery]);

  return {
    library,
    filteredBooks,
    searchQuery,
    handleSearch,
    clearSearch,
    isSearching: !!searchQuery,
  };
};
