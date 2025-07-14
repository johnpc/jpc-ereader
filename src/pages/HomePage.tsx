import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation/Navigation';
import { BookGrid } from '../components/BookGrid/BookGrid';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { useBooks } from '../hooks/useBooks';
import type { Book } from '../types/book';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    library,
    filteredBooks,
    searchQuery,
    handleSearch,
    clearSearch,
    isSearching,
  } = useBooks();

  const handleBookClick = (book: Book) => {
    // Navigate to reader with book ID
    navigate(`/read/${encodeURIComponent(book.id)}`);
  };

  return (
    <>
      <Navigation
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onSearchClear={clearSearch}
        isSearching={isSearching}
        totalBooks={library.books.length}
      />

      <main className="main">
        <BookGrid
          books={filteredBooks}
          loading={library.loading}
          error={library.error}
          onBookClick={handleBookClick}
          emptyMessage={
            searchQuery
              ? `No books found matching "${searchQuery}"`
              : 'No books available'
          }
        />
      </main>

      <PWAInstallPrompt />
    </>
  );
};
