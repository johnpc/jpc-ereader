import { useState, useEffect, useCallback } from 'react';
import type { Book, BookLibrary } from '../types/book';
import { opdsService } from '../services/opdsService';

export const useBooks = () => {
  const [library, setLibrary] = useState<BookLibrary>({
    books: [],
    loading: false,
    error: null,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

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
      
      setFilteredBooks(books);
      
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

  const searchBooks = useCallback(async (query: string) => {
    console.log('🔍 useBooks: Starting searchBooks with query:', query);
    
    if (!query.trim()) {
      console.log('🔍 useBooks: Empty query, showing all books');
      setFilteredBooks(library.books);
      return;
    }

    setLibrary(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('📡 useBooks: Calling opdsService.searchBooks()...');
      const results = await opdsService.searchBooks(query);
      
      console.log('🔍 useBooks: Search returned', results.length, 'books');
      setFilteredBooks(results);
      
      console.log('✅ useBooks: Successfully updated filtered books');
    } catch (error) {
      console.error('❌ useBooks: Error searching books, falling back to local filtering:', error);
      
      // Fallback to local filtering
      const localResults = library.books.filter(book =>
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log('🔍 useBooks: Local filtering returned', localResults.length, 'books');
      setFilteredBooks(localResults);
    } finally {
      setLibrary(prev => ({ ...prev, loading: false }));
    }
  }, [library.books]);

  const handleSearch = useCallback((query: string) => {
    console.log('🔍 useBooks: handleSearch called with query:', query);
    setSearchQuery(query);
    searchBooks(query);
  }, [searchBooks]);

  const clearSearch = useCallback(() => {
    console.log('🧹 useBooks: Clearing search...');
    setSearchQuery('');
    setFilteredBooks(library.books);
    console.log('🧹 useBooks: Search cleared, showing', library.books.length, 'books');
  }, [library.books]);

  const refreshBooks = useCallback(() => {
    console.log('🔄 useBooks: Refreshing books...');
    fetchBooks();
  }, [fetchBooks]);

  // Initial load
  useEffect(() => {
    console.log('🎬 useBooks: Component mounted, starting initial fetch...');
    fetchBooks();
  }, [fetchBooks]);

  // Update filtered books when library changes
  useEffect(() => {
    if (!searchQuery) {
      console.log('📊 useBooks: Library changed, updating filtered books (no search query)');
      setFilteredBooks(library.books);
    }
  }, [library.books, searchQuery]);

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
    refreshBooks,
    isSearching: !!searchQuery,
  };
};
