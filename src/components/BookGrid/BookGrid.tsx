import React from 'react';
import type { Book } from '../../types/book';
import { BookCard } from '../BookCard/BookCard';
import './BookGrid.css';

interface BookGridProps {
  books: Book[];
  loading: boolean;
  error: string | null;
  onBookClick: (book: Book) => void;
  emptyMessage?: string;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  loading,
  error,
  onBookClick,
  emptyMessage = 'No books found'
}) => {
  if (loading) {
    return (
      <div className="book-grid__loading">
        <div className="book-grid__spinner"></div>
        <p>Loading books...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-grid__error">
        <div className="book-grid__error-icon">⚠️</div>
        <h3>Error Loading Books</h3>
        <p>{error}</p>
        <button 
          className="book-grid__retry-button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="book-grid__empty">
        <div className="book-grid__empty-icon">📚</div>
        <h3>No Books Available</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="book-grid">
      <div className="book-grid__container">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onClick={onBookClick}
          />
        ))}
      </div>
    </div>
  );
};
