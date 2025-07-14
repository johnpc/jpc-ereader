import React from 'react';
import type { Book } from '../../types/book';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const handleClick = () => {
    onClick(book);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(book);
    }
  };

  return (
    <div 
      className="book-card"
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`Open ${book.title} by ${book.author}`}
    >
      <div className="book-card__cover">
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={`Cover of ${book.title}`}
            className="book-card__cover-image"
            loading="lazy"
          />
        ) : (
          <div className="book-card__cover-placeholder">
            <div className="book-card__cover-icon">📖</div>
          </div>
        )}
      </div>
      
      <div className="book-card__content">
        <h3 className="book-card__title" title={book.title}>
          {book.title}
        </h3>
        
        <p className="book-card__author" title={book.author}>
          {book.author}
        </p>
        
        {book.description && (
          <p className="book-card__description" title={book.description}>
            {book.description}
          </p>
        )}
        
        {book.categories && book.categories.length > 0 && (
          <div className="book-card__categories">
            {book.categories.slice(0, 2).map((category, index) => (
              <span key={index} className="book-card__category">
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
